import { db, practices, practiceCompletions } from '@tnsi/db';
import { eq, and, desc, gt, count } from 'drizzle-orm';

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
 * Whether the given user has completed the given practice. The schema has
 * no per-day completion concept for practices (unlike check-ins) — just a
 * single `completed` boolean per user+practice — so this reflects overall
 * completion, not "completed today" specifically.
 */
export async function isPracticeCompleted(userId: string, practiceId: string): Promise<boolean> {
  const result = await db
    .select({ completed: practiceCompletions.completed })
    .from(practiceCompletions)
    .where(
      and(eq(practiceCompletions.userId, userId), eq(practiceCompletions.practiceId, practiceId)),
    )
    .limit(1);
  return result[0]?.completed ?? false;
}

export interface PracticeCompletionState {
  progressPct: number;
  positionSeconds: number;
  completed: boolean;
  playCount: number;
}

/**
 * The full completion row for one user+practice, or `null` if they've never
 * started it. Unlike `isPracticeCompleted` above (which exists purely for
 * the boolean badge/gate case), the practice player needs `positionSeconds`
 * to resume playback and `playCount` to avoid re-incrementing it on every
 * throttled progress save — neither is derivable from a boolean, so this is
 * a genuinely separate read, not a duplicate of the existing one.
 */
export async function getPracticeCompletion(
  userId: string,
  practiceId: string,
): Promise<PracticeCompletionState | null> {
  const result = await db
    .select({
      progressPct: practiceCompletions.progressPct,
      positionSeconds: practiceCompletions.positionSeconds,
      completed: practiceCompletions.completed,
      playCount: practiceCompletions.playCount,
    })
    .from(practiceCompletions)
    .where(
      and(eq(practiceCompletions.userId, userId), eq(practiceCompletions.practiceId, practiceId)),
    )
    .limit(1);
  return result[0] ?? null;
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

/**
 * Total completed-practice count for this user — a plain `COUNT(*)`, not a
 * derived/invented metric, so the dashboard's "X completed" figure stays
 * accurate even when the recent-completions list above is capped by `limit`.
 */
export async function getCompletedPracticeCount(userId: string): Promise<number> {
  const [row] = await db
    .select({ count: count() })
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
