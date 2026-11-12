import { ApiRequestError } from '@/api/types';

/** What the app should do after a failed DELETE /api/v1/me/account. */
export interface AccountDeletionFailure {
  /**
   * `subscription_active`: a paid membership is still running - nothing was changed; show the steps to
   *   cancel and a way to Membership & Access.
   * `pending`: deletion STARTED but did not finish. The journal is already locked and the member is
   *   still signed in; trying again finishes it. Never described as complete.
   * `signed_out`: the session is already gone (the account may already be deleted) - just sign out.
   * `failed`: nothing was changed (or we cannot tell); show the message and let the member try again.
   */
  kind: 'subscription_active' | 'pending' | 'signed_out' | 'failed';
  message: string;
}

export const SUBSCRIPTION_ACTIVE_MESSAGE =
  "Your membership is still active, so we can't delete your account yet.\n\n" +
  'To cancel it: open Membership & Access, tap the button under Manage (it opens the TNSI website), ' +
  'and cancel your membership there. Once your membership is set to end, come back and delete your account.\n\n' +
  'Your account is unchanged and nothing has been deleted.';

export const DELETION_PENDING_MESSAGE =
  "Your account deletion has started but isn't finished. Your journal can no longer be accessed. " +
  'Please try again to finish closing your account.';

/**
 * Honest wording for each way account deletion can fail. The server only ever reports `deleted` (200) or
 * `pending` (202: the identity is gone and local cleanup is finishing) as non-error outcomes, so anything
 * else lands here, and none of these messages claim a deletion that did not complete. They never echo
 * server error text.
 */
export function accountDeletionFailure(err: unknown): AccountDeletionFailure {
  if (err instanceof ApiRequestError) {
    if (err.status === 409 || err.code === 'SUBSCRIPTION_ACTIVE') {
      return { kind: 'subscription_active', message: SUBSCRIPTION_ACTIVE_MESSAGE };
    }
    if (err.status === 401) {
      return { kind: 'signed_out', message: 'You have been signed out.' };
    }
    if (err.status === 502 || err.code === 'ACCOUNT_DELETION_PENDING') {
      return { kind: 'pending', message: DELETION_PENDING_MESSAGE };
    }
    if (err.status === 0) {
      return {
        kind: 'failed',
        message:
          "We couldn't confirm that your account was deleted. Please check your connection and try again.",
      };
    }
  }
  return {
    kind: 'failed',
    message: "We couldn't delete your account. Nothing was deleted. Please try again.",
  };
}

export const DELETE_ACCOUNT_CONFIRMATION =
  'Your account will be closed and you will be signed out. Anything you have written in My Reflections is permanently deleted. This cannot be undone.';

/** The message shown when a deletion that was started earlier is still unfinished. */
export const PENDING_DELETION_NOTICE =
  "Your account deletion has started but isn't finished. Your journal can no longer be accessed. Tap below to finish closing your account.";

/**
 * What to tell the member once the server has answered successfully. `deleted` (200) is the ONLY outcome
 * described as complete; `pending` (202) says it is still finishing.
 */
export function accountDeletionOutcomeMessage(status: 'deleted' | 'pending'): {
  title: string;
  message: string;
} {
  return status === 'deleted'
    ? {
        title: 'Account deleted',
        message: 'Your account has been closed and your journal deleted.',
      }
    : {
        title: 'Deletion in progress',
        message:
          "You've been signed out. Your account is being closed and this can take a few minutes to finish.",
      };
}
