import { requireAuth } from '@/lib/auth-api';
import { db, checkIns } from '@tnsi/db';
import { eq, and } from 'drizzle-orm';
import { checkInSchema } from '@/lib/validation';
import { success, unauthorized, badRequest, internalError } from '@/lib/api-response';

export const runtime = 'nodejs';

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
