/**
 * A member's personal bookmark of a practice - see
 * packages/db/src/schema/practice-saves.ts's own comment. A pure on/off
 * relationship, not a history: POST is "make this saved" (idempotent -
 * saving an already-saved practice is a no-op, not an error), DELETE is
 * "make this not saved" (equally idempotent - unsaving something that
 * isn't saved is also a no-op).
 */
import { requireAuth, requireMemberAccess, memberAccessErrorResponse } from '@/lib/auth-api';
import { db } from '@tnsi/db';
import { practices, practiceSaves } from '@tnsi/db/schema';
import { eq, and } from 'drizzle-orm';
import { practiceIdParam } from '@/lib/validation';
import { success, unauthorized, notFound } from '@/lib/api-response';

export const runtime = 'nodejs';

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * Saving a NEW practice is "using member content" - gated by
 * requireMemberAccess. DELETE below is deliberately NOT gated the same
 * way: removing your own data is always allowed regardless of entitlement
 * status (entitlement controls access, not data destruction - a member
 * whose access lapses must still be able to clear a stale save), matching
 * this route's own existing "no published/existence check on DELETE"
 * reasoning below.
 */
export async function POST(_request: Request, { params }: RouteParams) {
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

  // A practice can only be saved while it's actually visible to the
  // member - same existence+published check .../complete and
  // .../reflection already use. This only gates *creating* a new save;
  // an existing save is never revoked just because the practice later
  // becomes unpublished (see getSavedPractices's own comment).
  const practice = await db
    .select({ id: practices.id })
    .from(practices)
    .where(and(eq(practices.id, id), eq(practices.isPublished, true)))
    .limit(1);

  if (!practice[0]) {
    return notFound('Practice not found');
  }

  // The unique(userId, practiceId) constraint is the real source of
  // truth against a duplicate save (e.g. a double-tap racing two
  // requests) - onConflictDoNothing avoids a separate check-then-insert
  // that constraint would otherwise just reject.
  await db
    .insert(practiceSaves)
    .values({ userId: user.id, practiceId: id })
    .onConflictDoNothing({ target: [practiceSaves.userId, practiceSaves.practiceId] });

  return success({ practiceId: id, saved: true });
}

export async function DELETE(_request: Request, { params }: RouteParams) {
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

  // Deliberately no published/existence check here (unlike POST above):
  // a member must always be able to remove their own save, including one
  // whose practice has since become unpublished - otherwise a stale save
  // could never be cleared. Scoped to this user's own row only - never
  // accepts or infers another user's id, so this can never delete
  // another member's save. Deleting a save that doesn't exist is a
  // harmless no-op, not an error.
  await db
    .delete(practiceSaves)
    .where(and(eq(practiceSaves.userId, user.id), eq(practiceSaves.practiceId, id)));

  return success({ practiceId: id, saved: false });
}
