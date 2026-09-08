import { requireAuth } from '@/lib/auth-api';
import { db, checkIns } from '@tnsi/db';
import { eq, and } from 'drizzle-orm';
import { getCheckInHistory } from '@/lib/check-ins';
import { checkInSchema, checkInsListQuerySchema } from '@/lib/validation';
import { success, unauthorized, badRequest, internalError } from '@/lib/api-response';
import type { CheckIn } from '@tnsi/db/schema';

export const runtime = 'nodejs';

/** "2026-06-12T00:00:00.000Z" (the `date`-mode column's UTC-midnight `Date`) -> "2026-06-12". */
function toDateOnlyString(date: Date): string {
  return date.toISOString().slice(0, 10);
}

/**
 * The fields a client needs from a check-in row — excludes `userId`
 * (redundant, this is always the authenticated caller's own history),
 * `metadata` (internal, always `{}` today), and `createdAt` (record
 * bookkeeping, distinct from `completedAt`). This is activity history, not
 * a health/clinical record — the shape carries the same mood/capacity
 * scores and note the user already entered, nothing interpreted from them.
 */
function toCheckInSummary(checkIn: CheckIn) {
  return {
    id: checkIn.id,
    completedDate: toDateOnlyString(checkIn.completedDate),
    moodScore: checkIn.moodScore,
    capacityScore: checkIn.capacityScore,
    notes: checkIn.notes,
    completedAt: checkIn.completedAt,
  };
}

/**
 * This user's check-in history, newest first — read-only counterpart to
 * `POST` below. Reuses the same `requireAuth()` pattern already used by
 * that handler in this file, so an unauthenticated request is rejected the
 * same way, and a request can only ever read the calling user's own rows
 * (`getCheckInHistory` always scopes by `user.id`, never a client-supplied
 * id).
 */
export async function GET(request: Request) {
  let user;
  try {
    user = await requireAuth();
  } catch {
    return unauthorized();
  }

  const { searchParams } = new URL(request.url);
  const parsed = checkInsListQuerySchema.safeParse({
    limit: searchParams.get('limit') ?? undefined,
    offset: searchParams.get('offset') ?? undefined,
  });
  if (!parsed.success) {
    return badRequest('Invalid query parameters', { errors: parsed.error.flatten().fieldErrors });
  }
  const { limit, offset } = parsed.data;

  const { checkIns: history, hasMore } = await getCheckInHistory(user.id, limit, offset);

  return success({
    checkIns: history.map(toCheckInSummary),
    pagination: { limit, offset, hasMore },
  });
}

export async function POST(request: Request) {
  let user;
  try {
    user = await requireAuth();
  } catch {
    return unauthorized();
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return badRequest('Invalid JSON body');
  }

  const result = checkInSchema.safeParse(body);
  if (!result.success) {
    return badRequest('Validation failed', { errors: result.error.flatten().fieldErrors });
  }

  const { moodScore, capacityScore, notes, completedAt } = result.data;

  const now = new Date();
  const completedAtDate = completedAt ? new Date(completedAt) : now;
  const completedDate = new Date(
    completedAtDate.getFullYear(),
    completedAtDate.getMonth(),
    completedAtDate.getDate(),
  );

  // Check if check-in already exists for today
  const existing = await db
    .select()
    .from(checkIns)
    .where(and(eq(checkIns.userId, user.id), eq(checkIns.completedDate, completedDate)))
    .limit(1);

  if (existing[0]) {
    return badRequest('Check-in already exists for this date', {
      checkIn: existing[0],
    });
  }

  const [checkIn] = await db
    .insert(checkIns)
    .values({
      userId: user.id,
      moodScore,
      capacityScore,
      notes: notes ?? null,
      completedAt: completedAtDate,
      completedDate,
    })
    .returning();

  return success(checkIn, 201);
}
