/**
 * Standalone public API surface for the practice library, mirroring
 * `lib/practices.ts`'s `getPublishedPractices`. Not currently called by
 * this app's own UI — the dashboard's Server Components query Postgres
 * directly via `lib/practices.ts` instead — so this exists for a future
 * external/mobile client rather than this web app itself. Kept, not
 * removed, in case one already depends on it.
 */
import { requireMemberAccess, memberAccessErrorResponse } from '@/lib/auth-api';
import { db, practices, practiceCompletions, practiceSaves } from '@tnsi/db';
import { eq, and, inArray, desc } from 'drizzle-orm';
import { practiceContentType } from '@/lib/validation';
import { success, badRequest } from '@/lib/api-response';

export const runtime = 'nodejs';

export async function GET(request: Request) {
  let user;
  try {
    user = await requireMemberAccess();
  } catch (err) {
    return memberAccessErrorResponse(err);
  }

  const { searchParams } = new URL(request.url);
  const category = searchParams.get('category');
  const contentTypeParam = searchParams.get('contentType');
  const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 50);
  const offset = parseInt(searchParams.get('offset') || '0');

  let contentType: (typeof practiceContentType)['options'][number] | null = null;
  if (contentTypeParam) {
    const result = practiceContentType.safeParse(contentTypeParam);
    if (!result.success) {
      return badRequest('Invalid contentType', { errors: result.error.flatten().formErrors });
    }
    contentType = result.data;
  }

  const conditions = [eq(practices.isPublished, true)];
  if (category) conditions.push(eq(practices.category, category));
  if (contentType) conditions.push(eq(practices.contentType, contentType));

  const practiceList = await db
    .select()
    .from(practices)
    .where(and(...conditions))
    .orderBy(practices.category, practices.difficulty, practices.title)
    .limit(limit)
    .offset(offset);

  // Get completions for these practices. Practice History (see
  // practice_completions's own schema comment) means a practice can now
  // have many rows for this user, not just one - ordered by lastPlayedAt
  // desc so the loop below keeps only the FIRST (i.e. most recently
  // touched) row it sees per practiceId, the same "current session"
  // definition getPracticeCompletion uses.
  const practiceIds = practiceList.map((p) => p.id);
  const completions =
    practiceIds.length > 0
      ? await db
          .select()
          .from(practiceCompletions)
          .where(
            and(
              eq(practiceCompletions.userId, user.id),
              inArray(practiceCompletions.practiceId, practiceIds),
            ),
          )
          .orderBy(desc(practiceCompletions.lastPlayedAt))
      : [];

  const completionsMap = new Map<string, (typeof completions)[number]>();
  for (const c of completions) {
    if (!completionsMap.has(c.practiceId)) completionsMap.set(c.practiceId, c);
  }

  // One batched query for this page's saved state, mirroring the
  // completions lookup above - never a per-practice query.
  const saves =
    practiceIds.length > 0
      ? await db
          .select({ practiceId: practiceSaves.practiceId })
          .from(practiceSaves)
          .where(
            and(eq(practiceSaves.userId, user.id), inArray(practiceSaves.practiceId, practiceIds)),
          )
      : [];
  const savedIds = new Set(saves.map((s) => s.practiceId));

  const practicesWithProgress = practiceList.map((practice) => {
    const completion = completionsMap.get(practice.id);
    return {
      ...practice,
      saved: savedIds.has(practice.id),
      progress: completion
        ? {
            progressPct: completion.progressPct,
            positionSeconds: completion.positionSeconds,
            completed: completion.completed,
            completedAt: completion.completedAt,
            playCount: completion.playCount,
            lastPlayedAt: completion.lastPlayedAt,
          }
        : null,
    };
  });

  return success({
    practices: practicesWithProgress,
    pagination: { limit, offset },
  });
}
