/**
 * This member's practice history, newest completed session first — real
 * Practice History (see packages/db/src/schema/practice-completions.ts's
 * own comment): every completed session is its own row, including repeat
 * sessions of the same practice. Read-only; completion/reflection are
 * still recorded via the existing POST .../complete and
 * POST .../[id]/reflection routes, unchanged by this endpoint.
 */
import { requireMemberAccess, memberAccessErrorResponse } from '@/lib/auth-api';
import { getPracticeHistory } from '@/lib/practices';
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

  // getPracticeHistory itself always scopes by the given userId - this
  // route never accepts one from the client, only ever uses the
  // authenticated caller's own id, so a member can never read another
  // member's history.
  const { history, hasMore } = await getPracticeHistory(user.id, limit, offset);

  return success({
    history,
    pagination: { limit, offset, hasMore },
  });
}
