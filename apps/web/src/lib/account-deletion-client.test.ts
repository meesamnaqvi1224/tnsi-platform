import { describe, expect, it } from 'vitest';
import { DELETION_COPY, interpretDeletionResponse } from './account-deletion-client';

const SECRET = 'server text SECRET-TEXT';
const err = (code: string) => ({ error: { code, message: SECRET } });

describe('interpretDeletionResponse', () => {
  it('describes ONLY a real 200 "deleted" as complete', () => {
    expect(interpretDeletionResponse(200, { data: { status: 'deleted' } })).toEqual({
      kind: 'deleted',
    });
    // a 200 that does not say deleted is never treated as complete
    expect(interpretDeletionResponse(200, { data: {} }).kind).toBe('failed');
    expect(interpretDeletionResponse(200, null).kind).toBe('failed');
  });

  it('treats 202 as still finishing, never as complete', () => {
    expect(interpretDeletionResponse(202, { data: { status: 'pending' } }).kind).toBe('finishing');
  });

  it('explains an active subscription, says nothing was deleted, and points to billing', () => {
    const out = interpretDeletionResponse(409, err('SUBSCRIPTION_ACTIVE'));
    expect(out).toMatchObject({
      kind: 'subscription_active',
      message: DELETION_COPY.subscriptionActive,
      manageHref: '/dashboard/billing',
    });
    expect(DELETION_COPY.subscriptionActive).toContain('Nothing has been deleted');
  });

  it('reports a started-but-unfinished deletion as pending, and asks the member to retry', () => {
    const out = interpretDeletionResponse(502, err('ACCOUNT_DELETION_PENDING'));
    expect(out).toEqual({ kind: 'pending', message: DELETION_COPY.pending });
    expect(DELETION_COPY.pending).toContain('try again');
  });

  it('handles a signed-out session, a network failure and an unknown failure without claiming success', () => {
    expect(interpretDeletionResponse(401, err('UNAUTHENTICATED')).kind).toBe('signed_out');
    const net = interpretDeletionResponse(0, null);
    expect(net).toEqual({ kind: 'failed', message: DELETION_COPY.failed });
    expect(DELETION_COPY.failed).toContain('couldn’t confirm');
    expect(interpretDeletionResponse(500, err('ACCOUNT_DELETION_FAILED'))).toEqual({
      kind: 'failed',
      message: DELETION_COPY.failedKnown,
    });
    expect(DELETION_COPY.failedKnown).toContain('Nothing was deleted');
  });

  it('never repeats server error text', () => {
    for (const status of [0, 401, 409, 500, 502]) {
      expect(JSON.stringify(interpretDeletionResponse(status, err('X')))).not.toContain('SECRET');
    }
  });
});
