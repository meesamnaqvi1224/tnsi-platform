import { beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * /api/v1/me/account: authentication, status mapping, the wording members are shown, private headers,
 * and that it can only act on the caller.
 */
const state = vi.hoisted(() => ({
  authenticated: true,
  result: { status: 'deleted' } as Record<string, unknown>,
  deleteAccount: vi.fn(),
  deletionState: { status: 'active', requestedAt: null } as {
    status: 'active' | 'pending';
    requestedAt: Date | null;
  },
}));

vi.mock('@/lib/auth-api', () => ({
  requireAuth: async () => {
    if (!state.authenticated) throw new Error('UNAUTHENTICATED');
    return { id: 'user-A', clerkUserId: 'clerk_A' };
  },
}));
vi.mock('@/lib/account-deletion', () => ({
  deleteAccount: (...args: unknown[]) => state.deleteAccount(...args),
  getDeletionState: async () => state.deletionState,
  realAccountDeletionDeps: async () => ({ fake: 'deps' }),
}));

const { DELETE, GET } = await import('./route');
const NO_STORE = 'private, no-store, max-age=0';
const call = () => DELETE(new Request('http://x/api/v1/me/account', { method: 'DELETE' }));

beforeEach(() => {
  state.authenticated = true;
  state.deletionState = { status: 'active', requestedAt: null };
  state.deleteAccount.mockReset();
  state.deleteAccount.mockImplementation(async () => state.result);
  vi.spyOn(console, 'error').mockImplementation(() => {});
});

describe('DELETE /api/v1/me/account', () => {
  it('rejects an unauthenticated caller and deletes nothing', async () => {
    state.authenticated = false;
    const res = await call();
    expect(res.status).toBe(401);
    expect(res.headers.get('Cache-Control')).toBe(NO_STORE);
    expect(state.deleteAccount).not.toHaveBeenCalled();
  });

  it('acts only on the authenticated caller - there is no way to name another account', async () => {
    state.result = { status: 'deleted' };
    await DELETE(
      new Request('http://x/api/v1/me/account?id=user-B', {
        method: 'DELETE',
        body: JSON.stringify({ userId: 'user-B' }),
      }),
    );
    expect(state.deleteAccount).toHaveBeenCalledTimes(1);
    expect(state.deleteAccount.mock.calls[0]![0]).toMatchObject({
      id: 'user-A',
      clerkUserId: 'clerk_A',
    });
  });

  it('200 deleted ONLY when the sequence reports complete', async () => {
    state.result = { status: 'deleted' };
    const res = await call();
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ data: { status: 'deleted' } });
    expect(res.headers.get('Cache-Control')).toBe(NO_STORE);
  });

  it('202 pending (not 200) when local cleanup is still to be completed by the webhook', async () => {
    state.result = { status: 'pending_cleanup' };
    const res = await call();
    expect(res.status).toBe(202);
    expect(await res.json()).toEqual({ data: { status: 'pending' } });
  });

  it('every non-complete outcome is an error status, never a 2xx "deleted"', async () => {
    const outcomes: Record<string, unknown>[] = [
      { status: 'blocked_subscription' },
      { status: 'failed', stage: 'precheck' },
      { status: 'failed', stage: 'mark_pending' },
      { status: 'pending', stage: 'journal_purge' },
      { status: 'pending', stage: 'identity_provider' },
    ];
    for (const outcome of outcomes) {
      state.result = outcome;
      const res = await call();
      expect(res.status).toBeGreaterThanOrEqual(400);
      expect(JSON.stringify(await res.json())).not.toContain('"deleted"');
    }
  });

  it('409 explains WHY deletion is blocked and exactly what to do, and says nothing changed', async () => {
    state.result = { status: 'blocked_subscription' };
    const res = await call();
    expect(res.status).toBe(409);
    const { error } = await res.json();
    expect(error.code).toBe('SUBSCRIPTION_ACTIVE');
    expect(error.message).toContain('membership is still active');
    expect(error.message).toContain('Cancel your membership first');
    expect(error.message).toContain('Profile → Membership & Access → Manage');
    expect(error.message).toContain('set to end');
    expect(error.message).toContain('nothing was deleted');
    expect(error.details).toEqual({
      reason: 'ACTIVE_SUBSCRIPTION',
      nextStep: 'CANCEL_MEMBERSHIP',
      manageMembershipPath: '/dashboard/billing',
    });
  });

  it('500 "nothing was deleted" when it fails before anything started', async () => {
    for (const stage of ['precheck', 'mark_pending']) {
      state.result = { status: 'failed', stage };
      const res = await call();
      expect(res.status).toBe(500);
      const body = await res.json();
      expect(body.error.code).toBe('ACCOUNT_DELETION_FAILED');
      expect(body.error.message).toContain('Nothing was deleted');
      expect(res.headers.get('Cache-Control')).toBe(NO_STORE);
    }
  });

  it('502 PENDING when deletion started but did not finish - says the journal is no longer accessible and to retry', async () => {
    for (const stage of ['journal_purge', 'identity_provider']) {
      state.result = { status: 'pending', stage };
      const res = await call();
      expect(res.status).toBe(502);
      const { error } = await res.json();
      expect(error.code).toBe('ACCOUNT_DELETION_PENDING');
      expect(error.message).toContain('started but is not finished');
      expect(error.message).toContain('no longer be accessed');
      expect(error.message).toContain('try again');
      expect(error.message).not.toMatch(/has been deleted|was deleted|is deleted/);
      expect(error.details).toMatchObject({ status: 'pending', stage, retry: true });
    }
  });
});

describe('GET /api/v1/me/account', () => {
  const status = () => GET(new Request('http://x/api/v1/me/account'));

  it('rejects an unauthenticated caller', async () => {
    state.authenticated = false;
    const res = await status();
    expect(res.status).toBe(401);
    expect(res.headers.get('Cache-Control')).toBe(NO_STORE);
  });

  it('reports active when no deletion is in progress', async () => {
    const res = await status();
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ data: { status: 'active', requestedAt: null } });
    expect(res.headers.get('Cache-Control')).toBe(NO_STORE);
  });

  it('reports pending, with when it started, so the app can say so and offer to finish', async () => {
    state.deletionState = { status: 'pending', requestedAt: new Date('2026-11-12T10:00:00.000Z') };
    const body = await (await status()).json();
    expect(body.data).toEqual({ status: 'pending', requestedAt: '2026-11-12T10:00:00.000Z' });
  });
});
