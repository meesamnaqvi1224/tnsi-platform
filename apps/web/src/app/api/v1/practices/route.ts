/**
 * Standalone public API surface for the practice library, mirroring
 * `lib/practices.ts`'s `getPublishedPractices`. Not currently called by
 * this app's own UI — the dashboard's Server Components query Postgres
 * directly via `lib/practices.ts` instead — so this exists for a future
 * external/mobile client rather than this web app itself. Kept, not
 * removed, in case one already depends on it.
 */
import { getAuthUser } from '@/lib/auth-api';
import { db, practices, practiceCompletions } from '@tnsi/db';
import { eq, and, inArray, desc } from 'drizzle-orm';
import { practiceContentType } from '@/lib/validation';
import { success, unauthorized, badRequest } from '@/lib/api-response';

export const runtime = 'nodejs';

export async function GET(request: Request) {
  const user = await getAuthUser();
  if (!user) return unauthorized();

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

  // Get completions for these practices
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
      : [];

  const completionsMap = new Map(completions.map((c) => [c.practiceId, c]));

  const practicesWithProgress = practiceList.map((practice) => {
    const completion = completionsMap.get(practice.id);
    return {
      ...practice,
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
