import { and, count, eq, gt, sql } from 'drizzle-orm';
import { crmOutbox } from '@tnsi/db';

/**
 * Abuse protections shared by the public forms (contact, newsletter, assessment).
 * They use only what the app already has - no new service and no new table:
 *
 * - a same-origin check on the Origin header (a request from another site is refused);
 * - a honeypot field real visitors never see or fill - a filled one is a bot;
 * - a rate limit counted from the CRM outbox rows the forms already write
 *   (per email address, and per form overall).
 *
 * None of this replaces email verification (see docs/09-launch-checklist.md): it
 * makes casual abuse expensive and keeps the database and CRM from being flooded.
 */

import { HONEYPOT_FIELD } from '@/lib/form-guard-constants';

export { HONEYPOT_FIELD };

export const FORM_LIMITS = {
  /** Submissions from one email address for one form. */
  perEmail: { max: 5, windowMs: 60 * 60 * 1000 },
  /** Submissions to one form from anyone: a flood guard for the database and the CRM. */
  perForm: { max: 300, windowMs: 10 * 60 * 1000 },
} as const;

/**
 * True when the browser says the request came from a different site. A missing
 * Origin (non-browser callers) is not treated as hostile; only a mismatch is.
 */
export function isCrossOrigin(request: Request): boolean {
  // Browsers set Sec-Fetch-Site themselves; a page on another site cannot forge it.
  if (request.headers.get('sec-fetch-site') === 'cross-site') return true;
  const origin = request.headers.get('origin');
  if (!origin) return false;
  const host = request.headers.get('x-forwarded-host') ?? request.headers.get('host');
  if (!host) return false;
  try {
    return new URL(origin).host !== host;
  } catch {
    return true; // an Origin that is not a URL
  }
}

/** Largest JSON body any of these forms legitimately sends (a 5,000-character message plus fields). */
export const MAX_BODY_BYTES = 20_000;

/** True when the declared body size is over the limit. Chunked bodies (no length) are left to validation. */
export function isBodyTooLarge(request: Request, max = MAX_BODY_BYTES): boolean {
  const declared = Number(request.headers.get('content-length'));
  return Number.isFinite(declared) && declared > max;
}

/** True when the hidden field was filled in: the submitter is a bot. */
export function honeypotTripped(body: unknown): boolean {
  if (typeof body !== 'object' || body === null) return false;
  const value = (body as Record<string, unknown>)[HONEYPOT_FIELD];
  return typeof value === 'string'
    ? value.trim().length > 0
    : value !== undefined && value !== null;
}

type Counter = {
  select: (fields: { n: ReturnType<typeof count> }) => {
    from: (table: typeof crmOutbox) => { where: (condition: unknown) => Promise<{ n: number }[]> };
  };
};

type FormKind = 'contact_form' | 'newsletter' | 'assessment';

/** Whether this email address, or the form as a whole, has reached its limit. Throws if the query fails. */
async function overLimit(
  counter: Counter,
  kind: FormKind,
  email: string,
  now: Date,
): Promise<boolean> {
  const since = (windowMs: number) => new Date(now.getTime() - windowMs);

  const [byEmail] = await counter
    .select({ n: count() })
    .from(crmOutbox)
    .where(
      and(
        eq(crmOutbox.kind, kind),
        sql`lower(${crmOutbox.email}) = ${email.trim().toLowerCase()}`,
        gt(crmOutbox.createdAt, since(FORM_LIMITS.perEmail.windowMs)),
      ),
    );
  if ((byEmail?.n ?? 0) >= FORM_LIMITS.perEmail.max) return true;

  const [byForm] = await counter
    .select({ n: count() })
    .from(crmOutbox)
    .where(
      and(eq(crmOutbox.kind, kind), gt(crmOutbox.createdAt, since(FORM_LIMITS.perForm.windowMs))),
    );
  return (byForm?.n ?? 0) >= FORM_LIMITS.perForm.max;
}

/**
 * Whether this email address, or the form as a whole, has hit its limit (a plain,
 * unlocked check). Fails OPEN: if the check itself errors, a real visitor is not
 * turned away by a limiter fault.
 */
export async function isRateLimited(
  db: unknown,
  kind: FormKind,
  email: string,
  now: Date = new Date(),
): Promise<boolean> {
  try {
    return await overLimit(db as Counter, kind, email, now);
  } catch {
    console.warn('[form-guard] rate-limit check failed; allowing the request');
    return false;
  }
}

/** Raised inside the transaction for a failure of the limiter itself (never of the stored work). */
class LimiterFault extends Error {}
/** Wraps a failure of the caller's own work so it is not mistaken for a limiter fault. */
class WorkFault extends Error {
  constructor(readonly original: unknown) {
    super('work failed');
  }
}

type Transactional<T> = {
  transaction: <R>(fn: (tx: T) => Promise<R>) => Promise<R>;
};

/**
 * Runs `work` (the storing of the submission) only if the sender is under the
 * limit, with the check and the write made atomic per email address: a
 * transaction-scoped Postgres advisory lock on (form, email) serialises
 * concurrent submissions from one address, so a burst cannot all pass the check
 * before any of them is stored. The per-form flood count is not locked (that
 * would serialise every visitor); concurrent bursts can overshoot it slightly.
 *
 * If the limiter itself fails (lock or count query), `work` runs without it
 * (fail open) and an error of `work` is always propagated unchanged.
 */
export async function withinRateLimit<T, R>(
  db: Transactional<T> & unknown,
  kind: FormKind,
  email: string,
  work: (executor: T) => Promise<R>,
  now: Date = new Date(),
): Promise<{ limited: true } | { limited: false; value: R }> {
  const lockKey = `${kind}:${email.trim().toLowerCase()}`;
  try {
    return await db.transaction(async (tx) => {
      try {
        await (tx as unknown as { execute: (q: unknown) => Promise<unknown> }).execute(
          sql`select pg_advisory_xact_lock(hashtext(${lockKey}))`,
        );
        if (await overLimit(tx as unknown as Counter, kind, email, now)) {
          return { limited: true } as const;
        }
      } catch {
        throw new LimiterFault();
      }
      try {
        return { limited: false, value: await work(tx) } as const;
      } catch (error) {
        throw new WorkFault(error);
      }
    });
  } catch (error) {
    if (error instanceof WorkFault) throw error.original;
    if (error instanceof LimiterFault) {
      console.warn('[form-guard] rate limiter unavailable; allowing the request');
      return { limited: false, value: await work(db as unknown as T) };
    }
    throw error;
  }
}

export const TOO_MANY_REQUESTS = {
  error: 'Too many requests. Please wait a while and try again.',
} as const;
