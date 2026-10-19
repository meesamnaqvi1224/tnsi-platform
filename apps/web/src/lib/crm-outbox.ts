import { and, eq, inArray, lt, lte, or, sql } from 'drizzle-orm';
import { crmOutbox, db, type CrmOutboxRow, type DB } from '@tnsi/db';
import {
  FLOWI_FIELD,
  FlowiRequestError,
  addFlowiContactTags,
  classifyFlowiFailure,
  upsertFlowiContact,
  type FlowiCallOptions,
  type FlowiFailureKind,
  type FlowiUpsertContactInput,
} from '@tnsi/integrations';

/**
 * CRM outbox: every website form is written to `crm_outbox` (in the same
 * transaction as the visitor's own record where there is one), then sent to
 * Flowi with retries. See packages/db/src/schema/crm-outbox.ts. Flowi is a
 * mirror for the team; nothing here affects anyone's access, and no CRM change
 * flows back.
 */

export type CrmEventKind = 'contact_form' | 'newsletter' | 'assessment';

type Executor = Pick<DB, 'insert'>;

/** Engineering defaults, kept together. Not member-facing policy. */
export const OUTBOX = {
  /** Gives up after this many attempts (temporary failures) and leaves the row `failed` for a person to look at. */
  maxAttempts: 10,
  /**
   * Configuration/permission failures (bad key, missing permission, not found) are
   * fixed by changing configuration, not by waiting, so they are retried only a few
   * times and then left visible as `failed`.
   */
  maxConfigAttempts: 5,
  /**
   * The worker stops starting new rows after this long. A row can take up to two
   * Flowi calls (upsert, then tags) of 8 s each, so 40 s + 16 s stays inside the
   * route's 60 s limit.
   */
  budgetMs: 40 * 1000,
  /** A claim by a worker lasts this long; a crashed worker's rows become claimable again after it. */
  claimMs: 2 * 60 * 1000,
  /** Delay before retry n is 2^n minutes, capped. */
  baseDelayMs: 60 * 1000,
  maxDelayMs: 6 * 60 * 60 * 1000,
  /** Rows sent this long ago are deleted: the CRM holds the data, we do not keep it longer than needed. */
  sentRetentionMs: 30 * 24 * 60 * 60 * 1000,
  /**
   * The most time the IMMEDIATE attempt (made inside the visitor's own request) may
   * spend on Flowi, across both calls. The submission is already stored by then, so
   * a slow Flowi only means delivery is left to the worker.
   */
  immediateBudgetMs: 3 * 1000,
  /** Most rows one worker run processes. */
  batchSize: 20,
} as const;

/** Delay before the next attempt, after `attempts` attempts have already failed. */
export function retryDelayMs(attempts: number): number {
  const n = Math.max(1, attempts);
  return Math.min(OUTBOX.baseDelayMs * 2 ** n, OUTBOX.maxDelayMs);
}

/**
 * What goes to Flowi for each kind of event. Pure, and the one place that decides
 * it. `tags` are ADDED after the contact is upserted (never sent with the upsert,
 * which would replace the contact's existing tags).
 */
export type OutboxPayload = Omit<FlowiUpsertContactInput, 'email'> & { tags: string[] };

export function contactFormPayload(input: {
  name: string;
  organisation?: string | null;
  subject?: string | null;
  message?: string | null;
}): OutboxPayload {
  const [firstName, ...rest] = input.name.trim().split(/\s+/);
  const lastName = rest.join(' ') || undefined;
  return {
    source: 'TNSI website — contact form',
    tags: ['TNSI Website Contact Form'],
    firstName,
    lastName,
    customFields: [
      { id: FLOWI_FIELD.contactMessage.id, value: input.message ?? '' },
      { id: FLOWI_FIELD.contactSubject.id, value: input.subject ?? '' },
      { id: FLOWI_FIELD.contactOrganisation.id, value: input.organisation ?? '' },
    ],
  };
}

export function newsletterPayload(): OutboxPayload {
  // The marketing-consent field is deliberately NOT set: what the signup form tells
  // people, and whether a signup counts as consent, is an open owner decision.
  return { source: 'TNSI website — newsletter', tags: ['TNSI Website Newsletter'] };
}

export function assessmentPayload(input: {
  assessmentTitle: string;
  crmPipeline?: string | null;
  resultTier: string | null;
}): OutboxPayload {
  return {
    source: `TNSI website — ${input.assessmentTitle} assessment`,
    tags: ['TNSI Website Assessment', ...(input.crmPipeline ? [input.crmPipeline] : [])],
    // The result tier's name only: never the answers and never the score.
    customFields: input.resultTier
      ? [{ id: FLOWI_FIELD.assessmentResult.id, value: input.resultTier }]
      : [],
  };
}

/** Writes the event. Pass the surrounding transaction to make it atomic with the visitor's own record. */
export async function enqueueCrmEvent(
  executor: Executor,
  event: { kind: CrmEventKind; email: string; payload: OutboxPayload },
): Promise<string> {
  const [row] = await executor
    .insert(crmOutbox)
    .values({ kind: event.kind, email: event.email, payload: event.payload })
    .returning({ id: crmOutbox.id });
  return row!.id;
}

export interface OutboxSender {
  /** Creates or updates the contact (matched by email). Never sends tags. */
  upsert(
    input: FlowiUpsertContactInput,
    options?: FlowiCallOptions,
  ): Promise<{ isNew: boolean; contactId: string }>;
  /** Adds tags to the contact without removing existing ones. */
  addTags(contactId: string, tags: string[], options?: FlowiCallOptions): Promise<void>;
}

export const flowiSender: OutboxSender = {
  upsert: (input, options) => upsertFlowiContact(input, options),
  addTags: (contactId, tags, options) => addFlowiContactTags(contactId, tags, options),
};

/** Safe summary of a failure: its class or HTTP status only, never provider text. */
export function describeSendFailure(error: unknown): string {
  const status = (error as { status?: unknown } | null)?.status;
  if (typeof status === 'number') return `HTTP ${status}`;
  return error instanceof Error ? error.name : 'UnknownError';
}

export type SendResult = { ok: true; isNew: boolean } | { ok: false; permanent: boolean };

/** How many attempts this kind of failure is allowed before the row is left `failed`. */
export function attemptLimit(kind: FlowiFailureKind): number {
  if (kind === 'rejected') return 1;
  return kind === 'config' ? OUTBOX.maxConfigAttempts : OUTBOX.maxAttempts;
}

/**
 * Delivers one claimed row, in two steps, and records the outcome. Never throws.
 *
 *  1. Upsert the contact (skipped if an earlier attempt already did it: the saved
 *     `contact_id` is used instead, so a retry never repeats the upsert).
 *  2. Add the TNSI tag(s) without touching the contact's existing tags.
 *
 * The row is `sent` only when BOTH succeeded. If the upsert worked but adding the
 * tags failed, the row stays `pending` with its contact id saved, because the tag
 * is what Flowi's automations key on and a lead without it would be silently
 * incomplete.
 */
async function sendClaimed(
  row: CrmOutboxRow,
  sender: OutboxSender,
  database: Pick<DB, 'update'>,
  now: () => Date,
  /** Set for the immediate attempt: a shared time limit for both Flowi calls. */
  limit?: { deadlineMs: number; clockMs: () => number },
): Promise<SendResult> {
  /** Time left for the next call, or undefined when there is no shared limit. */
  const callOptions = (): FlowiCallOptions | undefined => {
    if (!limit) return undefined;
    const left = limit.deadlineMs - limit.clockMs();
    if (left <= 0) {
      throw Object.assign(new Error('Immediate delivery time limit reached'), {
        name: 'TimeoutError',
      });
    }
    // Whole milliseconds: `performance.now()` differences are fractional, and a fractional
    // timeout makes `AbortSignal.timeout` throw before any request is made.
    return { timeoutMs: Math.max(1, Math.floor(left)) };
  };

  const savedContactId = row.contactId;
  let step: 'upsert' | 'tags' = 'upsert';
  try {
    const payload = row.payload as unknown as OutboxPayload;
    let contactId = savedContactId;
    let isNew = false;

    if (!contactId) {
      const { tags: _tags, ...contact } = payload;
      void _tags;
      const result = await sender.upsert({ ...contact, email: row.email }, callOptions());
      contactId = result.contactId;
      isNew = result.isNew;
      // Remember it straight away: if the tags then fail, the retry skips the upsert.
      await database.update(crmOutbox).set({ contactId }).where(eq(crmOutbox.id, row.id));
    }

    step = 'tags';
    await sender.addTags(contactId, payload.tags, callOptions());

    await database
      .update(crmOutbox)
      .set({ status: 'sent', sentAt: now(), lockedUntil: null, lastError: null })
      .where(eq(crmOutbox.id, row.id));
    return { ok: true, isNew };
  } catch (error) {
    const kind = classifyFlowiFailure(error);
    const attempts = row.attempts + 1;
    const giveUp = attempts >= attemptLimit(kind);
    // A 404 when adding tags to a contact id we saved earlier means that contact is
    // gone (deleted or merged in Flowi). The id is stale, so forget it: the next
    // attempt (or a requeue, if this was the last one) upserts again for a fresh id.
    // Only that case: a 404 from the upsert, or on an id this very attempt just
    // obtained, or any other error, keeps the saved id.
    const staleContactId =
      step === 'tags' &&
      savedContactId !== null &&
      error instanceof FlowiRequestError &&
      error.status === 404;
    await database
      .update(crmOutbox)
      .set({
        status: giveUp ? 'failed' : 'pending',
        attempts,
        nextAttemptAt: new Date(now().getTime() + retryDelayMs(attempts)),
        lockedUntil: null,
        lastError: describeSendFailure(error),
        ...(staleContactId ? { contactId: null } : {}),
      })
      .where(eq(crmOutbox.id, row.id));
    return { ok: false, permanent: giveUp };
  }
}

export interface OutboxDeps {
  database?: DB;
  sender?: OutboxSender;
  now?: () => Date;
  /** Monotonic milliseconds, for the time budget only (injectable in tests). */
  clockMs?: () => number;
  /** Overrides `OUTBOX.budgetMs` (tests). */
  budgetMs?: number;
  /** Overrides `OUTBOX.immediateBudgetMs` (tests). */
  immediateBudgetMs?: number;
}

/**
 * Claims up to `limit` due rows: `pending` and due, or `sending` whose claim has
 * expired. `FOR UPDATE SKIP LOCKED` means two simultaneous workers never take the
 * same row. The claim is a short transaction; the network call happens AFTER it,
 * so no database lock or connection is held while Flowi is slow.
 */
async function claimDue(
  database: DB,
  now: Date,
  limit: number,
  onlyId?: string,
): Promise<CrmOutboxRow[]> {
  return database.transaction(async (trx) => {
    const due = await trx
      .select({ id: crmOutbox.id })
      .from(crmOutbox)
      .where(
        and(
          onlyId ? eq(crmOutbox.id, onlyId) : undefined,
          onlyId
            ? // A row we have just enqueued is due by definition. (Comparing its
              // database-assigned time with our own millisecond clock could wrongly
              // call it "not yet due" when both fall within the same millisecond.)
              eq(crmOutbox.status, 'pending')
            : or(
                and(eq(crmOutbox.status, 'pending'), lte(crmOutbox.nextAttemptAt, now)),
                and(eq(crmOutbox.status, 'sending'), lt(crmOutbox.lockedUntil, now)),
              ),
        ),
      )
      .orderBy(crmOutbox.nextAttemptAt)
      .limit(limit)
      .for('update', { skipLocked: true });
    if (due.length === 0) return [];
    return trx
      .update(crmOutbox)
      .set({ status: 'sending', lockedUntil: new Date(now.getTime() + OUTBOX.claimMs) })
      .where(
        inArray(
          crmOutbox.id,
          due.map((d) => d.id),
        ),
      )
      .returning();
  });
}

/**
 * One immediate, best-effort attempt for a row JUST enqueued (it only takes a
 * `pending` row). A failure leaves it for the worker, which honours the back-off.
 */
export async function attemptNow(id: string, deps: OutboxDeps = {}): Promise<SendResult | null> {
  const database = deps.database ?? db;
  const now = deps.now ?? (() => new Date());
  const [row] = await claimDue(database, now(), 1, id);
  if (!row) return null;
  const clockMs = deps.clockMs ?? (() => performance.now());
  const budget = deps.immediateBudgetMs ?? OUTBOX.immediateBudgetMs;
  return sendClaimed(row, deps.sender ?? flowiSender, database, now, {
    deadlineMs: clockMs() + budget,
    clockMs,
  });
}

export interface ProcessSummary {
  claimed: number;
  sent: number;
  retrying: number;
  failed: number;
  purged: number;
  /** The run stopped because its time budget was used up, not because the queue was empty. */
  stoppedForTime: boolean;
}

/**
 * The worker: sends due rows one at a time, then deletes rows sent long ago.
 *
 * Rows are claimed ONE AT A TIME and the clock is checked before each claim, so
 * once the time budget is used up the worker simply stops: nothing is left
 * claimed-but-unsent, and the remaining rows are picked up by the next run.
 */
export async function processOutbox(deps: OutboxDeps = {}): Promise<ProcessSummary> {
  const database = deps.database ?? db;
  const now = deps.now ?? (() => new Date());
  const clockMs = deps.clockMs ?? (() => performance.now());
  const budgetMs = deps.budgetMs ?? OUTBOX.budgetMs;
  const sender = deps.sender ?? flowiSender;
  const startedAt = clockMs();

  const summary: ProcessSummary = {
    claimed: 0,
    sent: 0,
    retrying: 0,
    failed: 0,
    purged: 0,
    stoppedForTime: false,
  };
  while (summary.claimed < OUTBOX.batchSize) {
    if (clockMs() - startedAt >= budgetMs) {
      summary.stoppedForTime = true;
      break;
    }
    const [row] = await claimDue(database, now(), 1);
    if (!row) break;
    summary.claimed += 1;
    const result = await sendClaimed(row, sender, database, now);
    if (result.ok) summary.sent += 1;
    else if (result.permanent) summary.failed += 1;
    else summary.retrying += 1;
  }

  const purged = await database
    .delete(crmOutbox)
    .where(
      and(
        eq(crmOutbox.status, 'sent'),
        lt(crmOutbox.sentAt, new Date(now().getTime() - OUTBOX.sentRetentionMs)),
      ),
    )
    .returning({ id: crmOutbox.id });
  summary.purged = purged.length;
  return summary;
}

/** Rows a person should look at. */
export async function countFailed(database: DB = db): Promise<number> {
  const [r] = await database
    .select({ n: sql<number>`count(*)::int` })
    .from(crmOutbox)
    .where(eq(crmOutbox.status, 'failed'));
  return r?.n ?? 0;
}

/**
 * Failed rows grouped by failure category (`last_error` is an HTTP status or an
 * error class only), e.g. `{ "HTTP 401": 3 }`. Counts only: no email, payload or
 * provider text, so it is safe to return from the protected worker route.
 */
export async function failedByCategory(database: DB = db): Promise<Record<string, number>> {
  const rows = await database
    .select({ category: crmOutbox.lastError, n: sql<number>`count(*)::int` })
    .from(crmOutbox)
    .where(eq(crmOutbox.status, 'failed'))
    .groupBy(crmOutbox.lastError);
  return Object.fromEntries(rows.map((r) => [r.category ?? 'unknown', r.n]));
}

/**
 * Puts failed rows back in the queue (attempts reset, due now) once whatever made
 * them fail has been corrected. Nothing is deleted. Optionally limited to one
 * category, e.g. `{ category: 'HTTP 401' }` after fixing a key. A row that already
 * has a Flowi contact id keeps it, so only the missing tag step is repeated.
 *
 * Not reachable from any route: exposing it is an access-control decision (see
 * the CRM outbox notes in docs/06-feature-specification.md).
 */
export async function requeueFailed(
  options: { category?: string } = {},
  deps: { database?: DB; now?: () => Date } = {},
): Promise<number> {
  const database = deps.database ?? db;
  const now = (deps.now ?? (() => new Date()))();
  const rows = await database
    .update(crmOutbox)
    .set({ status: 'pending', attempts: 0, nextAttemptAt: now, lockedUntil: null, lastError: null })
    .where(
      and(
        eq(crmOutbox.status, 'failed'),
        options.category ? eq(crmOutbox.lastError, options.category) : undefined,
      ),
    )
    .returning({ id: crmOutbox.id });
  return rows.length;
}
