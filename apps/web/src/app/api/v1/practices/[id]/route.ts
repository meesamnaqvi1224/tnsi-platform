import { getAuthUser } from '@/lib/auth-api';
import { db } from '@tnsi/db';
import { practices, practiceCompletions } from '@tnsi/db/schema';
import { eq, and } from 'drizzle-orm';
import { practiceIdParam } from '@/lib/validation';
import { success, unauthorized, notFound } from '@/lib/api-response';

export const runtime = 'nodejs';

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(request: Request, { params }: RouteParams) {
  const user = await getAuthUser();
  if (!user) return unauthorized();

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

  const completion = await db
    .select()
    .from(practiceCompletions)
    .where(and(eq(practiceCompletions.userId, user.id), eq(practiceCompletions.practiceId, id)))
    .limit(1);

  return success({
    ...practice[0],
    progress: completion[0]
      ? {
          progressPct: completion[0].progressPct,
          positionSeconds: completion[0].positionSeconds,
          completed: completion[0].completed,
          completedAt: completion[0].completedAt,
          playCount: completion[0].playCount,
          lastPlayedAt: completion[0].lastPlayedAt,
        }
      : null,
  });
}
