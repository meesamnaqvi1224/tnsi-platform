import { db, checkIns } from '@tnsi/db';
import { eq, and } from 'drizzle-orm';
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
