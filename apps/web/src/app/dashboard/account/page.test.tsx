import { beforeEach, describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';

const mockRequireAuthOrRedirect = vi.fn();
vi.mock('@/lib/auth-api', () => ({ requireAuthOrRedirect: () => mockRequireAuthOrRedirect() }));
const mockIsDeletionPending = vi.fn();
vi.mock('@/lib/deletion-state', () => ({
  isDeletionPending: (id: string) => mockIsDeletionPending(id),
}));

const { default: AccountPage, metadata } = await import('./page');

describe('/dashboard/account', () => {
  beforeEach(() => {
    mockRequireAuthOrRedirect.mockResolvedValue({ id: 'u1', email: 'member@example.test' });
    mockIsDeletionPending.mockResolvedValue(false);
  });

  it('is private (noindex) and open to any signed-in account, not only paying members', async () => {
    expect(JSON.stringify(metadata)).toMatch(/noindex|"index":false/i);
    const html = renderToStaticMarkup(await AccountPage());
    expect(html).toContain('Delete your account');
    expect(html).toContain('member@example.test');
    expect(html).toContain('href="/delete-account"');
    expect(mockIsDeletionPending).toHaveBeenCalledWith('u1');
  });

  it('offers the first step only: nothing is deleted by loading the page', async () => {
    const html = renderToStaticMarkup(await AccountPage());
    expect(html).toContain('Delete my account');
    expect(html).not.toContain('Permanently delete my account');
  });

  it('says so, and offers to finish, when a deletion was started earlier', async () => {
    mockIsDeletionPending.mockResolvedValue(true);
    const html = renderToStaticMarkup(await AccountPage());
    expect(html).toContain('deletion has started but');
    expect(html).toContain('Finish deleting my account');
  });
});
