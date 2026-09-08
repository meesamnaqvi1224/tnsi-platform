import { db, checkIns } from '@tnsi/db';
import { eq, and, desc } from 'drizzle-orm';
import type { CheckIn } from '@tnsi/db/schema';

/**
 * Today's check-in for a user, if one exists.
 *
 * Computes "today" the same way `POST /api/v1/check-ins` does when checking
 * for a duplicate (server-local calendar day, via `completedDate`) — so the
 * dashboard's "already checked in" state always agrees with what that
 * endpoint would itself reject as a duplicate. Read-only; no write path.
 */
export async function getTodayCheckIn(userId: string): Promise<CheckIn | null> {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  const result = await db
    .select()
    .from(checkIns)
    .where(and(eq(checkIns.userId, userId), eq(checkIns.completedDate, today)))
    .limit(1);

  return result[0] ?? null;
}

/**
 * This user's check-in history, newest first. `completedDate` alone is a
 * deterministic sort key — `check_ins` has a `unique(userId, completedDate)`
 * constraint (see `packages/db/src/schema/check-ins.ts`), so no two rows for
 * the same user can share a date, and no secondary ordering is needed.
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
    .orderBy(desc(checkIns.completedDate))
    .limit(limit + 1)
    .offset(offset);

  return {
    checkIns: rows.slice(0, limit),
    hasMore: rows.length > limit,
  };
}
