import { requireAuth } from '@/lib/auth-api';
import { db } from '@tnsi/db';
import { practices, practiceCompletions } from '@tnsi/db/schema';
import { eq, and } from 'drizzle-orm';
import { practiceIdParam, practiceCompletionSchema } from '@/lib/validation';
import { success, unauthorized, notFound, badRequest, internalError } from '@/lib/api-response';

export const runtime = 'nodejs';

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function POST(request: Request, { params }: RouteParams) {
  let user;
  try {
    user = await requireAuth();
  } catch {
    return unauthorized();
  }

  const { id } = await params;
  const idResult = practiceIdParam.safeParse({ id });
  if (!idResult.success) {
    return notFound('Invalid practice ID');
  }

  // Verify practice exists and is published
  const practice = await db
    .select()
    .from(practices)
    .where(and(eq(practices.id, id), eq(practices.isPublished, true)))
    .limit(1);

  if (!practice[0]) {
    return notFound('Practice not found');
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return badRequest('Invalid JSON body');
  }

  const result = practiceCompletionSchema.safeParse(body);
  if (!result.success) {
    return badRequest('Validation failed', { errors: result.error.flatten().fieldErrors });
  }

  const { progressPct, positionSeconds, completed, playCount } = result.data;

  const now = new Date();
  const isCompleted = completed ?? false;
  const completedAt = isCompleted ? now : null;

  // Upsert practice completion
  const existing = await db
    .select()
    .from(practiceCompletions)
    .where(and(eq(practiceCompletions.userId, user.id), eq(practiceCompletions.practiceId, id)))
    .limit(1);

  let completion;

  if (existing[0]) {
    const updateData: Record<string, unknown> = {
      lastPlayedAt: now,
      updatedAt: now,
    };

    if (progressPct !== undefined) updateData.progressPct = progressPct;
    if (positionSeconds !== undefined) updateData.positionSeconds = positionSeconds;
    if (completed !== undefined) {
      updateData.completed = isCompleted;
      updateData.completedAt = completedAt;
    }
    if (playCount !== undefined) updateData.playCount = playCount;
    else updateData.playCount = existing[0].playCount + 1;

    [completion] = await db
      .update(practiceCompletions)
      .set(updateData)
      .where(and(eq(practiceCompletions.userId, user.id), eq(practiceCompletions.practiceId, id)))
      .returning();
  } else {
    [completion] = await db
      .insert(practiceCompletions)
      .values({
        userId: user.id,
        practiceId: id,
        progressPct: progressPct ?? 0,
        positionSeconds: positionSeconds ?? 0,
        completed: isCompleted,
        completedAt,
        playCount: playCount ?? 1,
        lastPlayedAt: now,
      })
      .returning();
  }

  return success({
    ...completion,
    practice: {
      id: practice[0].id,
      title: practice[0].title,
      contentType: practice[0].contentType,
      durationSeconds: practice[0].durationSeconds,
    },
  });
}
