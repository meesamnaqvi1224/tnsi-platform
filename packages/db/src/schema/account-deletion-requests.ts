import { pgTable, uuid, timestamp } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { users } from './users';

/**
 * Records that a member has started deleting their own account (DELETE /api/v1/me/account), and when.
 * While a row exists for a member the account is in the "deletion pending" state: a pending member can
 * still sign in and retry the deletion, but their private journal is locked (every journal route
 * refuses them) so a deletion that stalls half-way can never leave their writing accessible.
 *
 * Deliberately its OWN table rather than a column on `users`. Every authenticated request reads `users`
 * (`select *`), so a new `users` column would make a deployment that runs ahead of its migration fail
 * EVERY sign-in. As a separate table it is read only by the journal and account-deletion routes, so
 * code that reaches a database before migration 0014 has been applied can only fail on those routes.
 *
 * One row per member, first request time kept (`ON CONFLICT DO NOTHING`). It is not `users.deleted_at`:
 * deletion-pending is reversible-by-completion, "deleted" is final. The row cascades away if the user
 * row is ever hard-deleted; on a soft delete (the normal case) it stays as the record of when the member
 * asked.
 */
export const accountDeletionRequests = pgTable('account_deletion_requests', {
  userId: uuid('user_id')
    .primaryKey()
    .references(() => users.id, { onDelete: 'cascade' }),

  requestedAt: timestamp('requested_at', { withTimezone: true })
    .notNull()
    .default(sql`now()`),
});

export type AccountDeletionRequest = typeof accountDeletionRequests.$inferSelect;
