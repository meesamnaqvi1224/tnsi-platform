/**
 * The account-deletion "pending" marker: one row per member in `account_deletion_requests`, written when
 * the member starts deleting their account and kept (first request time preserved).
 *
 * This is deliberately its own table and its own module. The authentication path never reads it, so a
 * deployment that reaches a database before migration 0014 cannot break sign-in; only the journal and
 * account-deletion routes (the only readers) can fail, and they fail closed. See
 * packages/db/src/schema/account-deletion-requests.ts.
 */
import { db, accountDeletionRequests } from '@tnsi/db';
import { eq } from 'drizzle-orm';

/** Records that this member has started deleting their account. Idempotent: the first request time is kept. */
export async function markDeletionPending(userId: string): Promise<void> {
  await db.insert(accountDeletionRequests).values({ userId }).onConflictDoNothing();
}

/** `active` (no deletion in progress) or `pending` (started, not finished), for the member's own account. */
export async function getDeletionState(
  userId: string,
): Promise<{ status: 'active' | 'pending'; requestedAt: Date | null }> {
  const [row] = await db
    .select({ requestedAt: accountDeletionRequests.requestedAt })
    .from(accountDeletionRequests)
    .where(eq(accountDeletionRequests.userId, userId))
    .limit(1);
  const requestedAt = row?.requestedAt ?? null;
  return { status: requestedAt ? 'pending' : 'active', requestedAt };
}

/** True while this member's account deletion has started and not finished. */
export async function isDeletionPending(userId: string): Promise<boolean> {
  return (await getDeletionState(userId)).status === 'pending';
}
