/**
 * The Return Path for the native mobile app: the practice row it is saved
 * against, the levels this member may start, and the practice's copy and
 * breath timings (the Sanity `returnPathContent` singleton merged over the
 * approved defaults, exactly as the web page uses it). The labyrinth itself
 * is generated on the device from `@tnsi/core`, never sent as an image.
 *
 * Same access rule as the web practice page: a Return Path the member cannot
 * open is refused with 403 `MEMBERSHIP_REQUIRED` and none of its content is
 * sent. The email-capture copy is public-web only and is not included.
 */
import { and, eq } from 'drizzle-orm';
import { MEMBER_RETURN_PATH_LEVELS, RETURN_PATH_KEY } from '@tnsi/core';
import { db } from '@tnsi/db';
import { practices } from '@tnsi/db/schema';
import { requireMemberAccess, memberAccessErrorResponse } from '@/lib/auth-api';
import { success, notFound, membershipRequired } from '@/lib/api-response';
import { contentAccessFor } from '@/lib/membership';
import { getReturnPathContent } from '@/content/cms/loaders';

export const runtime = 'nodejs';

export async function GET() {
  let user;
  try {
    user = await requireMemberAccess();
  } catch (err) {
    return memberAccessErrorResponse(err);
  }

  const rows = await db
    .select()
    .from(practices)
    .where(
      and(
        eq(practices.isPublished, true),
        eq(practices.contentType, 'interactive'),
        eq(practices.interactiveKey, RETURN_PATH_KEY),
      ),
    )
    .limit(1);
  const practice = rows[0];
  if (!practice) return notFound('The Return Path is not available');

  if (!contentAccessFor(user.entitlements).canOpen(practice)) return membershipRequired();

  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- dropped on purpose: public-web email capture, not for the app
  const { email: _email, ...content } = await getReturnPathContent();
  return success({
    practiceId: practice.id,
    allowedLevels: MEMBER_RETURN_PATH_LEVELS,
    content,
  });
}
