import { db, checkIns } from '@tnsi/db';
import { eq, and, desc, lt, sql } from 'drizzle-orm';
import type { CheckIn } from '@tnsi/db/schema';
import { isCheckInFollowUpEnabled } from './check-in-follow-up-flag';
import { suggestedIdsOf, suggestedMetadata } from './check-in-driving';

/**
 * Whether EVERY check-in (not only the first of the day) drives the suggestions: the latest one wins.
 * Switched with the check-in follow-up switch, so while it is off the first check-in of the day is the
 * only one that counts, exactly as before.
 */
export function everyCheckInDrives(): boolean {
  return isCheckInFollowUpEnabled();
}

/** The server-local calendar day of an instant, as a date-only `Date` (what `check_ins.completed_date` stores). */
export function localDayOf(instant: Date): Date {
  return new Date(instant.getFullYear(), instant.getMonth(), instant.getDate());
}

/**
 * A check-in row as the API returns it: `metadata` is internal (it can hold the member's recorded time
 * zone), so it is always sent as the empty object it was before, never its real contents.
 */
export function toPublicCheckIn<T extends { metadata: unknown }>(checkIn: T): T {
  return { ...checkIn, metadata: {} };
}

/**
 * Today's check-in for a user, if one exists. By default this is the PRIMARY one: the first check-in of
 * the (server-local) calendar day; additional check-ins the same day are separate rows
 * (`isPrimary = false`) and do not count. With `everyCheckInDrives()` it is the LATEST check-in of the
 * day instead, primary or not. This is what Home's "checked in today" state and the recommendation key off.
 */
export async function getTodayCheckIn(userId: string): Promise<CheckIn | null> {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  const result = await db
    .select()
    .from(checkIns)
    .where(
      and(
        eq(checkIns.userId, userId),
        eq(checkIns.completedDate, today),
        ...(everyCheckInDrives() ? [] : [eq(checkIns.isPrimary, true)]),
      ),
    )
    .orderBy(desc(checkIns.completedAt), desc(checkIns.id))
    .limit(1);

  return result[0] ?? null;
}

/**
 * Saves a check-in as its own record. The first one a member makes on a given day becomes that day's
 * primary (`isPrimary = true`); any later one the same day is saved as an additional record
 * (`isPrimary = false`) and never replaces or changes the primary or its recommendation.
 *
 * The primary is claimed atomically: the insert targets the partial unique index
 * (`unique_check_ins_primary_user_date`) and does nothing if a primary already exists, so two
 * simultaneous first check-ins cannot both become primary - the loser is saved as additional.
 */
export async function recordCheckIn(
  userId: string,
  input: {
    moodScore: number;
    capacityScore: number;
    notes?: string | null;
    completedAt?: Date;
    /** Stored identically on the primary or the additional record (for example the recorded time zone). */
    metadata?: Record<string, unknown>;
  },
): Promise<CheckIn> {
  const completedAt = input.completedAt ?? new Date();
  const values = {
    userId,
    moodScore: input.moodScore,
    capacityScore: input.capacityScore,
    notes: input.notes ?? null,
    completedAt,
    completedDate: localDayOf(completedAt),
    metadata: input.metadata ?? {},
  };

  const [primary] = await db
    .insert(checkIns)
    .values({ ...values, isPrimary: true })
    .onConflictDoNothing({
      target: [checkIns.userId, checkIns.completedDate],
      where: sql`${checkIns.isPrimary}`,
    })
    .returning();
  if (primary) return primary;

  const [additional] = await db
    .insert(checkIns)
    .values({ ...values, isPrimary: false })
    .returning();
  if (!additional) throw new Error('Check-in was not saved');
  return additional;
}

/**
 * This user's check-in history, newest first: every check-in, primary and additional, each its own
 * record. Several can share a day now, so ordering is by `completedAt` with `id` as the final
 * tiebreak (a stable page boundary).
 *
 * Fetches `limit + 1` rows to derive `hasMore` without a separate `COUNT(*)`
 * query, mirroring the one-extra-row pagination pattern already used
 * elsewhere in this codebase; the caller slices back to `limit`.
 */
export async function getCheckInHistory(
  userId: string,
  limit: number,
  offset: number,
): Promise<{ checkIns: CheckIn[]; hasMore: boolean }> {
  const rows = await db
    .select()
    .from(checkIns)
    .where(eq(checkIns.userId, userId))
    .orderBy(desc(checkIns.completedAt), desc(checkIns.id))
    .limit(limit + 1)
    .offset(offset);

  return {
    checkIns: rows.slice(0, limit),
    hasMore: rows.length > limit,
  };
}

/**
 * This user's most recent check-in that drives the recommendation, regardless of whether it's today's -
 * unlike `getTodayCheckIn`, which only matches the current calendar day. Powers the "today's recommended
 * practice" content routing. By default only primary check-ins count: an additional check-in the same
 * day never changes the recommendation. With `everyCheckInDrives()` the latest check-in of any kind does.
 */
export async function getLatestCheckIn(userId: string): Promise<CheckIn | null> {
  const rows = await db
    .select()
    .from(checkIns)
    .where(
      and(
        eq(checkIns.userId, userId),
        ...(everyCheckInDrives() ? [] : [eq(checkIns.isPrimary, true)]),
      ),
    )
    .orderBy(desc(checkIns.completedDate), desc(checkIns.completedAt), desc(checkIns.id))
    .limit(1);
  return rows[0] ?? null;
}

/**
 * The ids of everything the member was already suggested on the same day, before this check-in: read
 * from the picks stored with each earlier check-in (never re-derived, so it is what they actually saw).
 * Empty unless every check-in drives, and for the first check-in of the day.
 */
export async function getShownEarlierToday(
  checkIn: Pick<CheckIn, 'userId' | 'completedDate' | 'completedAt' | 'isPrimary'>,
): Promise<Set<string>> {
  if (!everyCheckInDrives() || checkIn.isPrimary) return new Set();
  const earlier = await db
    .select({ metadata: checkIns.metadata })
    .from(checkIns)
    .where(
      and(
        eq(checkIns.userId, checkIn.userId),
        eq(checkIns.completedDate, checkIn.completedDate),
        lt(checkIns.completedAt, checkIn.completedAt),
      ),
    );
  return new Set(earlier.flatMap((row) => suggestedIdsOf(row.metadata)));
}

/** Stores what a check-in's suggestions showed, merged into its metadata (no schema change). */
export async function recordSuggestedIds(checkInId: string, ids: Iterable<string>): Promise<void> {
  const fragment = JSON.stringify(suggestedMetadata(ids));
  await db
    .update(checkIns)
    .set({ metadata: sql`${checkIns.metadata} || ${fragment}::jsonb` })
    .where(eq(checkIns.id, checkInId));
}
