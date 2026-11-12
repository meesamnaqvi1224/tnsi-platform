import { pgTable, uuid, text, jsonb, timestamp, unique, index } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';

export const users = pgTable(
  'users',
  {
    id: uuid('id')
      .primaryKey()
      .default(sql`gen_random_uuid()`),

    clerkUserId: text('clerk_user_id').notNull(),

    email: text('email').notNull(),

    fullName: text('full_name'),

    avatarUrl: text('avatar_url'),

    metadata: jsonb('metadata').$type<Record<string, unknown>>().notNull().default({}),

    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),

    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),

    deletedAt: timestamp('deleted_at', { withTimezone: true }),

    /**
     * Set when the member starts deleting their own account (DELETE /api/v1/me/account) and kept until
     * the deletion completes. While it is set the account is in a "deletion pending" state: the member's
     * private journal can no longer be read, written or recreated, so a deletion that stalls half-way
     * (for example the identity provider is down) can never leave their writing accessible. It is NOT
     * `deleted_at`: a pending member can still sign in and retry the deletion, whereas a deleted one
     * cannot. Never cleared by a retry; the first request time is preserved.
     */
    deletionRequestedAt: timestamp('deletion_requested_at', { withTimezone: true }),
  },
  (table) => ({
    uniqueUsersClerkUserId: unique('unique_users_clerk_user_id').on(table.clerkUserId),
    idxUsersEmail: index('idx_users_email').on(table.email),
  }),
);

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
