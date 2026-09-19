/**
 * Records one practice session for the authenticated member - a real,
 * independently-queryable row per completed session (see Practice History,
 * `packages/db/src/schema/practice-completions.ts`'s own comment), not a
 * single row overwritten forever. This route's own job is deciding which
 * `practice_completions` row a given request belongs to:
 *
 * - Progress saves during playback, and the completion at the end of the
 *   SAME playthrough, all belong to "the session currently underway" - the
 *   one row for this (userId, practiceId) with `completed = false`, if one
 *   exists. At most one such row can exist at a time (an invariant this
 *   route itself maintains); that's what makes "find the active session"
 *   well-defined without a client-generated session id.
 * - No active session, and the request isn't a completion? Start one - a
 *   fresh, empty-progress row.
 * - No active session, and the request IS a completion (e.g. "Mark as
 *   Complete" on a practice with no progress tracking, like a journal
 *   entry)? Complete it directly as a brand-new row - that's a real,
 *   from-scratch session, not a continuation of anything.
 * - No active session, but the *most recent* row for this practice was
 *   itself completed only moments ago (see DUPLICATE_WINDOW_MS below), and
 *   this request is ALSO a completion? That's an accidental repeat of the
 *   same submission (a network retry, a double-tap that slipped past the
 *   client's own submitting-guard) - update that same just-completed row
 *   again rather than minting a second history entry for one real session.
 *   A genuinely new session days (or even minutes) later isn't caught by
 *   this - the window is deliberately short.
 */
import { requireMemberAccess, memberAccessErrorResponse } from '@/lib/auth-api';
import { db } from '@tnsi/db';
import { practices, practiceCompletions } from '@tnsi/db/schema';
import { eq, and, desc } from 'drizzle-orm';
import { practiceIdParam, practiceCompletionSchema } from '@/lib/validation';
import { success, notFound, badRequest, internalError } from '@/lib/api-response';
import { shouldReuseCompletionRow } from '@/lib/practice-sessions';

export const runtime = 'nodejs';

interface RouteParams {
  params: Promise<{ id: string }>;
}

/** How recently a completed row must have been touched to treat a new completed:true request as a duplicate of it, rather than a genuinely new session. */
const DUPLICATE_WINDOW_MS = 10_000;

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

  const [mostRecent] = await db
    .select()
    .from(practiceCompletions)
    .where(and(eq(practiceCompletions.userId, user.id), eq(practiceCompletions.practiceId, id)))
    .orderBy(desc(practiceCompletions.lastPlayedAt))
    .limit(1);

  const targetRow = shouldReuseCompletionRow(mostRecent, isCompleted, now, DUPLICATE_WINDOW_MS)
    ? mostRecent
    : null;

  let completion;

  if (targetRow) {
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
    else updateData.playCount = targetRow.playCount + 1;

    [completion] = await db
      .update(practiceCompletions)
      .set(updateData)
      .where(eq(practiceCompletions.id, targetRow.id))
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

  if (!completion) return internalError('Failed to save practice completion');

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
