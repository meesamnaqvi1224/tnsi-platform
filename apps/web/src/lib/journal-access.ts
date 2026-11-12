import { requireMemberAccess, memberAccessErrorResponse } from './auth-api';
import { error } from './api-response';

/** Thrown when a member whose account deletion has started tries to use the journal. */
export class AccountDeletionPendingError extends Error {
  constructor() {
    super('ACCOUNT_DELETION_PENDING');
    this.name = 'AccountDeletionPendingError';
  }
}

/**
 * Who may use the journal: any signed-in member (`requireMemberAccess`) whose account is NOT in the
 * middle of being deleted. Once a member starts deleting their account (`users.deletion_requested_at` is
 * set, before anything is erased), every journal route refuses them: nothing can be read, written,
 * edited, deleted or RE-CREATED - including a retried create with an old client id. That is what makes
 * a half-finished deletion safe: the member cannot keep, or bring back, writing that is being erased.
 * The marker is read from the user row the auth layer already loads, so this costs no extra query and
 * cannot be out of step with the request.
 */
export async function requireJournalAccess() {
  const user = await requireMemberAccess();
  if (user.deletionRequestedAt) throw new AccountDeletionPendingError();
  return user;
}

/** 423 for a pending deletion; every other failure is the ordinary member-access response (401/403). */
export function journalAccessErrorResponse(err: unknown) {
  if (err instanceof AccountDeletionPendingError) {
    return error(
      'ACCOUNT_DELETION_PENDING',
      'Your account deletion is in progress, so your journal is no longer available.',
      423,
    );
  }
  return memberAccessErrorResponse(err);
}
