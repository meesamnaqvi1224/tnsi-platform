/**
 * A guided exercise for the native app: the practice it is recorded against and the exercise's
 * content (steps, summary and closing from the Sanity `guidedExercise` document, validated).
 *
 * Same access rule as the website page: a member who cannot open the practice gets 403
 * `MEMBERSHIP_REQUIRED` and none of the content. A draft practice, a missing exercise, and an
 * incomplete or malformed CMS document are all 404, so an exercise is only ever offered whole.
 */
import { isExerciseSlug } from '@tnsi/core';
import { requireMemberAccess, memberAccessErrorResponse } from '@/lib/auth-api';
import { success, notFound, membershipRequired } from '@/lib/api-response';
import { contentAccessFor } from '@/lib/membership';
import { getPublishedExercisePractice } from '@/lib/practices';
import { getGuidedExercise } from '@/content/cms/loaders';

export const runtime = 'nodejs';

interface RouteParams {
  params: Promise<{ slug: string }>;
}

export async function GET(_request: Request, { params }: RouteParams) {
  let user;
  try {
    user = await requireMemberAccess();
  } catch (err) {
    return memberAccessErrorResponse(err);
  }

  const { slug } = await params;
  if (!isExerciseSlug(slug)) return notFound('Exercise not found');

  const practice = await getPublishedExercisePractice(slug);
  if (!practice) return notFound('Exercise not found');

  if (!contentAccessFor(user.entitlements).canOpen(practice)) return membershipRequired();

  const exercise = await getGuidedExercise(slug);
  if (!exercise) return notFound('Exercise not found');

  return success({ practiceId: practice.id, exercise });
}
