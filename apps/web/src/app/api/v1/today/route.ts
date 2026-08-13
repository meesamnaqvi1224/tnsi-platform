import { getAuthUser } from '@/lib/auth-api';
import { db, checkIns, practices, practiceCompletions } from '@tnsi/db';
import { eq, and, desc, inArray, gte, lte } from 'drizzle-orm';
import { success, unauthorized } from '@/lib/api-response';

export const runtime = 'nodejs';

export async function GET() {
  const user = await getAuthUser();
  if (!user) return unauthorized();

  const today = new Date();
  const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const endOfDay = new Date(startOfDay.getTime() + 24 * 60 * 60 * 1000);

  // Get today's check-in
  const todayCheckIn = await db
    .select()
    .from(checkIns)
    .where(
      and(
        eq(checkIns.userId, user.id),
        gte(checkIns.completedAt, startOfDay),
        lte(checkIns.completedAt, endOfDay),
      ),
    )
    .limit(1);

  // Get recent practices (published, ordered by category and difficulty)
  const recentPractices = await db
    .select()
    .from(practices)
    .where(eq(practices.isPublished, true))
    .orderBy(practices.category, practices.difficulty)
    .limit(10);

  // Get user's practice completions for today's practices
  const practiceIds = recentPractices.map((p) => p.id);
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

  const practicesWithProgress = recentPractices.map((practice) => {
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
    date: startOfDay.toISOString().split('T')[0],
    checkIn: todayCheckIn[0] ?? null,
    practices: practicesWithProgress,
  });
}
