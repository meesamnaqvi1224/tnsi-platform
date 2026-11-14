import { requireMemberAccess, memberAccessErrorResponse } from './auth-api';
import { error, internalError } from './api-response';
import { isDeletionPending } from './deletion-state';
import { safeErrorCode } from './private-response';

/** Thrown when a member whose account deletion has started tries to use the journal. */
export class AccountDeletionPendingError extends Error {
  constructor() {
    super('ACCOUNT_DELETION_PENDING');
    this.name = 'AccountDeletionPendingError';
  }
}

/**
 * Thrown when the deletion-pending check itself could not be answered (for example the database is
 * unreachable, or the table does not exist yet because migration 0014 has not been applied). The journal
 * fails CLOSED - nothing is served - but this is a server problem, never an authentication one: it must
 * not be reported as "unauthenticated" (which the app reads as "your session has ended").
 */
export class DeletionStateUnavailableError extends Error {
  constructor(readonly code: string) {
    super('DELETION_STATE_UNAVAILABLE');
    this.name = 'DeletionStateUnavailableError';
  }
}

/**
 * Who may use the journal: any signed-in member (`requireMemberAccess`) whose account is NOT in the
 * middle of being deleted. Once a member starts deleting their account (a row exists in
 * `account_deletion_requests`, written before anything is erased), every journal route refuses them:
 * nothing can be read, written, edited, deleted or RE-CREATED - including a retried create with an old
 * client id. That is what makes a half-finished deletion safe: the member cannot keep, or bring back,
 * writing that is being erased. The marker is one indexed primary-key lookup on its own table (nothing on
 * the sign-in path reads it), checked on every journal request so it can never be out of step with the
 * database.
 */
export async function requireJournalAccess() {
  const user = await requireMemberAccess();
  let pending: boolean;
  try {
    pending = await isDeletionPending(user.id);
  } catch (err) {
    throw new DeletionStateUnavailableError(safeErrorCode(err));
  }
  if (pending) throw new AccountDeletionPendingError();
  return user;
}

/**
 * 423 for a pending deletion; a generic 500 (logged as a label and a short code only) when the pending
 * check could not be answered; every other failure is the ordinary member-access response (401/403).
 */
export function journalAccessErrorResponse(err: unknown) {
  if (err instanceof AccountDeletionPendingError) {
    return error(
      'ACCOUNT_DELETION_PENDING',
      'Your account deletion is in progress, so your journal is no longer available.',
      423,
    );
  }
  if (err instanceof DeletionStateUnavailableError) {
    console.error('[journal access] deletion state unavailable', { code: err.code });
    return internalError();
  }
  return memberAccessErrorResponse(err);
}
