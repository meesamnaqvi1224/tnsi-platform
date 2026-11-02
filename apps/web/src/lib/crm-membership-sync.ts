import { and, eq, isNotNull, isNull, lt, sql } from 'drizzle-orm';
import { db, entitlements, users, type DB, type Entitlement } from '@tnsi/db';
import { attemptNow, enqueueCrmEvent, type OutboxPayload } from './crm-outbox';
import {
  appSignupPayload,
  membershipChange,
  membershipPayload,
  type CrmMembershipRecord,
} from './crm-membership';

/**
 * Queues membership changes for the CRM (see crm-membership.ts for what is sent
 * and why). Everything here is a MIRROR for the team's Flowi automations: it
 * never decides anyone's access, and a failure here must never stop a sign-up,
 * a trial or a Stripe sync - so each queueing step runs in its own savepoint and
 * its failure is swallowed (with only an error class name logged).
 */

type Executor = Pick<DB, 'insert' | 'select' | 'transaction'>;

/** What is safe to log about a failure: its class only, never an email or provider text. */
function failureName(error: unknown): string {
  return error instanceof Error ? error.name : 'UnknownError';
}

async function personFor(trx: Pick<DB, 'select'>, userId: string) {
  const [row] = await trx
    .select({ email: users.email, fullName: users.fullName })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);
  return row && row.email ? row : null;
}

/**
 * Queues the CRM update for a membership that has just changed, inside the same
 * transaction as the change. Returns the outbox row id (so the caller can try
 * to send it straight after the commit) or `null` if there was nothing to send.
 * Never throws.
 */
export async function enqueueMembershipChange(
  trx: Executor,
  input: {
    userId: string;
    before: CrmMembershipRecord | null;
    after: CrmMembershipRecord;
    now: Date;
  },
): Promise<string | null> {
  try {
    return await trx.transaction(async (savepoint) => {
      const person = await personFor(savepoint, input.userId);
      if (!person) return null;
      const payload = membershipChange(input.before, input.after, input.now, person);
      if (!payload) return null;
      return enqueueCrmEvent(savepoint, { kind: 'membership', email: person.email, payload });
    });
  } catch (error) {
    console.error('[crm membership] could not queue update:', failureName(error));
    return null;
  }
}

/**
 * The first CRM update for a brand-new account. Called only when the account's
 * entitlement row is created, which happens once per account, so a repeated
 * Clerk delivery cannot queue a second sign-up. Never throws.
 */
export async function enqueueAppSignup(trx: Executor, userId: string): Promise<string | null> {
  try {
    return await trx.transaction(async (savepoint) => {
      const person = await personFor(savepoint, userId);
      if (!person) return null;
      return enqueueCrmEvent(savepoint, {
        kind: 'app_signup',
        email: person.email,
        payload: appSignupPayload(person),
      });
    });
  } catch (error) {
    console.error('[crm signup] could not queue update:', failureName(error));
    return null;
  }
}

/**
 * The trial just started: queues the CRM update. Used right after the trial is
 * claimed (its own transaction, which this does not join). Never throws.
 */
export async function enqueueTrialStarted(
  database: Executor,
  input: { userId: string; email: string; fullName?: string | null; record: CrmMembershipRecord },
): Promise<string | null> {
  try {
    const payload = membershipPayload('Trial', input.record, { fullName: input.fullName });
    return await enqueueCrmEvent(database, {
      kind: 'membership',
      email: input.email,
      payload,
    });
  } catch (error) {
    console.error('[crm trial] could not queue update:', failureName(error));
    return null;
  }
}

/**
 * Queues the "trial started" CRM update and tries to send it at once, so the
 * welcome email goes out within a minute or two. Called after the trial has been
 * claimed; never throws, and the trial is already safely started whatever happens.
 */
export async function notifyTrialStarted(input: {
  userId: string;
  email: string;
  fullName?: string | null;
  trialStartedAt: Date;
  trialEndsAt: Date;
}): Promise<void> {
  const id = await enqueueTrialStarted(db, {
    userId: input.userId,
    email: input.email,
    fullName: input.fullName,
    record: {
      tier: 'free',
      status: 'active',
      programs: [],
      certifications: [],
      features: [],
      trialStartedAt: input.trialStartedAt,
      trialEndsAt: input.trialEndsAt,
      currentPeriodEnd: null,
      cancelAtPeriodEnd: false,
    },
  });
  if (id) await attemptNow(id).catch(() => undefined);
}

/** Marker kept in the entitlement's own `metadata`, so each ended trial is queued once. */
const TRIAL_ENDED_MARKER = 'crmTrialEndedQueuedAt';

/**
 * Trials end by the clock - nothing happens in the database when one does - so
 * a scheduled run finds the Free accounts whose trial has passed and queues one
 * "trial ended" update for each. Runs ahead of the outbox worker. Marks each
 * account as it is queued, so it is never queued twice; an account that has
 * since gone on to pay is left alone (its own state changes are queued by the
 * Stripe sync). Returns how many were queued.
 */
export async function enqueueEndedTrials(
  now: Date = new Date(),
  database: DB = db,
  limit = 100,
): Promise<number> {
  const due = await database
    .select()
    .from(entitlements)
    .where(
      and(
        eq(entitlements.tier, 'free'),
        isNotNull(entitlements.trialEndsAt),
        lt(entitlements.trialEndsAt, now),
        isNull(sql`${entitlements.metadata}->>${TRIAL_ENDED_MARKER}`),
      ),
    )
    .limit(limit);

  let queued = 0;
  for (const row of due) {
    try {
      await database.transaction(async (trx) => {
        // Mark first, in the same transaction: if queueing fails, the mark rolls back too.
        const marked = await trx
          .update(entitlements)
          .set({
            metadata: sql`jsonb_set(COALESCE(${entitlements.metadata}, '{}'::jsonb), ${`{${TRIAL_ENDED_MARKER}}`}::text[], to_jsonb(${now.toISOString()}::text), true)`,
          })
          .where(
            and(
              eq(entitlements.userId, row.userId),
              eq(entitlements.tier, 'free'),
              isNull(sql`${entitlements.metadata}->>${TRIAL_ENDED_MARKER}`),
            ),
          )
          .returning({ userId: entitlements.userId });
        if (marked.length === 0) return;

        const person = await personFor(trx, row.userId);
        if (!person) return;
        const payload: OutboxPayload = membershipPayload(
          'Free (trial ended)',
          row as Entitlement,
          person,
        );
        await enqueueCrmEvent(trx, { kind: 'membership', email: person.email, payload });
        queued += 1;
      });
    } catch (error) {
      console.error('[crm trial ended] could not queue update:', failureName(error));
    }
  }
  return queued;
}
