/**
 * What the website should tell a member after DELETE /api/v1/me/account, kept free of React so every
 * outcome is tested. Mirrors the mobile app's mapping (apps/mobile/src/lib/account-deletion.ts): only a
 * real 200 is described as complete, and no message claims a deletion that did not finish. The server's own
 * error text is never shown.
 */
export type DeletionOutcome =
  /** 200: every step succeeded. */
  | { kind: 'deleted' }
  /** 202: the sign-in identity is gone and local cleanup is finishing. Not "complete". */
  | { kind: 'finishing' }
  /** 409: a paid membership is still running. Nothing changed. */
  | { kind: 'subscription_active'; message: string; manageHref: string }
  /** 502: deletion started but did not finish; the journal is already locked. Retrying finishes it. */
  | { kind: 'pending'; message: string }
  /** 401: the session is already gone (the account may already be deleted). */
  | { kind: 'signed_out'; message: string }
  /** Anything else, including a network failure: we cannot say it completed. */
  | { kind: 'failed'; message: string };

/** PROPOSED WORDING: tone approved in principle (16 Nov 2026); legal approval still required before release. */
export const DELETION_COPY = {
  subscriptionActive:
    'Your membership is still active, so we can’t delete your account yet. Cancel your membership first, then come back and delete your account. Nothing has been deleted.',
  pending:
    'Your account deletion has started but isn’t finished. Your reflections can no longer be opened. Please try again to finish closing your account.',
  signedOut: 'You have been signed out. If your account was deleted, there is nothing more to do.',
  failed:
    'We couldn’t confirm that your account was deleted. Please check your connection and try again.',
  failedKnown: 'We couldn’t delete your account. Nothing was deleted. Please try again.',
  // `deleted` is shown only for 200: every step, including the CRM contact, is confirmed. It names what
  // was deleted and says that some records are kept - it must never read as "all your data is gone".
  deleted:
    'Your account has been deleted. Your sign-in, your reflections, and your check-ins, practice history and saved practices have been deleted. A small number of records are kept where we are required to keep them, as explained on our Delete Your Account page.',
  // 202: the sign-in is gone and the journal is purged, but something is still being finished in the
  // background (the remaining account data, or the CRM contact). No time is promised.
  finishing:
    'Your sign-in has been removed and your reflections have been deleted. We are still finishing the removal of the rest of your account information. You don’t need to do anything else.',
} as const;

const MANAGE_MEMBERSHIP_HREF = '/dashboard/billing';

export function interpretDeletionResponse(status: number, body: unknown): DeletionOutcome {
  const data = (body as { data?: { status?: string } } | null)?.data;
  const code = (body as { error?: { code?: string } } | null)?.error?.code;

  if (status === 200 && data?.status === 'deleted') return { kind: 'deleted' };
  if (status === 202) return { kind: 'finishing' };
  if (status === 409 || code === 'SUBSCRIPTION_ACTIVE') {
    return {
      kind: 'subscription_active',
      message: DELETION_COPY.subscriptionActive,
      manageHref: MANAGE_MEMBERSHIP_HREF,
    };
  }
  if (status === 502 || code === 'ACCOUNT_DELETION_PENDING') {
    return { kind: 'pending', message: DELETION_COPY.pending };
  }
  if (status === 401) return { kind: 'signed_out', message: DELETION_COPY.signedOut };
  if (status === 0) return { kind: 'failed', message: DELETION_COPY.failed };
  return { kind: 'failed', message: DELETION_COPY.failedKnown };
}
