/**
 * This member's My Journey timeline - completed practice sessions and
 * check-ins, newest first. A dedicated endpoint rather than extending GET
 * .../practices/history: that route's whole contract is a practice-shaped
 * `PracticeHistoryEntry` (its consumers - the web Practice History page
 * and mobile's history screen - assume every entry has a title/duration),
 * and a journey entry can be a check-in instead, a genuinely different
 * shape. Query params reuse practiceHistoryListQuerySchema as-is rather
 * than adding a fourth near-identical limit/offset schema.
 */
import { requireMemberAccess, memberAccessErrorResponse } from '@/lib/auth-api';
import { getJourneyEntries } from '@/lib/journey';
import { practiceHistoryListQuerySchema } from '@/lib/validation';
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
  const parsed = practiceHistoryListQuerySchema.safeParse({
    limit: searchParams.get('limit') ?? undefined,
    offset: searchParams.get('offset') ?? undefined,
  });
  if (!parsed.success) {
    return badRequest('Invalid query parameters', { errors: parsed.error.flatten().fieldErrors });
  }
  const { limit, offset } = parsed.data;

  // getJourneyEntries itself always scopes by the given userId - this
  // route never accepts one from the client, only ever the authenticated
  // caller's own id.
  const { entries, hasMore } = await getJourneyEntries(user.id, limit, offset);

  return success({
    entries,
    pagination: { limit, offset, hasMore },
  });
}
