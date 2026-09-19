/**
 * A member's own optional post-practice reflection for one specific
 * practice session (`completionId`) - not "this practice" in general (see
 * packages/db/src/schema/practice-reflections.ts's comment on why this
 * moved off a plain (userId, practiceId) shape). Deliberately separate
 * from POST .../complete: saving a reflection here can never touch,
 * block, or be blocked by the completion record. Read access is via GET
 * /api/v1/practices/[id]/history (or the individual completion embedded
 * there) - no separate GET here.
 */
import { requireMemberAccess, memberAccessErrorResponse } from '@/lib/auth-api';
import { db } from '@tnsi/db';
import { practices, practiceCompletions, practiceReflections } from '@tnsi/db/schema';
import { eq, and } from 'drizzle-orm';
import { practiceIdParam, practiceReflectionSchema } from '@/lib/validation';
import { success, notFound, badRequest, internalError } from '@/lib/api-response';

export const runtime = 'nodejs';

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function POST(request: Request, { params }: RouteParams) {
  let user;
  try {
    user = await requireMemberAccess();
  } catch (err) {
    return memberAccessErrorResponse(err);
  }

  const { id } = await params;
  const idResult = practiceIdParam.safeParse({ id });
  if (!idResult.success) {
    return notFound('Invalid practice ID');
  }

  // Verify the practice exists and is published - same check
  // .../complete already does, so a reflection can't be attached to a
  // practice that isn't real or isn't currently visible to members.
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

  const result = practiceReflectionSchema.safeParse(body);
  if (!result.success) {
    return badRequest('Validation failed', { errors: result.error.flatten().fieldErrors });
  }

  const { completionId, response, reflection } = result.data;
  const now = new Date();

  // The session this reflection is about must be real, must belong to
  // this member, and must actually be a completion of the practice named
  // in the URL - never trusted from the client beyond "a well-formed
  // uuid". This is the ownership check: a member can never write (or, via
  // GET /api/v1/practices/[id]/history, read) a reflection against a
  // completion that isn't theirs.
  const [completion] = await db
    .select({ id: practiceCompletions.id })
    .from(practiceCompletions)
    .where(
      and(
        eq(practiceCompletions.id, completionId),
        eq(practiceCompletions.userId, user.id),
        eq(practiceCompletions.practiceId, id),
      ),
    )
    .limit(1);

  if (!completion) {
    return notFound('Practice session not found');
  }

  // Upsert by completionId (unique) - a member revisiting the same
  // session to add or change their reflection updates the same row rather
  // than erroring on the unique constraint; a different session's
  // reflection is always a different row.
  const existing = await db
    .select()
    .from(practiceReflections)
    .where(eq(practiceReflections.completionId, completionId))
    .limit(1);

  let saved;
  if (existing[0]) {
    // Partial update, mirroring .../complete's own convention: only a
    // field actually present in this request overwrites the stored value,
    // so saving just a response (say, on a later revisit) can never wipe
    // out reflection text saved earlier, or vice versa.
    const updateData: Record<string, unknown> = { updatedAt: now };
    if (response !== undefined) updateData.response = response;
    if (reflection !== undefined) updateData.reflection = reflection;

    [saved] = await db
      .update(practiceReflections)
      .set(updateData)
      .where(eq(practiceReflections.completionId, completionId))
      .returning();
  } else {
    [saved] = await db
      .insert(practiceReflections)
      .values({
        userId: user.id,
        practiceId: id,
        completionId,
        response: response ?? null,
        reflection: reflection ?? null,
      })
      .returning();
  }

  if (!saved) return internalError('Failed to save reflection');

  return success({
    completionId: saved.completionId,
    response: saved.response,
    reflection: saved.reflection,
    updatedAt: saved.updatedAt,
  });
}
