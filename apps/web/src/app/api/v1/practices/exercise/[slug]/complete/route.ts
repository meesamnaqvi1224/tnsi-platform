/**
 * Records a completed session of a guided exercise. An exercise is opened by its slug, not a
 * database id, so this finds the published practice that carries the key `exercise:<slug>` and
 * hands the request to the ordinary `POST /api/v1/practices/[id]/complete` route. How a session is
 * recorded, whether the member can open the practice and how a quick repeat is merged are all
 * decided there; this only resolves the slug. Nothing is stored beyond the standard completion row:
 * the member's answers never leave their device.
 */
import { and, eq } from 'drizzle-orm';
import { exerciseInteractiveKey, isExerciseSlug } from '@tnsi/core';
import { db } from '@tnsi/db';
import { practices } from '@tnsi/db/schema';
import { memberAccessErrorResponse, requireMemberAccess } from '@/lib/auth-api';
import { notFound } from '@/lib/api-response';
import { POST as recordCompletion } from '../../../[id]/complete/route';

export const runtime = 'nodejs';

interface RouteParams {
  params: Promise<{ slug: string }>;
}

export async function POST(request: Request, { params }: RouteParams) {
  try {
    await requireMemberAccess();
  } catch (err) {
    return memberAccessErrorResponse(err);
  }

  const { slug } = await params;
  if (!isExerciseSlug(slug)) return notFound('Exercise not found');

  const [practice] = await db
    .select({ id: practices.id })
    .from(practices)
    .where(
      and(
        eq(practices.contentType, 'interactive'),
        eq(practices.interactiveKey, exerciseInteractiveKey(slug)),
        eq(practices.isPublished, true),
      ),
    )
    .limit(1);
  if (!practice) return notFound('Exercise not found');

  return recordCompletion(request, { params: Promise.resolve({ id: practice.id }) });
}
