import {
  pgTable,
  uuid,
  text,
  integer,
  date,
  timestamp,
  jsonb,
  boolean,
  uniqueIndex,
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

    completedDate: date('completed_date', { mode: 'date' }).notNull(),

    /**
     * Whether this is the member's primary check-in for `completedDate` - the first one of that day,
     * the only one that drives the daily recommendation and Home's "checked in today" state. Any
     * further check-in the same day is its own row with `isPrimary = false`: kept in history, never
     * replacing the primary. At most one primary per member per day is enforced by the partial
     * unique index below. Defaults to true so rows (and writers) from before this column existed
     * are primary, which is exactly what they were: the old unique(user, date) allowed only one.
     */
    isPrimary: boolean('is_primary').notNull().default(true),

    metadata: jsonb('metadata').$type<Record<string, unknown>>().notNull().default({}),

    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    uniqueCheckInsPrimaryUserDate: uniqueIndex('unique_check_ins_primary_user_date')
      .on(table.userId, table.completedDate)
      .where(sql`${table.isPrimary}`),
    idxCheckInsUserDate: index('idx_check_ins_user_date').on(table.userId, table.completedDate),
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
