/**
 * With MY_REFLECTIONS_ENABLED off, the journal is invisible and unusable: the shared access check
 * refuses before anything about the member is consulted, the API answers 404, the pages 404, and the
 * features endpoint says so (the mobile app hides its entry points from it).
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const requireMemberAccess = vi.fn();
const notFound = vi.fn(() => {
  throw new Error('NEXT_NOT_FOUND');
});
vi.mock('./auth-api', () => ({
  requireMemberAccess: (...a: unknown[]) => requireMemberAccess(...a),
  memberAccessErrorResponse: () => new Response(null, { status: 401 }),
}));
vi.mock('./deletion-state', () => ({
  isDeletionPending: vi.fn().mockResolvedValue(false),
  AccountDeletionPendingError: class extends Error {},
}));
vi.mock('./journal-consent', () => ({ JournalConsentRequiredError: class extends Error {} }));
vi.mock('next/navigation', () => ({
  notFound: () => notFound(),
  redirect: vi.fn(),
}));

beforeEach(() => {
  requireMemberAccess.mockReset();
  requireMemberAccess.mockResolvedValue({ id: 'user-1' });
});
afterEach(() => vi.unstubAllEnvs());

describe('journal access with the switch OFF', () => {
  it('refuses before consulting the member, and the response is a plain 404', async () => {
    vi.stubEnv('MY_REFLECTIONS_ENABLED', 'false');
    const { requireJournalAccess, journalAccessErrorResponse } = await import('./journal-access');
    let caught: unknown;
    await requireJournalAccess().catch((e) => (caught = e));
    expect(caught).toBeDefined();
    expect(requireMemberAccess).not.toHaveBeenCalled();
    const res = journalAccessErrorResponse(caught);
    expect(res.status).toBe(404);
    expect(JSON.stringify(await res.json())).not.toMatch(/reflection|journal|disabled/i);
  });

  it('works normally when the switch is ON', async () => {
    vi.stubEnv('MY_REFLECTIONS_ENABLED', 'true');
    const { requireJournalAccess } = await import('./journal-access');
    await expect(requireJournalAccess()).resolves.toEqual({ id: 'user-1' });
  });

  it('page access turns into a 404 page when OFF', async () => {
    vi.stubEnv('MY_REFLECTIONS_ENABLED', '');
    const { getJournalPageAccess } = await import('./journal-page-access');
    await expect(getJournalPageAccess()).rejects.toThrow('NEXT_NOT_FOUND');
    expect(notFound).toHaveBeenCalled();
  });
});
