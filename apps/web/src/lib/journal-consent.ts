/**
 * My Reflections: the first-use acknowledgement, server side (decision Q1, 16 Nov 2026).
 *
 * Writing a reflection (create or change) requires the member to have acknowledged the CURRENT notice
 * and not withdrawn; reading and deleting never do. The rule is enforced here, in the database
 * transaction that performs the write (journal.ts `withJournalWrite`), so no client can skip it by
 * calling the API directly. Recording or withdrawing consent follows the same protocol as every other
 * journal mutation: shared journal lock, then the deletion check, so it can never commit after an
 * account deletion has begun.
 *
 * The table holds a notice version and two timestamps - no journal text, no email. Nothing here logs.
 * Wording and legal basis are NOT decided: see docs/my-reflections-consent.md and
 * packages/core/src/reflections/consent.ts.
 */
import { db, journalConsents } from '@tnsi/db';
import { eq, sql } from 'drizzle-orm';
import { JOURNAL_CONSENT_VERSION, type JournalConsentState } from '@tnsi/core';
import { assertJournalWritable, lockJournalShared, type Tx } from './deletion-state';

/** Thrown when a write needs a current acknowledgement the member has not given (or has withdrawn). */
export class JournalConsentRequiredError extends Error {
  constructor() {
    super('JOURNAL_CONSENT_REQUIRED');
    this.name = 'JournalConsentRequiredError';
  }
}

type Reader = Pick<typeof db, 'select'>;

export async function getJournalConsent(
  userId: string,
  executor: Reader = db,
): Promise<JournalConsentState> {
  const [row] = await executor
    .select({
      version: journalConsents.policyVersion,
      withdrawnAt: journalConsents.withdrawnAt,
    })
    .from(journalConsents)
    .where(eq(journalConsents.userId, userId))
    .limit(1);
  const status = !row
    ? 'required'
    : row.withdrawnAt
      ? 'withdrawn'
      : row.version === JOURNAL_CONSENT_VERSION
        ? 'granted'
        : 'required';
  return { status, version: JOURNAL_CONSENT_VERSION };
}

/** Inside the write transaction: refuses unless the member has acknowledged the current notice. */
export async function assertJournalConsent(tx: Tx, userId: string): Promise<void> {
  if ((await getJournalConsent(userId, tx)).status !== 'granted') {
    throw new JournalConsentRequiredError();
  }
}

export type RecordConsentResult =
  { kind: 'recorded'; state: JournalConsentState } | { kind: 'stale_version' };

/**
 * Records that the member acknowledged `version`. Idempotent: repeating it for the current notice keeps
 * the first time. A client showing an out-of-date notice is refused (`stale_version`) so a member can
 * never be recorded as agreeing to wording they were not shown.
 */
export async function recordJournalConsent(
  userId: string,
  version: string,
): Promise<RecordConsentResult> {
  if (version !== JOURNAL_CONSENT_VERSION) return { kind: 'stale_version' };
  return db.transaction(async (tx) => {
    await lockJournalShared(tx, userId);
    await assertJournalWritable(tx, userId);
    await tx
      .insert(journalConsents)
      .values({ userId, policyVersion: version })
      .onConflictDoUpdate({
        target: journalConsents.userId,
        set: { policyVersion: version, consentedAt: sql`now()`, withdrawnAt: null },
        // Only when something changes: a repeat for the current, un-withdrawn notice is a no-op.
        setWhere: sql`${journalConsents.policyVersion} <> ${version} or ${journalConsents.withdrawnAt} is not null`,
      });
    return { kind: 'recorded', state: await getJournalConsent(userId, tx) } as const;
  });
}

/** Withdraws permission to write. Idempotent; keeps the first withdrawal time. Existing reflections are not touched. */
export async function withdrawJournalConsent(userId: string): Promise<JournalConsentState> {
  return db.transaction(async (tx) => {
    await lockJournalShared(tx, userId);
    await assertJournalWritable(tx, userId);
    await tx
      .update(journalConsents)
      .set({ withdrawnAt: sql`coalesce(${journalConsents.withdrawnAt}, now())` })
      .where(eq(journalConsents.userId, userId));
    return getJournalConsent(userId, tx);
  });
}
