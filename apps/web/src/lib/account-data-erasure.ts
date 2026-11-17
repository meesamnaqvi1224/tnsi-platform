/**
 * What account deletion erases, anonymises and keeps - in one place.
 *
 * Decision of 16 November 2026 (Decisions & Approvals Register, Q4/Q5): on a completed account deletion,
 * delete or irreversibly anonymise the account identity and the member's personal activity, keep only
 * what has a documented legal, security or financial reason, delete the member's CRM contact, and stop
 * marketing as soon as deletion starts. docs/account-deletion-and-data-retention.md is the full record,
 * including which retained items still need legal confirmation.
 *
 * ERASED (rows deleted):        journal entries (by lib/journal.ts, in the same transaction), check-ins,
 *                               practice completions, quick practice reflections, saved practices,
 *                               PowerDrop usage, assessment submissions linked to the account, and any CRM
 *                               events still queued for the member's address.
 * ANONYMISED (row kept):        the `users` row. Email, name, avatar and metadata are overwritten; the
 *                               row stays as a tombstone (see TOMBSTONE below).
 * KEPT (documented reasons):    `entitlements` (billing reconciliation with Stripe), `trial_claims` (a
 *                               keyed hash that stops a second free trial; never an email),
 *                               `account_deletion_requests` (the record that deletion was requested).
 *
 * TOMBSTONE. The anonymised `users` row keeps its internal id, its Clerk user id, its timestamps and
 * `deleted_at`. That is what makes deletion safe to repeat and impossible to undo by accident: a
 * repeated or late Clerk webhook finds the row and does nothing, a stale `user.updated` cannot write the
 * person's details back (see upsertUser), and a restored backup can be reconciled against it.
 *
 * Nothing here logs. Every function is idempotent.
 */
import {
  assessmentSubmissions,
  checkIns,
  crmOutbox,
  db,
  powerDropUsages,
  practiceCompletions,
  practiceReflections,
  practiceSaves,
  users,
} from '@tnsi/db';
import { and, eq, inArray, notInArray, sql } from 'drizzle-orm';
import { ACCOUNT_CRM_KINDS, attemptNow, type OutboxDeps } from './crm-outbox';
import type { Tx } from './deletion-state';

/** `.invalid` is reserved (RFC 2606): it can never be a real, deliverable address. */
const ANONYMISED_EMAIL_DOMAIN = 'deleted.invalid';

/** The placeholder that replaces a deleted member's email. Carries no personal information. */
export function anonymisedEmail(userId: string): string {
  return `deleted-${userId}@${ANONYMISED_EMAIL_DOMAIN}`;
}

export function isAnonymisedEmail(email: string): boolean {
  return email.endsWith(`@${ANONYMISED_EMAIL_DOMAIN}`);
}

const sameEmail = (email: string) => sql`lower(${crmOutbox.email}) = lower(${email})`;
const jobFor = (userId: string) => sql`${crmOutbox.payload}->>'userId' = ${userId}`;

/** Removes CRM events still queued for this address, so nothing is sent (or a contact re-created) later. */
async function cancelQueuedCrmEvents(tx: Tx, email: string): Promise<void> {
  await tx
    .delete(crmOutbox)
    .where(and(sameEmail(email), notInArray(crmOutbox.kind, [...ACCOUNT_CRM_KINDS])));
}

/**
 * Step 1b of account deletion: marketing suppression, the moment deletion starts.
 *
 * In one transaction: cancels every CRM event still queued for the member, and queues ONE
 * `account_suppress` job (do-not-disturb on the CRM contact). Returns the job to attempt straight away,
 * or null when there is nothing to do (already queued, or the account is already erased). Once the
 * account is erased the application produces no further CRM events for it (crm-membership-sync.ts).
 */
export async function startMarketingSuppression(userId: string): Promise<string | null> {
  return db.transaction(async (tx) => {
    const [user] = await tx
      .select({ email: users.email, deletedAt: users.deletedAt })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);
    if (!user || user.deletedAt || isAnonymisedEmail(user.email)) return null;

    await cancelQueuedCrmEvents(tx, user.email);

    const [existing] = await tx
      .select({ id: crmOutbox.id })
      .from(crmOutbox)
      .where(and(eq(crmOutbox.kind, 'account_suppress'), jobFor(userId)))
      .limit(1);
    if (existing) return null;

    const [row] = await tx
      .insert(crmOutbox)
      .values({ kind: 'account_suppress', email: user.email, payload: { userId } })
      .returning({ id: crmOutbox.id });
    return row!.id;
  });
}

/**
 * Suppression as the deletion flow calls it: queue (durably), then one immediate attempt. A CRM that is
 * slow or down does not stop the deletion - the job stays queued and the worker retries it - but a
 * failure to QUEUE it throws, and the flow reports the deletion as started-but-unfinished.
 */
export async function suppressMarketing(userId: string, deps: OutboxDeps = {}): Promise<void> {
  const jobId = await startMarketingSuppression(userId);
  if (jobId) await attemptNow(jobId, deps).catch(() => undefined);
}

/**
 * The erasure itself. MUST run inside the transaction that holds the member's EXCLUSIVE journal lock
 * and marks the account deleted (softDeleteUser), so it is atomic with both: either the account is
 * deleted and all of this is gone, or nothing changed.
 *
 * Safe to run again: the deletes find nothing, the row is already anonymised, and the CRM job is
 * queued only on the run that still knew the member's address.
 */
export async function eraseMemberData(tx: Tx, userId: string): Promise<void> {
  const [user] = await tx
    .select({ email: users.email })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);
  if (!user) return;

  // Activity. Reflections before completions (they reference them); the rest are independent.
  await tx.delete(practiceReflections).where(eq(practiceReflections.userId, userId));
  await tx.delete(practiceCompletions).where(eq(practiceCompletions.userId, userId));
  await tx.delete(practiceSaves).where(eq(practiceSaves.userId, userId));
  await tx.delete(checkIns).where(eq(checkIns.userId, userId));
  await tx.delete(powerDropUsages).where(eq(powerDropUsages.userId, userId));
  await tx.delete(assessmentSubmissions).where(eq(assessmentSubmissions.userId, userId));

  if (!isAnonymisedEmail(user.email)) {
    // The CRM contact: nothing queued for this address may still be sent, a suppression job that has
    // not run is superseded by the deletion, and exactly one deletion job is queued. The job is the
    // only place the address survives, and it is scrubbed when the CRM confirms (crm-outbox.ts).
    await tx
      .delete(crmOutbox)
      .where(and(sameEmail(user.email), notInArray(crmOutbox.kind, ['account_delete'])));
    const [queued] = await tx
      .select({ id: crmOutbox.id })
      .from(crmOutbox)
      .where(and(eq(crmOutbox.kind, 'account_delete'), jobFor(userId)))
      .limit(1);
    if (!queued) {
      await tx
        .insert(crmOutbox)
        .values({ kind: 'account_delete', email: user.email, payload: { userId } });
    }
  }

  await tx
    .update(users)
    .set({ email: anonymisedEmail(userId), fullName: null, avatarUrl: null, metadata: {} })
    .where(eq(users.id, userId));
}

/**
 * Last step of account deletion: try the member's CRM deletion now, and say whether it is DONE.
 *
 * True only when no `account_delete` job for this member is still waiting or failed. False means the
 * contact has not been confirmed deleted yet (the CRM is slow, down or misconfigured); the job stays
 * queued for the worker, and the caller must not report the deletion as complete.
 */
export async function completeCrmDeletion(userId: string, deps: OutboxDeps = {}): Promise<boolean> {
  const database = deps.database ?? db;
  const open = () =>
    database
      .select({ id: crmOutbox.id, status: crmOutbox.status })
      .from(crmOutbox)
      .where(
        and(
          eq(crmOutbox.kind, 'account_delete'),
          jobFor(userId),
          inArray(crmOutbox.status, ['pending', 'sending', 'failed']),
        ),
      );

  for (const job of await open()) {
    if (job.status === 'pending') await attemptNow(job.id, deps).catch(() => undefined);
  }
  return (await open()).length === 0;
}
