/**
 * My Reflections: a member's private journal. Every function takes the authenticated member's id and
 * scopes EVERY query by it - the id of an entry from a client is only ever a lookup key inside that
 * scope, never proof of ownership - so a member can never read, change or delete another member's
 * writing, including by guessing ids. A row that exists but is someone else's is indistinguishable from
 * one that does not exist.
 *
 * Nothing in here reads check-ins, recommendations or practice completion state to decide anything, and
 * nothing writes outside `journal_entries`. The text is never logged: this module has no logging at all.
 */
import { db, journalEntries, practices, practiceCompletions } from '@tnsi/db';
import { and, desc, eq, sql } from 'drizzle-orm';
import { paginateRows } from './practice-sessions';
import { buildPreview } from './journal-preview';
import type { JournalEntryCreateInput, JournalEntryUpdateInput } from './validation';

type JournalRow = typeof journalEntries.$inferSelect;

/** The database, or a transaction on it - for the one operation (the account purge) that joins another. */
export type DbOrTransaction = typeof db | Parameters<Parameters<typeof db.transaction>[0]>[0];

/** How much of the text the list query pulls per row: enough to build a 200-character preview, far less than the full 20,000. */
const PREVIEW_SOURCE_CHARS = 600;

/** A saved or draft entry as the API returns it. Never includes the owner's id. */
export interface JournalEntryDto {
  id: string;
  title: string | null;
  content: string;
  status: 'draft' | 'saved';
  entryType: 'independent' | 'guided' | 'practice' | 'theory';
  promptId: string | null;
  promptText: string | null;
  practiceId: string | null;
  completionId: string | null;
  theoryCondition: string | null;
  createdAt: Date;
  updatedAt: Date;
}

/** A row in the history list: a short preview instead of the full text. */
export interface JournalEntryListItem {
  id: string;
  title: string | null;
  preview: string;
  /** True when the entry has more text than the preview shows. */
  previewTruncated: boolean;
  status: 'draft' | 'saved';
  entryType: JournalEntryDto['entryType'];
  practiceId: string | null;
  completionId: string | null;
  theoryCondition: string | null;
  createdAt: Date;
  updatedAt: Date;
}

function toDto(row: JournalRow): JournalEntryDto {
  return {
    id: row.id,
    title: row.title,
    content: row.content,
    status: row.status,
    entryType: row.entryType,
    promptId: row.promptId,
    promptText: row.promptText,
    practiceId: row.practiceId,
    completionId: row.completionId,
    theoryCondition: row.theoryCondition,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export async function listJournalEntries(
  userId: string,
  { limit, offset, status }: { limit: number; offset: number; status: 'draft' | 'saved' },
): Promise<{ entries: JournalEntryListItem[]; hasMore: boolean }> {
  const rows = await db
    .select({
      id: journalEntries.id,
      title: journalEntries.title,
      status: journalEntries.status,
      entryType: journalEntries.entryType,
      practiceId: journalEntries.practiceId,
      completionId: journalEntries.completionId,
      theoryCondition: journalEntries.theoryCondition,
      createdAt: journalEntries.createdAt,
      updatedAt: journalEntries.updatedAt,
      previewSource: sql<string>`left(${journalEntries.content}, ${PREVIEW_SOURCE_CHARS})`,
      contentLength: sql<number>`char_length(${journalEntries.content})`,
    })
    .from(journalEntries)
    .where(and(eq(journalEntries.userId, userId), eq(journalEntries.status, status)))
    // The history is newest-first by when the writing BEGAN (created_at), id as a stable tie-break so
    // no entry repeats or is skipped across pages. A member's drafts are ordered by last touched.
    .orderBy(
      ...(status === 'saved'
        ? [desc(journalEntries.createdAt), desc(journalEntries.id)]
        : [desc(journalEntries.updatedAt), desc(journalEntries.id)]),
    )
    .limit(limit + 1)
    .offset(offset);

  const { page, hasMore } = paginateRows(rows, limit);
  return {
    hasMore,
    entries: page.map(({ previewSource, contentLength, ...rest }) => {
      const { preview, truncated } = buildPreview(previewSource, Number(contentLength));
      return { ...rest, preview, previewTruncated: truncated };
    }),
  };
}

export async function getJournalEntry(userId: string, id: string): Promise<JournalEntryDto | null> {
  const [row] = await db
    .select()
    .from(journalEntries)
    .where(and(eq(journalEntries.id, id), eq(journalEntries.userId, userId)))
    .limit(1);
  return row ? toDto(row) : null;
}

export type CreateJournalResult =
  | { kind: 'created'; entry: JournalEntryDto }
  /** The same client id was already created by this member: that entry is returned unchanged (first write wins). */
  | { kind: 'replayed'; entry: JournalEntryDto }
  /** A referenced practice or session is not this member's to link to. Indistinguishable from "does not exist". */
  | { kind: 'reference_not_found' }
  /** `completionId` belongs to a different practice than `practiceId`. */
  | { kind: 'reference_mismatch' }
  /** The client id is taken by someone else's entry. Reported exactly like a missing one. */
  | { kind: 'not_found' };

export async function createJournalEntry(
  userId: string,
  input: JournalEntryCreateInput,
): Promise<CreateJournalResult> {
  let practiceId = input.practiceId ?? null;
  const completionId = input.completionId ?? null;

  // A link must be real and, for a practice session, the member's own - never trusted from the client.
  if (completionId) {
    const [completion] = await db
      .select({ id: practiceCompletions.id, practiceId: practiceCompletions.practiceId })
      .from(practiceCompletions)
      .where(and(eq(practiceCompletions.id, completionId), eq(practiceCompletions.userId, userId)))
      .limit(1);
    if (!completion) return { kind: 'reference_not_found' };
    if (practiceId && practiceId !== completion.practiceId) return { kind: 'reference_mismatch' };
    practiceId = completion.practiceId;
  } else if (practiceId) {
    const [practice] = await db
      .select({ id: practices.id })
      .from(practices)
      .where(eq(practices.id, practiceId))
      .limit(1);
    if (!practice) return { kind: 'reference_not_found' };
  }

  const values = {
    ...(input.id ? { id: input.id } : {}),
    userId, // always the authenticated member - never read from the request body
    title: input.title ?? null,
    content: input.content,
    status: input.status,
    entryType: input.entryType,
    promptId: input.promptId ?? null,
    promptText: input.promptText ?? null,
    practiceId,
    completionId,
    theoryCondition: input.theoryCondition ?? null,
  };

  const [inserted] = await db
    .insert(journalEntries)
    .values(values)
    .onConflictDoNothing({ target: journalEntries.id })
    .returning();
  if (inserted) return { kind: 'created', entry: toDto(inserted) };

  // Only reachable with a client-supplied id that already exists.
  const existing = input.id ? await getJournalEntry(userId, input.id) : null;
  return existing ? { kind: 'replayed', entry: existing } : { kind: 'not_found' };
}

export type UpdateJournalResult =
  | { kind: 'updated'; entry: JournalEntryDto }
  | { kind: 'not_found' }
  /** A saved entry was asked to become a draft again. Never allowed. */
  | { kind: 'revert_refused' }
  /** The result would be a saved entry with no text. */
  | { kind: 'empty_saved' };

export async function updateJournalEntry(
  userId: string,
  id: string,
  patch: JournalEntryUpdateInput,
): Promise<UpdateJournalResult> {
  // One retry: the guarded UPDATE below can lose a race with a concurrent save of the same entry.
  for (let attempt = 0; attempt < 2; attempt += 1) {
    const [current] = await db
      .select()
      .from(journalEntries)
      .where(and(eq(journalEntries.id, id), eq(journalEntries.userId, userId)))
      .limit(1);
    if (!current) return { kind: 'not_found' };

    if (patch.status === 'draft' && current.status === 'saved') return { kind: 'revert_refused' };

    const nextStatus = patch.status ?? current.status;
    const nextContent = patch.content ?? current.content;
    if (nextStatus === 'saved' && nextContent.trim().length === 0) return { kind: 'empty_saved' };

    const [updated] = await db
      .update(journalEntries)
      .set({
        updatedAt: new Date(), // created_at is never set here, and the database trigger pins it anyway
        ...(patch.title !== undefined ? { title: patch.title } : {}),
        ...(patch.content !== undefined ? { content: patch.content } : {}),
        status: nextStatus,
      })
      .where(
        and(
          eq(journalEntries.id, id),
          eq(journalEntries.userId, userId),
          // Only update the row we reasoned about; if it changed underneath us, look again.
          eq(journalEntries.status, current.status),
        ),
      )
      .returning();
    if (updated) return { kind: 'updated', entry: toDto(updated) };
  }
  return { kind: 'not_found' };
}

/** Deletes one of the member's own entries. False when there is no such entry for them. */
export async function deleteJournalEntry(userId: string, id: string): Promise<boolean> {
  const deleted = await db
    .delete(journalEntries)
    .where(and(eq(journalEntries.id, id), eq(journalEntries.userId, userId)))
    .returning({ id: journalEntries.id });
  return deleted.length > 0;
}

/**
 * Permanently deletes every journal entry a member has - drafts and saved. Idempotent (zero rows is
 * fine). Takes the executor so the account-deletion path can run it inside the same transaction as the
 * user's soft delete (see softDeleteUser in user-sync-ops.ts).
 */
export async function purgeJournalEntries(
  executor: DbOrTransaction,
  userId: string,
): Promise<number> {
  const removed = await executor
    .delete(journalEntries)
    .where(eq(journalEntries.userId, userId))
    .returning({ id: journalEntries.id });
  return removed.length;
}
