/**
 * This member's saved practices, most recently saved first. See
 * getSavedPractices's own comment for how an unpublished-but-saved
 * practice is handled (excluded from this list, save row untouched).
 */
import { requireMemberAccess, memberAccessErrorResponse } from '@/lib/auth-api';
import { getSavedPractices } from '@/lib/practices';
import { success } from '@/lib/api-response';

export const runtime = 'nodejs';

export async function GET() {
  let user;
  try {
    user = await requireMemberAccess();
  } catch (err) {
    return memberAccessErrorResponse(err);
  }

  // getSavedPractices always scopes by the given userId - this route
  // never accepts one from the client, only ever the authenticated
  // caller's own id.
  const practices = await getSavedPractices(user.id);

  return success({ practices });
}
