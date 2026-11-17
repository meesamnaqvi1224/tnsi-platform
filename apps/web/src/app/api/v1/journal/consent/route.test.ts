import { beforeEach, describe, expect, it, vi } from 'vitest';
import { JOURNAL_CONSENT_VERSION } from '@tnsi/core';

const state = vi.hoisted(() => ({
  access: 'member' as 'member' | 'pending' | 'unauth',
  record: vi.fn(),
  withdraw: vi.fn(),
  get: vi.fn(),
}));

vi.mock('@/lib/auth-api', () => ({
  requireMemberAccess: async () => {
    if (state.access === 'unauth') throw new Error('UNAUTHENTICATED');
    return { id: 'user-1' };
  },
  memberAccessErrorResponse: () => new Response(null, { status: 401 }),
}));
vi.mock('@/lib/deletion-state', () => ({
  AccountDeletionPendingError: class AccountDeletionPendingError extends Error {},
  isDeletionPending: async () => state.access === 'pending',
}));
vi.mock('@/lib/journal-consent', () => ({
  JournalConsentRequiredError: class JournalConsentRequiredError extends Error {},
  getJournalConsent: (...a: unknown[]) => state.get(...a),
  recordJournalConsent: (...a: unknown[]) => state.record(...a),
  withdrawJournalConsent: (...a: unknown[]) => state.withdraw(...a),
}));

const { GET, POST, DELETE } = await import('./route');

const NO_STORE = 'private, no-store, max-age=0';
const del = (qs = '') => new Request(`http://x/api/v1/journal/consent${qs}`, { method: 'DELETE' });
const post = (body: unknown) =>
  new Request('http://x', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: typeof body === 'string' ? body : JSON.stringify(body),
  });
const GRANTED = { status: 'granted', version: JOURNAL_CONSENT_VERSION };

beforeEach(() => {
  state.access = 'member';
  state.record.mockReset().mockResolvedValue({ kind: 'recorded', state: GRANTED });
  state.withdraw
    .mockReset()
    .mockResolvedValue({ status: 'withdrawn', version: JOURNAL_CONSENT_VERSION });
  state.get.mockReset().mockResolvedValue({ status: 'required', version: JOURNAL_CONSENT_VERSION });
});

describe('/api/v1/journal/consent', () => {
  it('GET returns the member’s own state, private and uncached', async () => {
    const res = await GET();
    expect(res.status).toBe(200);
    expect(res.headers.get('cache-control')).toBe(NO_STORE);
    expect((await res.json()).data).toEqual({
      status: 'required',
      version: JOURNAL_CONSENT_VERSION,
    });
    expect(state.get).toHaveBeenCalledWith('user-1');
  });

  it('POST records the version for the authenticated member only (never one from the body)', async () => {
    const res = await POST(post({ version: JOURNAL_CONSENT_VERSION }));
    expect(res.status).toBe(200);
    expect(state.record).toHaveBeenCalledWith('user-1', JOURNAL_CONSENT_VERSION);
    expect((await res.json()).data.status).toBe('granted');
  });

  it('POST refuses a stale notice version with 409', async () => {
    state.record.mockResolvedValue({ kind: 'stale_version' });
    const res = await POST(post({ version: 'old' }));
    expect(res.status).toBe(409);
    expect((await res.json()).error.code).toBe('CONSENT_VERSION_MISMATCH');
  });

  it.each([['not json'], [{}], [{ version: '' }], [{ version: 'x', userId: 'someone-else' }]])(
    'POST rejects a bad body (%j) with 400 and records nothing',
    async (body) => {
      const res = await POST(post(body));
      expect(res.status).toBe(400);
      expect(state.record).not.toHaveBeenCalled();
    },
  );

  it('DELETE withdraws for the authenticated member', async () => {
    const res = await DELETE(del());
    expect(res.status).toBe(200);
    expect(state.withdraw).toHaveBeenCalledWith('user-1', { deleteEntries: false });
    expect((await res.json()).data.status).toBe('withdrawn');
  });

  it('DELETE ?entries=delete passes the member’s choice to delete every reflection, and nothing else', async () => {
    state.withdraw.mockResolvedValueOnce({
      status: 'withdrawn',
      version: JOURNAL_CONSENT_VERSION,
      deletedEntries: 3,
    });
    const res = await DELETE(del('?entries=delete'));
    expect(res.status).toBe(200);
    expect(state.withdraw).toHaveBeenCalledWith('user-1', { deleteEntries: true });
    expect((await res.json()).data.deletedEntries).toBe(3);
  });

  it.each(['?entries=keep', '?entries=', '?entries=DELETE', '?all=true'])(
    'DELETE %s does NOT delete reflections (only the exact choice does)',
    async (qs) => {
      await DELETE(del(qs));
      expect(state.withdraw).toHaveBeenCalledWith('user-1', { deleteEntries: false });
    },
  );

  it('a member whose account deletion is pending gets 423 from all three, and nothing is touched', async () => {
    state.access = 'pending';
    expect((await GET()).status).toBe(423);
    expect((await POST(post({ version: JOURNAL_CONSENT_VERSION }))).status).toBe(423);
    expect((await DELETE(del())).status).toBe(423);
    expect(state.get).not.toHaveBeenCalled();
    expect(state.record).not.toHaveBeenCalled();
    expect(state.withdraw).not.toHaveBeenCalled();
  });

  it('a signed-out caller is refused and nothing is touched', async () => {
    state.access = 'unauth';
    expect((await GET()).status).toBe(401);
    expect((await POST(post({ version: JOURNAL_CONSENT_VERSION }))).status).toBe(401);
    expect((await DELETE(del())).status).toBe(401);
    expect(state.record).not.toHaveBeenCalled();
  });
});
