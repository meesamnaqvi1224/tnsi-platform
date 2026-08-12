import {
  pgTable,
  uuid,
  text,
  integer,
  date,
  timestamp,
  jsonb,
  unique,
  index,
  check,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { users } from './users';

export const checkIns = pgTable(
  'check_ins',
  {
    id: uuid('id')
      .primaryKey()
      .default(sql`gen_random_uuid()`),

    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),

    moodScore: integer('mood_score').notNull(),

    capacityScore: integer('capacity_score').notNull(),

    notes: text('notes'),

    completedAt: timestamp('completed_at', { withTimezone: true }).notNull(),

    completedDate: date('completed_date').notNull(),

    metadata: jsonb('metadata').notNull().default('{}'),

    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    uniqueCheckInsUserDate: unique('unique_check_ins_user_date').on(
      table.userId,
      table.completedDate,
    ),
    idxCheckInsUserCreated: index('idx_check_ins_user_created').on(table.userId, table.createdAt),
    moodScoreRange: check('check_ins_mood_score_range', sql`${table.moodScore} BETWEEN 1 AND 5`),
    capacityScoreRange: check(
      'check_ins_capacity_score_range',
      sql`${table.capacityScore} BETWEEN 1 AND 5`,
    ),
  }),
);

export type CheckIn = typeof checkIns.$inferSelect;
export type NewCheckIn = typeof checkIns.$inferInsert;
