import { describe, expect, it } from 'vitest';
import { ApiRequestError } from '@/api/types';
import {
  accountDeletionFailure,
  accountDeletionOutcomeMessage,
  DELETE_ACCOUNT_CONFIRMATION,
  DELETION_PENDING_MESSAGE,
  PENDING_DELETION_NOTICE,
  SUBSCRIPTION_ACTIVE_MESSAGE,
} from './account-deletion';

const fail = (status: number, code: string) =>
  accountDeletionFailure(new ApiRequestError('server detail that must not be shown', status, code));

describe('accountDeletionFailure', () => {
  it('explains WHY deletion is blocked by an active subscription, and exactly what to do', () => {
    const result = fail(409, 'SUBSCRIPTION_ACTIVE');
    expect(result.kind).toBe('subscription_active');
    expect(result.message).toBe(SUBSCRIPTION_ACTIVE_MESSAGE);
    // why
    expect(result.message).toContain('membership is still active');
    // what to do, step by step
    expect(result.message).toContain('Membership & Access');
    expect(result.message).toContain('Manage');
    expect(result.message).toContain('opens the TNSI website');
    expect(result.message).toContain('cancel your membership there');
    expect(result.message).toContain('set to end');
    expect(result.message).toContain('come back and delete your account');
    // and that nothing changed
    expect(result.message).toContain('nothing has been deleted');
  });

  it('is also recognised by status alone', () => {
    expect(fail(409, 'WHATEVER').kind).toBe('subscription_active');
  });

  it('treats a lost session as signed out', () => {
    expect(fail(401, 'UNAUTHENTICATED').kind).toBe('signed_out');
  });

  it('reports a started-but-unfinished deletion as PENDING: journal no longer accessible, try again - and never as complete', () => {
    for (const result of [fail(502, 'ACCOUNT_DELETION_PENDING'), fail(502, 'OTHER')]) {
      expect(result.kind).toBe('pending');
      expect(result.message).toBe(DELETION_PENDING_MESSAGE);
      expect(result.message).toContain("isn't finished");
      expect(result.message).toContain('no longer be accessed');
      expect(result.message).toContain('try again');
      expect(result.message).not.toMatch(/has been (deleted|closed)|was deleted|is deleted/i);
    }
  });

  it('does not claim success or failure it cannot know when the network failed', () => {
    const result = fail(0, 'NETWORK_ERROR');
    expect(result.kind).toBe('failed');
    expect(result.message).toContain("couldn't confirm");
  });

  it('says nothing was deleted for an ordinary server failure', () => {
    expect(fail(500, 'ACCOUNT_DELETION_FAILED').message).toContain('Nothing was deleted');
  });

  it('never shows server error text, and handles non-API errors', () => {
    for (const err of [
      new ApiRequestError('SECRET server detail', 500, 'X'),
      new Error('boom'),
      null,
      'x',
    ]) {
      expect(accountDeletionFailure(err).message).not.toContain('SECRET');
    }
    expect(accountDeletionFailure(new Error('boom')).kind).toBe('failed');
  });
});

describe('what the member is told', () => {
  it('the confirmation says what is lost and that it cannot be undone', () => {
    expect(DELETE_ACCOUNT_CONFIRMATION).toContain('permanently deleted');
    expect(DELETE_ACCOUNT_CONFIRMATION).toContain('cannot be undone');
  });

  it('only `deleted` is described as complete; `pending` says it is still finishing', () => {
    const done = accountDeletionOutcomeMessage('deleted');
    expect(done.title).toBe('Account deleted');
    expect(done.message).toContain('has been closed');

    const pending = accountDeletionOutcomeMessage('pending');
    expect(pending.title).toBe('Deletion in progress');
    expect(pending.message).toContain('being closed');
    expect(pending.message).toContain('few minutes');
    expect(`${pending.title} ${pending.message}`).not.toMatch(
      /has been (closed|deleted)|account deleted/i,
    );
  });

  it('the pending notice says it is unfinished and offers the next step', () => {
    expect(PENDING_DELETION_NOTICE).toContain("isn't finished");
    expect(PENDING_DELETION_NOTICE).toContain('finish closing your account');
  });
});
