/**
 * Standalone public API surface for a single practice, mirroring
 * `lib/practices.ts`'s `getPublishedPracticeById`. Not currently called by
 * this app's own UI — the practice detail page queries Postgres directly
 * via `lib/practices.ts` instead — so this exists for a future
 * external/mobile client rather than this web app itself. Kept, not
 * removed, in case one already depends on it.
 */
import { requireMemberAccess, memberAccessErrorResponse } from '@/lib/auth-api';
import { db } from '@tnsi/db';
import { practices, practiceCompletions, practiceReflections } from '@tnsi/db/schema';
import { eq, and, desc } from 'drizzle-orm';
import { isPracticeSaved } from '@/lib/practices';
import { practiceIdParam } from '@/lib/validation';
import { success, notFound } from '@/lib/api-response';

export const runtime = 'nodejs';

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(request: Request, { params }: RouteParams) {
  let user;
  try {
    user = await requireMemberAccess();
  } catch (err) {
    return memberAccessErrorResponse(err);
  }

  const { id } = await params;
  const result = practiceIdParam.safeParse({ id });
  if (!result.success) {
    return notFound('Invalid practice ID');
  }

  const practice = await db
    .select()
    .from(practices)
    .where(and(eq(practices.id, id), eq(practices.isPublished, true)))
    .limit(1);

  if (!practice[0]) {
    return notFound('Practice not found');
  }

  // This user's *current* relationship with this practice - the most
  // recently touched row, not just any row. Practice History (see
  // practice_completions's own schema comment) means there can be many
  // rows for this user+practice now; `id` is included in the response
  // (not just progress fields) because a client needs it to submit a
  // reflection against the right session (POST .../reflection now
  // requires `completionId`).
  const completion = await db
    .select()
    .from(practiceCompletions)
    .where(and(eq(practiceCompletions.userId, user.id), eq(practiceCompletions.practiceId, id)))
    .orderBy(desc(practiceCompletions.lastPlayedAt))
    .limit(1);

  // This user's own reflection for that same current session - never
  // another member's (see packages/db/src/schema/practice-reflections.ts),
  // and never a different session's reflection, now that a reflection
  // belongs to one specific completion rather than "this practice" in
  // general. No completion, no possible reflection - skip the query
  // entirely rather than looking one up with an undefined completionId.
  const reflection = completion[0]
    ? await db
        .select()
        .from(practiceReflections)
        .where(eq(practiceReflections.completionId, completion[0].id))
        .limit(1)
    : [];

  const saved = await isPracticeSaved(user.id, id);

  return success({
    ...practice[0],
    saved,
    progress: completion[0]
      ? {
          id: completion[0].id,
          progressPct: completion[0].progressPct,
          positionSeconds: completion[0].positionSeconds,
          completed: completion[0].completed,
          completedAt: completion[0].completedAt,
          playCount: completion[0].playCount,
          lastPlayedAt: completion[0].lastPlayedAt,
        }
      : null,
    reflection: reflection[0]
      ? {
          completionId: reflection[0].completionId,
          response: reflection[0].response,
          reflection: reflection[0].reflection,
          updatedAt: reflection[0].updatedAt,
        }
      : null,
  });
}
