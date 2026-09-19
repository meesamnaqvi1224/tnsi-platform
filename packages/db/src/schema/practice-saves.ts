import { pgTable, uuid, timestamp, unique, index } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { users } from './users';
import { practices } from './practices';

/**
 * A member's personal bookmark of a practice they want to easily return
 * to - a pure relationship row, no duplicated practice metadata (title,
 * media, duration, etc. always come from `practices`, the one source of
 * truth for that). `unique(userId, practiceId)` is the actual save/unsave
 * model: a row existing means "currently saved," removing it means
 * "unsaved" - there is no history of past saves/unsaves to keep, unlike
 * `practice_completions`'s deliberate multi-row session history. No
 * streak, count, or ordering column - saving is a simple on/off toggle,
 * not a ranked collection.
 */
export const practiceSaves = pgTable(
  'practice_saves',
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

    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    uniquePracticeSavesUserPractice: unique('unique_practice_saves_user_practice').on(
      table.userId,
      table.practiceId,
    ),
    idxPracticeSavesUserCreated: index('idx_practice_saves_user_created').on(
      table.userId,
      table.createdAt,
    ),
  }),
);

export type PracticeSave = typeof practiceSaves.$inferSelect;
export type NewPracticeSave = typeof practiceSaves.$inferInsert;
