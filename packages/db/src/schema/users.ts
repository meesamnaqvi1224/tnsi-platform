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

    metadata: jsonb('metadata').notNull().default('{}'),

    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),

    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    uniqueUsersClerkUserId: unique('unique_users_clerk_user_id').on(table.clerkUserId),
    idxUsersEmail: index('idx_users_email').on(table.email),
  }),
);

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
