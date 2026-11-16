import { pgTable, uuid, text, timestamp, index, check } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { users } from './users';
import { practices } from './practices';
import { practiceCompletions } from './practice-completions';
import { journalEntryStatusEnum, journalEntryTypeEnum } from './enums';

/**
 * The five Human Expansion Theory conditions, exactly as the app names them
 * (apps/mobile/src/content/human-expansion-theory.ts `CONDITION_NAMES`). A different taxonomy from the
 * capacity-routing `practices.category` that drives the daily recommendation; this column never feeds it.
 * Kept as a CHECK on a text column rather than a Postgres enum so a future change to the framework is a
 * constraint swap, not an `ALTER TYPE`.
 */
export const JOURNAL_THEORY_CONDITIONS = [
  'Safety',
  'Capacity',
  'Availability',
  'Expansion',
  'Participation',
] as const;

/** Hard limits, mirrored in the CHECK constraints below and in the API validation (apps/web/src/lib/validation.ts). */
export const JOURNAL_TITLE_MAX = 200;
export const JOURNAL_CONTENT_MAX = 20_000;
export const JOURNAL_PROMPT_TEXT_MAX = 2_000;

/**
 * A member's private journal entry (My Reflections). Deliberately its own table and its own domain:
 *
 * - It is NOT `practice_reflections`. That table is the lightweight post-practice check-out (a feeling
 *   pill plus a short note, one per practice session) and stays exactly as it is. A journal entry is
 *   free-form writing that may or may not be about a practice.
 * - It is independent of check-ins, the daily recommendation, practice completion, Human Expansion
 *   Theory status and every progress metric. Nothing reads this table to decide what a member is shown.
 *
 * Privacy: the text here is the most sensitive data in the product. It is only ever read or written
 * through routes that scope every query to the authenticated member (apps/web/src/lib/journal.ts); it
 * is never logged, never sent to analytics or the CRM, and is purged when the account is deleted (the
 * `user_id` cascade covers a hard delete; the Clerk `user.deleted` path, which only soft-deletes the
 * user row, deletes these rows explicitly - see softDeleteUser in apps/web/src/lib/user-sync-ops.ts).
 *
 * Lifecycle: an entry starts as a `draft` (autosave target, never shown in history) and becomes `saved`
 * when the member saves it. A saved entry never goes back to draft - enforced in the API and, as a
 * backstop, by the `journal_entries_guard_update` trigger in the migration (which also keeps `created_at` and
 * the owner immutable). drizzle-kit does not emit CHECKs or triggers, so both live as hand-written SQL in 0014.
 *
 * `created_at` is when the writing began and never changes; `updated_at` moves on every edit.
 */
export const journalEntries = pgTable(
  'journal_entries',
  {
    /** Client-supplied on create (retry-safe, idempotent creation), otherwise generated. */
    id: uuid('id')
      .primaryKey()
      .default(sql`gen_random_uuid()`),

    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),

    title: text('title'),

    /** Empty while a draft is being started; a saved entry always has text (see the CHECK below). */
    content: text('content').notNull().default(''),

    status: journalEntryStatusEnum('status').notNull().default('draft'),

    entryType: journalEntryTypeEnum('entry_type').notNull().default('independent'),

    /** Sanity document id of the prompt shown when writing. Plain text, not a foreign key: prompts live in the CMS. */
    promptId: text('prompt_id'),

    /** The prompt wording as it was when written, so the entry still reads correctly if the prompt is later edited or unpublished. */
    promptText: text('prompt_text'),

    /** Nullable, and SET NULL (not cascade): removing a practice must never delete a member's writing. */
    practiceId: uuid('practice_id').references(() => practices.id, { onDelete: 'set null' }),

    /** The specific practice session this entry was written about, when launched from one. SET NULL for the same reason. */
    completionId: uuid('completion_id').references(() => practiceCompletions.id, {
      onDelete: 'set null',
    }),

    theoryCondition: text('theory_condition'),

    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),

    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    // "This member's saved entries, newest first" - the history list. Partial: drafts are never listed there.
    idxJournalEntriesUserSaved: index('idx_journal_entries_user_saved')
      .on(table.userId, table.createdAt.desc(), table.id.desc())
      .where(sql`${table.status} = 'saved'`),
    // "This member's drafts" - finding the draft to resume. Partial: a small slice of the table.
    idxJournalEntriesUserDraft: index('idx_journal_entries_user_draft')
      .on(table.userId, table.updatedAt.desc())
      .where(sql`${table.status} = 'draft'`),
    titleLength: check(
      'journal_entries_title_length',
      sql`${table.title} IS NULL OR char_length(${table.title}) <= ${sql.raw(String(JOURNAL_TITLE_MAX))}`,
    ),
    contentLength: check(
      'journal_entries_content_length',
      sql`char_length(${table.content}) <= ${sql.raw(String(JOURNAL_CONTENT_MAX))}`,
    ),
    promptTextLength: check(
      'journal_entries_prompt_text_length',
      sql`${table.promptText} IS NULL OR char_length(${table.promptText}) <= ${sql.raw(String(JOURNAL_PROMPT_TEXT_MAX))}`,
    ),
    // A saved entry has something in it; only a draft may be empty.
    savedHasContent: check(
      'journal_entries_saved_has_content',
      sql`${table.status} = 'draft' OR char_length(btrim(${table.content})) > 0`,
    ),
    theoryConditionValid: check(
      'journal_entries_theory_condition_valid',
      sql`${table.theoryCondition} IS NULL OR ${table.theoryCondition} IN (${sql.raw(
        JOURNAL_THEORY_CONDITIONS.map((c) => `'${c}'`).join(', '),
      )})`,
    ),
  }),
);

export type JournalEntry = typeof journalEntries.$inferSelect;
export type NewJournalEntry = typeof journalEntries.$inferInsert;
