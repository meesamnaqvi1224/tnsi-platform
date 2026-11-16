/**
 * Member-initiated account deletion.
 *
 * Postgres, Clerk and the CRM (Flowi) are separate systems; no transaction spans them, and none is
 * assumed. So the ORDER of the steps, plus persisted state, is the safety design. A failure at any point
 * leaves a state that is safe, honestly reported, and can simply be retried:
 *
 *   0. Refuse while a paid Stripe subscription is still running (deleting the account would otherwise
 *      leave billing active with nobody able to cancel it). Read-only; changes nothing.
 *   1. MARK THE DELETION PENDING (a row in `account_deletion_requests`, first request time preserved),
 *      under the member's EXCLUSIVE journal lock. From this moment the journal is locked: every journal
 *      route refuses the member (423) and no journal write can commit. If this fails nothing has changed.
 *   2. STOP MARKETING. Cancel every CRM event still queued for the member and queue a do-not-disturb
 *      job for their CRM contact, with one immediate attempt (account-data-erasure.ts).
 *   3. Purge the member's journal (one atomic DELETE; drafts included).
 *   4. Delete the identity in Clerk. A Clerk 404 (already deleted) counts as success.
 *   5. Finalise locally in ONE transaction, under the exclusive lock (softDeleteUser): purge the journal
 *      again, delete the member's activity (check-ins, practice completions, quick reflections, saved
 *      practices, PowerDrop usage, linked assessment submissions), anonymise the account row, queue the
 *      CRM contact's deletion, and mark the account deleted.
 *   6. Delete the CRM contact: one immediate attempt at the queued job.
 *
 * What each failure leaves, and how it recovers:
 *   - step 0 / 1 fail:    nothing changed. `failed`. The member can retry.
 *   - step 2 / 3 / 4 fail: deletion is PENDING: started, not finished. The journal is locked; the member
 *                         is still signed in and can retry. Reported as `pending`, never as success.
 *   - step 5 fails:       the identity is already gone, so the member can no longer sign in.
 *                         `pending_cleanup`; the Clerk `user.deleted` webhook runs the same transaction
 *                         and Clerk retries a failing webhook, so nothing is abandoned.
 *   - step 6 not confirmed: everything in our own systems is erased, but the CRM has not confirmed the
 *                         contact is gone. `pending_cleanup`, NOT `deleted`; the job stays queued and
 *                         the outbox worker retries it. A job that gives up stays visible as `failed`.
 *
 * A retry re-runs every step: marking keeps the first request time, the suppression job is queued once,
 * purging an empty journal is a no-op, Clerk's 404 is success, the erasure finds nothing left. A retry
 * can never restore or expose anything that was deleted: nothing in this flow writes member data.
 *
 * Only `deleted` means the deletion is complete everywhere this application controls, and it is returned
 * only after every step has succeeded. What is deliberately KEPT, and why, is listed in
 * account-data-erasure.ts and docs/account-deletion-and-data-retention.md.
 * Every function here is idempotent and no step logs anything but a stage label and a short error code.
 */
import { db, entitlements } from '@tnsi/db';
import { eq } from 'drizzle-orm';
import { purgeJournalEntries } from './journal';
import { markDeletionPending, getDeletionState } from './deletion-state';
import { safeErrorCode } from './private-response';

// Re-exported so the account route and its tests keep one import point for deletion state.
export { markDeletionPending, getDeletionState };

export type AccountDeletionStage =
  'precheck' | 'mark_pending' | 'crm_suppression' | 'journal_purge' | 'identity_provider';

export type AccountDeletionResult =
  /** Every step succeeded. The only complete state. */
  | { status: 'deleted' }
  /**
   * The identity is deleted, but something is still being finished in the background: the local
   * finalisation (completed by the Clerk webhook retry) or the CRM contact's deletion (completed by the
   * outbox worker). Never reported as `deleted`.
   */
  | { status: 'pending_cleanup' }
  | { status: 'blocked_subscription' }
  /** Nothing was changed (the pre-check or the pending marker failed). Safe to retry. */
  | { status: 'failed'; stage: 'precheck' | 'mark_pending' }
  /** Deletion has STARTED but not finished: the journal is locked. Safe to retry. */
  | { status: 'pending'; stage: 'crm_suppression' | 'journal_purge' | 'identity_provider' };

export interface AccountDeletionDeps {
  hasActivePaidSubscription(userId: string): Promise<boolean>;
  /** Idempotent: records that deletion started, preserving the first request time. */
  markDeletionPending(userId: string): Promise<unknown>;
  /**
   * Stops marketing: cancels queued CRM events and durably queues the do-not-disturb job. Must throw
   * only when that could not be recorded - a slow or unavailable CRM is not a failure here.
   */
  suppressMarketing(userId: string): Promise<unknown>;
  purgeJournal(userId: string): Promise<unknown>;
  /** Deletes the identity. Must resolve when the identity is already gone. */
  deleteIdentity(clerkUserId: string): Promise<void>;
  /** The transactional "purge journal + erase activity + anonymise + mark deleted" (softDeleteUser). */
  finalizeLocalDeletion(clerkUserId: string): Promise<unknown>;
  /** Attempts the queued CRM contact deletion. True only when it is confirmed done. */
  completeCrmDeletion(userId: string): Promise<boolean>;
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
    await deps.suppressMarketing(user.id);
  } catch (error) {
    logStage('crm_suppression', error);
    return { status: 'pending', stage: 'crm_suppression' };
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

  try {
    // Not confirmed is not complete: the member's data is erased here, but the CRM still holds a contact.
    if (!(await deps.completeCrmDeletion(user.id))) return { status: 'pending_cleanup' };
  } catch (error) {
    logStage('crm_deletion', error);
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

/** The real dependencies. Loaded lazily by the route so importing this module never touches Clerk or the database. */
export async function realAccountDeletionDeps(): Promise<AccountDeletionDeps> {
  const [{ deleteClerkUser }, { userSyncOps }, erasure] = await Promise.all([
    import('@tnsi/auth/client/server'),
    import('./user-sync-ops'),
    import('./account-data-erasure'),
  ]);
  return {
    hasActivePaidSubscription,
    markDeletionPending,
    suppressMarketing: (userId) => erasure.suppressMarketing(userId),
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
    completeCrmDeletion: (userId) => erasure.completeCrmDeletion(userId),
  };
}
