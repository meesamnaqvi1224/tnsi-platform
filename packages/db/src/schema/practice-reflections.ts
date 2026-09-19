import { pgTable, uuid, text, timestamp, unique } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { users } from './users';
import { practices } from './practices';
import { practiceCompletions } from './practice-completions';
import { postPracticeResponseEnum } from './enums';

/**
 * A member's optional post-practice reflection - deliberately a separate
 * table from `practice_completions` rather than nullable columns bolted
 * onto it. Two reasons:
 *
 * 1. `practice_completions` is a live progress-tracking row (progressPct,
 *    positionSeconds, playCount all change on every play/pause); a
 *    reflection is a one-time, deliberate write after the member has
 *    already finished. Keeping them apart means saving a reflection can
 *    never touch - or be blocked by - the completion record, and a failed
 *    reflection save can never lose an already-recorded completion.
 * 2. It reads (and writes) independently: `GET /api/v1/practices/[id]`
 *    already returns `progress` from `practice_completions`; this table
 *    is looked up the same way and merged in as its own `reflection` key,
 *    never mutating the completion row itself.
 *
 * `completionId` (not `userId`+`practiceId` alone) is what a reflection
 * actually belongs to, now that `practice_completions` supports real
 * Practice History (one row per session, not one row per member+practice -
 * see that table's own comment). A reflection is written *about* one
 * specific session, so two sessions of the same practice can carry two
 * different reflections instead of the second silently overwriting the
 * first (see AUDIT_REPORT.md for the migration that moved this table off
 * its old `unique(userId, practiceId)` shape).
 *
 * `completionId` is nullable, not `.notNull()`, for one narrow reason:
 * this table pre-dates the session model, and this repo's migration
 * discipline never invents a completion record to backfill an orphaned
 * row into (see the migration's own comment) - a handful of pre-migration
 * reflections could in principle have no matching completion and would
 * otherwise block the migration or need fabricated data. Every reflection
 * written going forward always sets it (see POST .../reflection, which
 * now requires a real `completionId` in its request body). `userId`/
 * `practiceId` stay on this row too, redundant with the referenced
 * completion's own, purely so an old orphaned row (if any) still says who
 * and what it was about even with no session to point to.
 */
export const practiceReflections = pgTable(
  'practice_reflections',
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

    /** The specific session this reflection is about. See this file's own comment for why this is nullable rather than `.notNull()`. */
    completionId: uuid('completion_id').references(() => practiceCompletions.id, {
      onDelete: 'cascade',
    }),

    /** Purely self-reported, never interpreted - see postPracticeResponseEnum. Nullable: a member can save free-text without picking one. */
    response: postPracticeResponseEnum('response'),

    /** Free text, "What did you notice?" - nullable: a member can pick a response without writing anything, or write nothing at all and just skip. */
    reflection: text('reflection'),

    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),

    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    // One reflection per session, not per member+practice - lets two
    // sessions of the same practice carry two different reflections. Only
    // enforced while `completionId` is set; Postgres treats NULL as
    // distinct from any other NULL in a unique constraint, so any
    // pre-migration orphaned rows (completionId left null) don't collide
    // with each other or with real ones.
    uniquePrCompletion: unique('unique_practice_reflections_completion').on(table.completionId),
  }),
);

export type PracticeReflection = typeof practiceReflections.$inferSelect;
export type NewPracticeReflection = typeof practiceReflections.$inferInsert;
