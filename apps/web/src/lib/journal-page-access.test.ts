import { describe, expect, it, vi } from 'vitest';

class AccountDeletionPendingError extends Error {}
class DeletionStateUnavailableError extends Error {}
const mockRequire = vi.fn();
vi.mock('@/lib/journal-access', () => ({
  AccountDeletionPendingError,
  DeletionStateUnavailableError,
  requireJournalAccess: () => mockRequire(),
}));
const redirect = vi.fn((to: string) => {
  throw new Error(`REDIRECT:${to}`);
});
vi.mock('next/navigation', () => ({ redirect: (to: string) => redirect(to) }));

const { getJournalPageAccess } = await import('./journal-page-access');

describe('getJournalPageAccess', () => {
  it('returns the member id when access is allowed', async () => {
    mockRequire.mockResolvedValue({ id: 'u1' });
    expect(await getJournalPageAccess()).toEqual({ state: 'ok', userId: 'u1' });
  });
  it('reports a pending account deletion as locked, and an unanswerable check as unavailable', async () => {
    mockRequire.mockRejectedValue(new AccountDeletionPendingError());
    expect(await getJournalPageAccess()).toEqual({ state: 'locked' });
    mockRequire.mockRejectedValue(new DeletionStateUnavailableError());
    expect(await getJournalPageAccess()).toEqual({ state: 'unavailable' });
  });
  it('sends a signed-out visitor to sign in, and rethrows anything else', async () => {
    mockRequire.mockRejectedValue(new Error('UNAUTHENTICATED'));
    await expect(getJournalPageAccess()).rejects.toThrow('REDIRECT:/sign-in');
    mockRequire.mockRejectedValue(new Error('boom'));
    await expect(getJournalPageAccess()).rejects.toThrow('boom');
  });
});
