import { requireAuth } from '@/lib/auth-api';
import { getCheckInHistory, recordCheckIn, toPublicCheckIn } from '@/lib/check-ins';
import { checkInSchema, checkInsListQuerySchema } from '@/lib/validation';
import { success, unauthorized, badRequest, internalError } from '@/lib/api-response';
import { buildTimeZoneMetadata, describeRejectedTimeZone } from '@/lib/time-zone';
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
    isPrimary: checkIn.isPrimary,
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

  const { moodScore, capacityScore, notes, completedAt, timeZone } = result.data;

  const completedAtDate = completedAt ? new Date(completedAt) : new Date();

  // Phase 1 of member-local days: RECORD the reported zone (validated, with the server-computed local
  // date and offset) in metadata. It changes nothing about which day this check-in belongs to: the
  // day is still the server's calendar day (see recordCheckIn). An unusable zone is just not recorded.
  const { metadata, rejected } = buildTimeZoneMetadata(timeZone, completedAtDate);
  if (rejected) {
    console.warn(`check-in time zone not recorded: ${describeRejectedTimeZone(timeZone)}`);
  }

  // The first check-in of the day is the primary; any further one is saved as an additional record
  // (see recordCheckIn), carrying the same metadata. A repeat never fails and never replaces the primary.
  const checkIn = await recordCheckIn(user.id, {
    moodScore,
    capacityScore,
    notes: notes ?? null,
    completedAt: completedAtDate,
    metadata,
  });

  return success(toPublicCheckIn(checkIn), 201);
}
