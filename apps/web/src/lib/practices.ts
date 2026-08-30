import { db, practices, practiceCompletions } from '@tnsi/db';
import { eq, and } from 'drizzle-orm';

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
