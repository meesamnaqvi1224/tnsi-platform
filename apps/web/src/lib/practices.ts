import { db, practices, practiceCompletions, practiceReflections, practiceSaves } from '@tnsi/db';
import { eq, and, desc, gt, count, countDistinct, inArray } from 'drizzle-orm';
import { categoryForCapacityScore, pickDeterministicCandidate } from '@tnsi/core';
import { getLatestCheckIn } from './check-ins';
import { paginateRows } from './practice-sessions';
import type { PracticeReflection as PracticeReflectionRow } from '@tnsi/db/schema';

/**
 * Fields the member-facing UI is allowed to see. Deliberately excludes
 * `sanityId` and `sanityData` (internal sync bookkeeping — see C7.4) by
 * selecting columns explicitly rather than spreading the full row, unlike
 * the existing `/api/v1/practices*` routes, which do return the full row.
 * This module queries Postgres directly from Server Components rather than
 * calling those routes internally.
 */
const PRACTICE_SUMMARY_COLUMNS = {
  id: practices.id,
  title: practices.title,
  description: practices.description,
  contentType: practices.contentType,
  mediaUrl: practices.mediaUrl,
  thumbnailUrl: practices.thumbnailUrl,
  durationSeconds: practices.durationSeconds,
  category: practices.category,
  tags: practices.tags,
  difficulty: practices.difficulty,
} as const;

export type PracticeSummary = {
  id: string;
  title: string;
  description: string | null;
  contentType: string;
  mediaUrl: string | null;
  thumbnailUrl: string | null;
  durationSeconds: number | null;
  category: string | null;
  tags: string[];
  difficulty: number;
};

/**
 * Published practices, in the same order `/api/v1/practices` and
 * `/api/v1/today` already use (`category`, then `difficulty`) — no new
 * ordering/selection logic introduced here.
 */
export async function getPublishedPractices(): Promise<PracticeSummary[]> {
  return db
    .select(PRACTICE_SUMMARY_COLUMNS)
    .from(practices)
    .where(eq(practices.isPublished, true))
    .orderBy(practices.category, practices.difficulty, practices.title);
}

/** A single published practice by id, or `null` if missing/unpublished. */
export async function getPublishedPracticeById(id: string): Promise<PracticeSummary | null> {
  const result = await db
    .select(PRACTICE_SUMMARY_COLUMNS)
    .from(practices)
    .where(and(eq(practices.id, id), eq(practices.isPublished, true)))
    .limit(1);
  return result[0] ?? null;
}

/**
 * "Today's Practice": the existing `/api/v1/today` route already returns
 * published practices in this same order with no explicit per-day
 * selection algorithm — it just lists them. There is no scheduling concept
 * anywhere in the schema/API. So "today's" practice is simply the first
 * practice in that existing ordering; this is a display decision, not a
 * new selection algorithm. Returns `null` when there are no published
 * practices at all.
 */
export async function getTodayPractice(
  userId: string,
): Promise<{ practice: PracticeSummary; completed: boolean } | null> {
  const [practice] = await db
    .select(PRACTICE_SUMMARY_COLUMNS)
    .from(practices)
    .where(eq(practices.isPublished, true))
    .orderBy(practices.category, practices.difficulty, practices.title)
    .limit(1);

  if (!practice) return null;

  const completed = await isPracticeCompleted(userId, practice.id);
  return { practice, completed };
}

/**
 * "Today's recommended practice" — deterministic content routing from the
 * user's latest capacity check-in to a practice category (see
 * `@tnsi/core`'s `categoryForCapacityScore`), not a display-order pick like
 * `getTodayPractice` above. Mechanical only: no LLM, no clinical inference,
 * just a fixed capacity-state -> category table.
 *
 * Returns `null` (never a silent `practices[0]`-style fallback) when:
 * - the user has no check-in yet (no capacity signal to route on), or
 * - no published practice is tagged with the mapped category yet.
 * Both are real, expected states right now since no practice in the
 * database currently carries any of the five category values this routes
 * to — that's a content-tagging gap in Sanity, not a bug here. A caller
 * wanting a guaranteed non-null result must pass an explicitly-designated
 * fallback practice id once one exists; none is hardcoded here.
 */
export async function getRecommendedPractice(userId: string): Promise<PracticeSummary | null> {
  const latestCheckIn = await getLatestCheckIn(userId);
  if (!latestCheckIn) return null;

  const category = categoryForCapacityScore(latestCheckIn.capacityScore);

  const candidates = await db
    .select(PRACTICE_SUMMARY_COLUMNS)
    .from(practices)
    .where(and(eq(practices.isPublished, true), eq(practices.category, category)));

  return pickDeterministicCandidate(candidates);
}

/**
 * Whether the given user has EVER completed the given practice, across any
 * session - not just their most recent one. Since Practice History (see
 * `practice_completions`'s own schema comment), a practice can have many
 * rows for the same user; this is intentionally an existence check
 * ("has a completed=true row ever existed"), not "is the latest row
 * completed" - those aren't the same question once repeat sessions are
 * real (a member who finished a practice last week and reopened it today
 * without finishing again has still, overall, completed it).
 */
export async function isPracticeCompleted(userId: string, practiceId: string): Promise<boolean> {
  const result = await db
    .select({ id: practiceCompletions.id })
    .from(practiceCompletions)
    .where(
      and(
        eq(practiceCompletions.userId, userId),
        eq(practiceCompletions.practiceId, practiceId),
        eq(practiceCompletions.completed, true),
      ),
    )
    .limit(1);
  return result.length > 0;
}

export interface PracticeCompletionState {
  id: string;
  progressPct: number;
  positionSeconds: number;
  completed: boolean;
  playCount: number;
}

/**
 * This user's *current* relationship with a practice, for the practice
 * player/detail screen - not their full history (see getPracticeHistory
 * for that). "Current" means the most recently touched row: the one
 * in-progress session if there is one (so playback resumes exactly where
 * it left off), otherwise their most recent past session (so a finished
 * practice reopens ready to start fresh, per PracticePlayer/AudioPlayer's
 * own `completed ? 0 : ...` resume logic). `null` only if they've never
 * touched this practice at all.
 */
export async function getPracticeCompletion(
  userId: string,
  practiceId: string,
): Promise<PracticeCompletionState | null> {
  const result = await db
    .select({
      id: practiceCompletions.id,
      progressPct: practiceCompletions.progressPct,
      positionSeconds: practiceCompletions.positionSeconds,
      completed: practiceCompletions.completed,
      playCount: practiceCompletions.playCount,
    })
    .from(practiceCompletions)
    .where(
      and(eq(practiceCompletions.userId, userId), eq(practiceCompletions.practiceId, practiceId)),
    )
    .orderBy(desc(practiceCompletions.lastPlayedAt))
    .limit(1);
  return result[0] ?? null;
}

export interface PracticeReflectionState {
  completionId: PracticeReflectionRow['completionId'];
  response: PracticeReflectionRow['response'];
  reflection: PracticeReflectionRow['reflection'];
  updatedAt: PracticeReflectionRow['updatedAt'];
}

/**
 * This user's own saved reflection for one specific completed session, or
 * `null` if they never saved one for it (skipped, or the session isn't
 * finished yet). Takes `completionId`, not `practiceId` - a reflection now
 * belongs to a session, not "this practice" in general (see
 * practice_reflections's own schema comment) - and re-checks `userId`
 * itself rather than trusting the caller already verified ownership of
 * `completionId`, so a mistaken call here can never leak another member's
 * reflection.
 */
export async function getPracticeReflection(
  userId: string,
  completionId: string,
): Promise<PracticeReflectionState | null> {
  const result = await db
    .select({
      completionId: practiceReflections.completionId,
      response: practiceReflections.response,
      reflection: practiceReflections.reflection,
      updatedAt: practiceReflections.updatedAt,
    })
    .from(practiceReflections)
    .where(
      and(
        eq(practiceReflections.completionId, completionId),
        eq(practiceReflections.userId, userId),
      ),
    )
    .limit(1);
  return result[0] ?? null;
}

/** Whether this user currently has this practice saved. */
export async function isPracticeSaved(userId: string, practiceId: string): Promise<boolean> {
  const result = await db
    .select({ id: practiceSaves.id })
    .from(practiceSaves)
    .where(and(eq(practiceSaves.userId, userId), eq(practiceSaves.practiceId, practiceId)))
    .limit(1);
  return result.length > 0;
}

export interface SavedPractice extends PracticeSummary {
  savedAt: Date;
}

/**
 * This user's saved practices, most recently saved first. Filters
 * `isPublished` the same way every other member-facing practice list in
 * this file does (getPublishedPractices, getInProgressPractices, ...) -
 * if a saved practice is later unpublished, its save row is never
 * deleted (see POST/DELETE .../save's own comments), it simply stops
 * appearing here, exactly like an unpublished practice already stops
 * appearing everywhere else. No separate "unavailable" placeholder is
 * fabricated for it.
 */
export async function getSavedPractices(userId: string): Promise<SavedPractice[]> {
  return db
    .select({ ...PRACTICE_SUMMARY_COLUMNS, savedAt: practiceSaves.createdAt })
    .from(practiceSaves)
    .innerJoin(practices, eq(practiceSaves.practiceId, practices.id))
    .where(and(eq(practiceSaves.userId, userId), eq(practices.isPublished, true)))
    .orderBy(desc(practiceSaves.createdAt));
}

export interface InProgressPractice extends PracticeSummary {
  progressPct: number;
  positionSeconds: number;
  lastPlayedAt: Date;
}

/**
 * Practices this user has started but not finished, most recently played
 * first — powers "Continue where you left off". Reads only the existing
 * `progressPct`/`positionSeconds`/`lastPlayedAt` columns the practice player
 * already writes (see `PracticePlayer`'s `persistProgress`); no new
 * progress calculation.
 */
export async function getInProgressPractices(
  userId: string,
  limit: number,
): Promise<InProgressPractice[]> {
  return db
    .select({
      ...PRACTICE_SUMMARY_COLUMNS,
      progressPct: practiceCompletions.progressPct,
      positionSeconds: practiceCompletions.positionSeconds,
      lastPlayedAt: practiceCompletions.lastPlayedAt,
    })
    .from(practiceCompletions)
    .innerJoin(practices, eq(practiceCompletions.practiceId, practices.id))
    .where(
      and(
        eq(practiceCompletions.userId, userId),
        eq(practiceCompletions.completed, false),
        gt(practiceCompletions.progressPct, 0),
        eq(practices.isPublished, true),
      ),
    )
    .orderBy(desc(practiceCompletions.lastPlayedAt))
    .limit(limit);
}

export interface CompletedPractice extends PracticeSummary {
  completedAt: Date | null;
}

/**
 * This user's most recently completed practices, newest first — powers the
 * dashboard's "Completed" summary list. Reads the existing `completedAt`
 * column only.
 */
export async function getRecentCompletions(
  userId: string,
  limit: number,
): Promise<CompletedPractice[]> {
  return db
    .select({
      ...PRACTICE_SUMMARY_COLUMNS,
      completedAt: practiceCompletions.completedAt,
    })
    .from(practiceCompletions)
    .innerJoin(practices, eq(practiceCompletions.practiceId, practices.id))
    .where(
      and(
        eq(practiceCompletions.userId, userId),
        eq(practiceCompletions.completed, true),
        eq(practices.isPublished, true),
      ),
    )
    .orderBy(desc(practiceCompletions.completedAt))
    .limit(limit);
}

export interface PracticeHistoryEntry extends PracticeSummary {
  completionId: string;
  completedAt: Date;
  reflection: {
    response: PracticeReflectionRow['response'];
    reflection: PracticeReflectionRow['reflection'];
  } | null;
}

/**
 * This user's full practice history, newest session first — real Practice
 * History (see `practice_completions`'s own schema comment): every
 * completed session is its own row here, including repeat sessions of the
 * same practice, each independently queryable rather than one overwriting
 * the last. Pagination mirrors `getCheckInHistory`'s existing
 * fetch-`limit`-plus-one convention exactly, rather than introducing a
 * different (e.g. cursor-based) scheme this codebase doesn't otherwise
 * use.
 *
 * Reflections are fetched in one extra query keyed by `completionId` and
 * merged in-memory (a `Map`, not a second per-row round trip) — avoids
 * the N+1 an inner loop of individual lookups would cause for a page of,
 * say, 20 sessions.
 *
 * Deliberately does NOT filter `practices.isPublished` (unlike every other
 * list in this file) — a member's own record of what they actually did
 * shouldn't disappear just because the practice was later unpublished.
 * See getJourneyEntries's identical choice for the same reason.
 */
export async function getPracticeHistory(
  userId: string,
  limit: number,
  offset: number,
): Promise<{ history: PracticeHistoryEntry[]; hasMore: boolean }> {
  const rows = await db
    .select({
      ...PRACTICE_SUMMARY_COLUMNS,
      completionId: practiceCompletions.id,
      completedAt: practiceCompletions.completedAt,
    })
    .from(practiceCompletions)
    .innerJoin(practices, eq(practiceCompletions.practiceId, practices.id))
    .where(and(eq(practiceCompletions.userId, userId), eq(practiceCompletions.completed, true)))
    .orderBy(desc(practiceCompletions.completedAt))
    .limit(limit + 1)
    .offset(offset);

  const { page, hasMore } = paginateRows(rows, limit);

  const completionIds = page.map((row) => row.completionId);
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
  const reflectionByCompletionId = new Map(reflectionRows.map((r) => [r.completionId, r]));

  return {
    history: page.map((row) => ({
      ...row,
      completedAt: row.completedAt as Date,
      reflection: reflectionByCompletionId.get(row.completionId) ?? null,
    })),
    hasMore,
  };
}

/**
 * Count of *distinct* practices this user has completed at least once —
 * deliberately `COUNT(DISTINCT practiceId)`, not `COUNT(*)`. Before
 * Practice History, those were identical (at most one completion row per
 * practice existed at all); now that repeat sessions are real rows, a
 * plain `COUNT(*)` would count completed *sessions*, quietly turning this
 * dashboard stat into something closer to a streak/activity count - which
 * is explicitly out of scope. This keeps its existing meaning ("how much
 * of the library have you gotten through") intact.
 */
export async function getCompletedPracticeCount(userId: string): Promise<number> {
  const [row] = await db
    .select({ count: countDistinct(practiceCompletions.practiceId) })
    .from(practiceCompletions)
    .innerJoin(practices, eq(practiceCompletions.practiceId, practices.id))
    .where(
      and(
        eq(practiceCompletions.userId, userId),
        eq(practiceCompletions.completed, true),
        eq(practices.isPublished, true),
      ),
    );
  return row?.count ?? 0;
}

/**
 * Total in-progress-practice count for this user — a plain `COUNT(*)`,
 * mirroring `getCompletedPracticeCount` above, so the dashboard's "X in
 * progress" figure stays accurate even when the in-progress list shown is
 * capped by `limit`.
 */
export async function getInProgressPracticeCount(userId: string): Promise<number> {
  const [row] = await db
    .select({ count: count() })
    .from(practiceCompletions)
    .innerJoin(practices, eq(practiceCompletions.practiceId, practices.id))
    .where(
      and(
        eq(practiceCompletions.userId, userId),
        eq(practiceCompletions.completed, false),
        gt(practiceCompletions.progressPct, 0),
        eq(practices.isPublished, true),
      ),
    );
  return row?.count ?? 0;
}

/** "300" -> "5 min"; "90" -> "1 hr 30 min". `null` when no duration is set. */
export function formatPracticeDuration(seconds: number | null): string | null {
  if (!seconds || seconds <= 0) return null;
  const totalMinutes = Math.round(seconds / 60);
  if (totalMinutes < 60) return `${totalMinutes} min`;
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return minutes > 0 ? `${hours} hr ${minutes} min` : `${hours} hr`;
}

/** "breathwork" -> "Breathwork". */
export function formatContentTypeLabel(contentType: string): string {
  return contentType.charAt(0).toUpperCase() + contentType.slice(1);
}

const GOOGLE_DRIVE_FILE_ID_PATTERN =
  /drive\.google\.com\/(?:file\/d\/([^/?]+)|open\?id=([^&]+)|uc\?.*[?&]id=([^&]+))/;

/**
 * A Google Drive "share" link (.../file/d/<id>/view, .../open?id=<id>, etc.)
 * points at an HTML viewer page, not a raw media file — an <audio>/<video>
 * element can't play it. Drive's own /preview endpoint is the officially
 * supported embeddable player for any file type Drive can preview (video,
 * audio, ...), so a Drive URL needs an <iframe> pointed at that instead.
 * Returns null for any non-Drive URL, which callers use to fall back to the
 * existing <audio>/<video> rendering unchanged.
 */
export function toGoogleDriveEmbedUrl(url: string): string | null {
  const match = url.match(GOOGLE_DRIVE_FILE_ID_PATTERN);
  const fileId = match?.[1] ?? match?.[2] ?? match?.[3];
  return fileId ? `https://drive.google.com/file/d/${fileId}/preview` : null;
}
