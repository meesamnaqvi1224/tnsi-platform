import {
  pgTable,
  uuid,
  real,
  integer,
  boolean,
  timestamp,
  jsonb,
  unique,
  index,
  check,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { users } from './users';
import { practices } from './practices';

export const practiceCompletions = pgTable(
  'practice_completions',
  {
    id: uuid('id')
      .primaryKey()
      .default(sql`gen_random_uuid()`),

    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),

    practiceId: uuid('practice_id')
      .notNull()
      .references(() => practices.id, { onDelete: 'cascade' }),

    progressPct: real('progress_pct').notNull().default(0),

    positionSeconds: integer('position_seconds').notNull().default(0),

    completed: boolean('completed').notNull().default(false),

    completedAt: timestamp('completed_at', { withTimezone: true }),

    lastPlayedAt: timestamp('last_played_at', { withTimezone: true }).notNull().defaultNow(),

    playCount: integer('play_count').notNull().default(0),

    metadata: jsonb('metadata').notNull().default('{}'),

    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),

    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    uniquePcUserPractice: unique('unique_practice_completions_user_practice').on(
      table.userId,
      table.practiceId,
    ),
    idxPcUserCompleted: index('idx_practice_completions_user_completed').on(
      table.userId,
      table.completed,
    ),
    idxPcUserLastPlayed: index('idx_practice_completions_user_last_played').on(
      table.userId,
      table.lastPlayedAt,
    ),
    progressPctRange: check(
      'practice_completions_progress_pct_range',
      sql`${table.progressPct} BETWEEN 0 AND 1`,
    ),
  }),
);

export type PracticeCompletion = typeof practiceCompletions.$inferSelect;
export type NewPracticeCompletion = typeof practiceCompletions.$inferInsert;
