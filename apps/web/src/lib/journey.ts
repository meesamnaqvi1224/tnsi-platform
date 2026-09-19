/**
 * My Journey: this member's own recorded activity - completed practice
 * sessions and daily check-ins - merged into one chronological timeline.
 * Purely a presentation/aggregation layer over existing tables
 * (`practice_completions`, `practices`, `practice_reflections`,
 * `check_ins`): no new table, no derived score, nothing computed beyond
 * "what did this member actually do and record."
 *
 * Practices and check-ins are two different tables with no shared date
 * column, so getting one correctly-paginated merged sequence (no
 * duplicate or skipped record across a page boundary - see
 * getPracticeHistory's single-source version of this same convention)
 * needs the ordering and LIMIT/OFFSET done in one SQL statement, not two
 * independently-paginated lists merged in application code. Hence the raw
 * `UNION ALL` below rather than two calls to getPracticeHistory /
 * getCheckInHistory - this is the "one appropriately joined/aggregated
 * query" the Practice History precedent already established the pattern
 * for.
 */
import { db, practiceReflections } from '@tnsi/db';
import { sql, inArray } from 'drizzle-orm';
import { paginateRows } from './practice-sessions';
import { mapJourneyRow, type JourneyEntry, type JourneyRawRow } from './journey-presentation';

export type {
  JourneyEntry,
  PracticeJourneyEntry,
  CheckInJourneyEntry,
} from './journey-presentation';

/**
 * This member's own activity, newest first - completed practice sessions
 * (never in-progress ones: an unfinished session has no fixed "date it
 * happened," since `lastPlayedAt` keeps moving every time they resume, so
 * it doesn't read as a journal entry) and daily check-ins. Scoped
 * exclusively to `userId` - never accepts one from a caller; both halves
 * of the union filter on it directly, and the reflection lookup that
 * follows only ever looks up completions already confirmed to belong to
 * this user by the first query, so a reflection can never leak across
 * users here.
 *
 * Deliberately does NOT filter on `practices.is_published` - same
 * reasoning as getPracticeHistory: a member's own timeline of what they
 * actually did shouldn't vanish just because a practice was later
 * unpublished. (check_ins have no publish concept at all.)
 */
export async function getJourneyEntries(
  userId: string,
  limit: number,
  offset: number,
): Promise<{ entries: JourneyEntry[]; hasMore: boolean }> {
  const rawRows = (await db.execute(sql`
    select * from (
      select
        'practice'::text as kind,
        pc.id::text as "entryId",
        pc.completed_at as "occurredAt",
        p.id::text as "practiceId",
        p.title as "practiceTitle",
        p.content_type::text as "practiceContentType",
        p.category as "practiceCategory",
        p.duration_seconds as "practiceDurationSeconds",
        null::int as "moodScore",
        null::int as "capacityScore",
        null::text as notes
      from practice_completions pc
      inner join practices p on p.id = pc.practice_id
      where pc.user_id = ${userId} and pc.completed = true

      union all

      select
        'check_in'::text as kind,
        ci.id::text as "entryId",
        ci.completed_at as "occurredAt",
        null::text as "practiceId",
        null::text as "practiceTitle",
        null::text as "practiceContentType",
        null::text as "practiceCategory",
        null::int as "practiceDurationSeconds",
        ci.mood_score as "moodScore",
        ci.capacity_score as "capacityScore",
        ci.notes as notes
      from check_ins ci
      where ci.user_id = ${userId}
    ) combined
    order by "occurredAt" desc, "entryId" desc
    limit ${limit + 1} offset ${offset}
  `)) as unknown as JourneyRawRow[];

  // db.execute() returns raw driver rows, unlike drizzle's typed select()
  // (which parses timestamptz columns into Date itself) - occurredAt comes
  // back as a string here, so it's normalized once, up front, rather than
  // leaking that difference into mapJourneyRow/paginateRows or the UI.
  const normalizedRows = rawRows.map((row) => ({ ...row, occurredAt: new Date(row.occurredAt) }));

  const { page, hasMore } = paginateRows(normalizedRows, limit);

  // Same N+1-avoidance shape as getPracticeHistory: one batched lookup for
  // this page's reflections, not a per-row query.
  const completionIds = page.filter((row) => row.kind === 'practice').map((row) => row.entryId);
  const reflectionRows =
    completionIds.length > 0
      ? await db
          .select({
            completionId: practiceReflections.completionId,
            response: practiceReflections.response,
            reflection: practiceReflections.reflection,
          })
          .from(practiceReflections)
          .where(inArray(practiceReflections.completionId, completionIds))
      : [];
  const reflectionByCompletionId = new Map(
    reflectionRows
      .filter((row): row is typeof row & { completionId: string } => row.completionId !== null)
      .map((row) => [row.completionId, { response: row.response, reflection: row.reflection }]),
  );

  return {
    entries: page.map((row) => mapJourneyRow(row, reflectionByCompletionId)),
    hasMore,
  };
}
