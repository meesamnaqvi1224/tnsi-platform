/**
 * GET /api/v1/features - which optional features this deployment has switched on, for the apps to decide
 * what to SHOW (the server still refuses the feature's own routes when it is off). Signed-in members
 * only (the dashboard middleware protects every non-public /api/v1 route). Private, no-store, no member
 * data: it reads server configuration only.
 */
import { success } from '@/lib/api-response';
import { privateRoute } from '@/lib/private-response';
import { requireMemberAccess, memberAccessErrorResponse } from '@/lib/auth-api';
import { isReflectionsEnabled } from '@/lib/reflections-flag';
import { isCheckInFollowUpEnabled } from '@/lib/check-in-follow-up-flag';

export const runtime = 'nodejs';

export const GET = privateRoute('features get', async () => {
  try {
    await requireMemberAccess();
  } catch (err) {
    return memberAccessErrorResponse(err);
  }
  return success({
    reflections: isReflectionsEnabled(),
    checkInFollowUp: isCheckInFollowUpEnabled(),
  });
});
