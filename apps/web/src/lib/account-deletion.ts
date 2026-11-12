/**
 * Member-initiated account deletion.
 *
 * Postgres and Clerk are separate systems; no transaction spans them, and none is assumed. So the ORDER of
 * the steps, plus one persisted marker, is the safety design. A failure at any point leaves a state that is
 * safe, honestly reported, and can simply be retried:
 *
 *   0. Refuse while a paid Stripe subscription is still running (deleting the account would otherwise
 *      leave billing active with nobody able to cancel it). Read-only; changes nothing.
 *   1. MARK THE DELETION PENDING (`users.deletion_requested_at`, first request time preserved). From this
 *      moment the journal is locked: every journal route refuses the member (423), so nothing can be read,
 *      written or re-created while the rest of the deletion runs or if it stalls. If this fails nothing has
 *      changed and we stop.
 *   2. Purge the member's journal (one atomic DELETE; drafts included).
 *   3. Delete the identity in Clerk. A Clerk 404 (already deleted) counts as success.
 *   4. Finalise locally in ONE transaction: purge any journal rows again (removes anything a request that
 *      was already in flight when step 1 ran might have written) and mark the user deleted (softDeleteUser).
 *
 * What each failure leaves, and how it recovers:
 *   - step 0 / 1 fail:    nothing changed. `failed`. The member can retry.
 *   - step 2 / 3 fail:    deletion is PENDING: started, not finished. The journal is already locked (and
 *                         gone, or about to be on retry); the member is still signed in and can retry. This
 *                         is reported as `pending`, never as success.
 *   - step 4 fails:       the identity is already gone, so the member can no longer sign in. `pending_cleanup`;
 *                         the Clerk `user.deleted` webhook runs the same transactional finalisation and Clerk
 *                         retries a failing webhook, so nothing is abandoned.
 *
 * A retry re-runs every step: marking keeps the first request time, purging an empty journal is a no-op,
 * Clerk's 404 is success. A retry can never restore or expose an entry that was deleted: the journal is
 * locked from step 1 onward and nothing in this flow ever writes to it.
 *
 * Only `deleted` means the deletion is complete, and it is returned only after every step has succeeded.
 * Every function here is idempotent and no step logs anything but a stage label and a short error code.
 */
import { db, entitlements, users } from '@tnsi/db';
import { eq, sql } from 'drizzle-orm';
import { purgeJournalEntries } from './journal';
import { safeErrorCode } from './private-response';

export type AccountDeletionStage =
  'precheck' | 'mark_pending' | 'journal_purge' | 'identity_provider';

export type AccountDeletionResult =
  /** Every step succeeded. The only complete state. */
  | { status: 'deleted' }
  /** The identity is deleted; local finalisation did not finish and will be completed by the Clerk webhook retry. */
  | { status: 'pending_cleanup' }
  | { status: 'blocked_subscription' }
  /** Nothing was changed (the pre-check or the pending marker failed). Safe to retry. */
  | { status: 'failed'; stage: 'precheck' | 'mark_pending' }
  /** Deletion has STARTED but not finished: the journal is locked. Safe to retry. */
  | { status: 'pending'; stage: 'journal_purge' | 'identity_provider' };

export interface AccountDeletionDeps {
  hasActivePaidSubscription(userId: string): Promise<boolean>;
  /** Idempotent: records that deletion started, preserving the first request time. */
  markDeletionPending(userId: string): Promise<unknown>;
  purgeJournal(userId: string): Promise<unknown>;
  /** Deletes the identity. Must resolve when the identity is already gone. */
  deleteIdentity(clerkUserId: string): Promise<void>;
  /** The transactional "purge journal + mark deleted" (softDeleteUser). */
  finalizeLocalDeletion(clerkUserId: string): Promise<unknown>;
}

export async function deleteAccount(
  user: { id: string; clerkUserId: string },
  deps: AccountDeletionDeps,
): Promise<AccountDeletionResult> {
  try {
    if (await deps.hasActivePaidSubscription(user.id)) return { status: 'blocked_subscription' };
  } catch (error) {
    logStage('precheck', error);
    return { status: 'failed', stage: 'precheck' };
  }

  try {
    await deps.markDeletionPending(user.id);
  } catch (error) {
    logStage('mark_pending', error);
    return { status: 'failed', stage: 'mark_pending' };
  }

  try {
    await deps.purgeJournal(user.id);
  } catch (error) {
    logStage('journal_purge', error);
    return { status: 'pending', stage: 'journal_purge' };
  }

  try {
    await deps.deleteIdentity(user.clerkUserId);
  } catch (error) {
    logStage('identity_provider', error);
    return { status: 'pending', stage: 'identity_provider' };
  }

  try {
    await deps.finalizeLocalDeletion(user.clerkUserId);
  } catch (error) {
    logStage('local_finalisation', error);
    return { status: 'pending_cleanup' };
  }

  return { status: 'deleted' };
}

function logStage(stage: string, error: unknown): void {
  // A stage label and a short code only - never the error object, which can carry SQL and parameters.
  console.error('[account deletion] step failed', { stage, code: safeErrorCode(error) });
}

/**
 * A paid Stripe subscription that is still running and has not been set to end. App-managed trials have
 * no subscription id, so they never block. Read-only: nothing about billing is changed here.
 */
export async function hasActivePaidSubscription(userId: string): Promise<boolean> {
  const [row] = await db
    .select({
      status: entitlements.status,
      subscriptionId: entitlements.stripeSubscriptionId,
      cancelAtPeriodEnd: entitlements.cancelAtPeriodEnd,
    })
    .from(entitlements)
    .where(eq(entitlements.userId, userId))
    .limit(1);
  if (!row?.subscriptionId || row.cancelAtPeriodEnd) return false;
  return row.status === 'active' || row.status === 'trialing' || row.status === 'past_due';
}

/** Records that this member has started deleting their account. Idempotent: the first request time is kept. */
export async function markDeletionPending(userId: string): Promise<void> {
  await db
    .update(users)
    .set({
      deletionRequestedAt: sql`coalesce(${users.deletionRequestedAt}, now())`,
      updatedAt: new Date(),
    })
    .where(eq(users.id, userId));
}

/** `active` (no deletion in progress) or `pending` (started, not finished), for the member's own account. */
export async function getDeletionState(
  userId: string,
): Promise<{ status: 'active' | 'pending'; requestedAt: Date | null }> {
  const [row] = await db
    .select({ requestedAt: users.deletionRequestedAt })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);
  const requestedAt = row?.requestedAt ?? null;
  return { status: requestedAt ? 'pending' : 'active', requestedAt };
}

/** The real dependencies. Loaded lazily by the route so importing this module never touches Clerk or the database. */
export async function realAccountDeletionDeps(): Promise<AccountDeletionDeps> {
  const [{ deleteClerkUser }, { userSyncOps }] = await Promise.all([
    import('@tnsi/auth/client/server'),
    import('./user-sync-ops'),
  ]);
  return {
    hasActivePaidSubscription,
    markDeletionPending,
    purgeJournal: (userId) => purgeJournalEntries(db, userId),
    deleteIdentity: async (clerkUserId) => {
      try {
        await deleteClerkUser(clerkUserId);
      } catch (error) {
        // Already deleted in Clerk (a retry, or deleted from the Clerk dashboard) is success, not failure.
        if ((error as { status?: unknown } | null)?.status === 404) return;
        throw error;
      }
    },
    finalizeLocalDeletion: (clerkUserId) => userSyncOps.softDeleteUser(clerkUserId),
  };
}
