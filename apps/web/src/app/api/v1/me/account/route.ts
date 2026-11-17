/**
 * The signed-in member's own account deletion.
 *
 * GET    /api/v1/me/account   { status: 'active' | 'pending', requestedAt } - whether a deletion the
 *                             member started is still unfinished (so the app can say so and offer to
 *                             finish it).
 * DELETE /api/v1/me/account   delete the account (or finish a deletion that stalled).
 *
 * Required for store release (Apple and Google both require in-app account deletion) and the point at
 * which the member's private journal is permanently erased. The ORDER of the steps is the safety design
 * (mark pending, purge the journal, delete the Clerk identity, finalise locally) - see
 * lib/account-deletion.ts for what each failure leaves behind and how it recovers.
 *
 *   200 { status: 'deleted' }            COMPLETE: every step succeeded. The only success that means "done".
 *   202 { status: 'pending' }            the identity is deleted but local cleanup is still finishing; the
 *                                         Clerk webhook completes it. The client signs out; it is NOT "done".
 *   409 SUBSCRIPTION_ACTIVE              a paid subscription is still running; cancel it first (details say how).
 *                                         Nothing changed.
 *   500 ACCOUNT_DELETION_FAILED          nothing changed; retry.
 *   502 ACCOUNT_DELETION_PENDING         deletion STARTED but did not finish: the journal is already locked and
 *                                         the member is still signed in. Retry to finish.
 *
 * Authenticates with `requireAuth` (a signed-in account), not `requireMemberAccess`, and not through the
 * journal guard: every account holder must be able to delete - and a member whose deletion is pending must
 * be able to retry. It takes no body and accepts no user id - it can only ever act on the caller.
 * Responses are private/no-store.
 */
import { requireAuth } from '@/lib/auth-api';
import { success, unauthorized, error } from '@/lib/api-response';
import { privateRoute } from '@/lib/private-response';
import { deleteAccount, getDeletionState, realAccountDeletionDeps } from '@/lib/account-deletion';

export const runtime = 'nodejs';

/** Where the member manages (and cancels) a membership: the website billing page, reached in the app from Profile → Membership & Access. */
const MANAGE_MEMBERSHIP_PATH = '/dashboard/billing';

// Next passes the request to a route handler; these deliberately read nothing from it (no body, no id).
/* eslint-disable @typescript-eslint/no-unused-vars */
export const GET = privateRoute('account deletion status', async (_request: Request) => {
  let user;
  try {
    user = await requireAuth();
  } catch {
    return unauthorized();
  }
  const state = await getDeletionState(user.id);
  return success({ status: state.status, requestedAt: state.requestedAt });
});

export const DELETE = privateRoute('account deletion', async (_request: Request) => {
  let user;
  try {
    user = await requireAuth();
  } catch {
    return unauthorized();
  }

  const result = await deleteAccount(user, await realAccountDeletionDeps());

  switch (result.status) {
    case 'deleted':
      return success({ status: 'deleted' });
    case 'pending_cleanup':
      return success({ status: 'pending' }, 202);
    case 'blocked_subscription':
      return error(
        'SUBSCRIPTION_ACTIVE',
        "Your membership is still active, so we can't delete your account yet. Cancel your membership first " +
          '(in the app: Profile → Membership & Access → Manage, which opens the website where you can cancel). ' +
          'Once your membership is set to end you can delete your account. Your account is unchanged and nothing was deleted.',
        409,
        {
          reason: 'ACTIVE_SUBSCRIPTION',
          nextStep: 'CANCEL_MEMBERSHIP',
          manageMembershipPath: MANAGE_MEMBERSHIP_PATH,
        },
      );
    case 'pending':
      return error(
        'ACCOUNT_DELETION_PENDING',
        'Your account deletion has started but is not finished. Your journal can no longer be accessed. ' +
          'Please try again to finish closing your account.',
        502,
        { status: 'pending', stage: result.stage, retry: true },
      );
    case 'failed':
      return error(
        'ACCOUNT_DELETION_FAILED',
        'We could not delete your account. Nothing was deleted. Please try again.',
        500,
        { stage: result.stage },
      );
  }
});
/* eslint-enable @typescript-eslint/no-unused-vars */
