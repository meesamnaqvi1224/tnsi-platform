/**
 * The account-deletion "pending" marker: one row per member in `account_deletion_requests`, written when
 * the member starts deleting their account and kept (first request time preserved).
 *
 * This is deliberately its own table and its own module. The authentication path never reads it, so a
 * deployment that reaches a database before migration 0014 cannot break sign-in; only the journal and
 * account-deletion routes (the only readers) can fail, and they fail closed. See
 * packages/db/src/schema/account-deletion-requests.ts.
 */
import { db, accountDeletionRequests, users } from '@tnsi/db';
import { eq, sql } from 'drizzle-orm';

/** A transaction on the database. */
export type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

/** Thrown when a member whose account deletion has started (or finished) tries to write to the journal. */
export class AccountDeletionPendingError extends Error {
  constructor() {
    super('ACCOUNT_DELETION_PENDING');
    this.name = 'AccountDeletionPendingError';
  }
}

/**
 * THE JOURNAL / ACCOUNT-DELETION LOCK (see docs/my-reflections-backend.md, "Concurrency").
 *
 * One transaction-scoped PostgreSQL advisory lock per member, keyed by a hash of the member's id:
 *   - every journal WRITE (create, edit, delete) takes it SHARED, before it checks the deletion state and
 *     before it touches a row, and holds it until its own transaction commits or rolls back;
 *   - account deletion takes it EXCLUSIVE before it writes the pending marker, and softDeleteUser takes it
 *     EXCLUSIVE before its final purge.
 * A shared and an exclusive holder of the same key exclude each other, so a writer is either completely
 * committed before deletion's barrier exists (and the purge then removes it) or it starts after the
 * barrier is committed and sees it. Writers do not block each other, and other members' keys differ, so
 * nothing unrelated waits. Advisory xact locks live on the database server, so this holds across any
 * number of application instances and connections, and they are released automatically at COMMIT/ROLLBACK
 * (nothing can leak a lock). `hashtextextended` gives 64 bits; a collision would only make two members
 * briefly wait for each other, never skip a lock.
 */
const lockKey = (userId: string) => sql`hashtextextended(${`tnsi:journal:${userId}`}::text, 0)`;

/** Journal writers: shared. Call first thing inside the transaction. */
export async function lockJournalShared(tx: Tx, userId: string): Promise<void> {
  await tx.execute(sql`select pg_advisory_xact_lock_shared(${lockKey(userId)})`);
}

/** Account deletion / final purge: exclusive. Call first thing inside the transaction. */
export async function lockJournalExclusive(tx: Tx, userId: string): Promise<void> {
  await tx.execute(sql`select pg_advisory_xact_lock(${lockKey(userId)})`);
}

/**
 * Inside a transaction that already holds the shared lock: refuses the write if the member's deletion
 * has started (marker row) or finished (users.deleted_at set, including a Clerk-dashboard deletion that
 * never wrote a marker) or the user row is gone. Reads committed data, so it sees any barrier that
 * committed before the lock was granted.
 */
export async function assertJournalWritable(tx: Tx, userId: string): Promise<void> {
  const [row] = await tx
    .select({
      pending: sql<boolean>`exists (select 1 from ${accountDeletionRequests} where ${accountDeletionRequests.userId} = ${userId})`,
      gone: sql<boolean>`(${users.deletedAt} is not null)`,
    })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);
  if (!row || row.pending || row.gone) throw new AccountDeletionPendingError();
}

/**
 * Records that this member has started deleting their account. Idempotent: the first request time is kept.
 * The marker is written under the EXCLUSIVE lock, so by the time it commits every journal write that was
 * already running has committed (the purge that follows removes it) and none can start afterwards.
 */
export async function markDeletionPending(userId: string): Promise<void> {
  await db.transaction(async (tx) => {
    await lockJournalExclusive(tx, userId);
    await tx.insert(accountDeletionRequests).values({ userId }).onConflictDoNothing();
  });
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
