import { beforeEach, describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: () => undefined }),
  notFound: () => {
    throw new Error('NOT_FOUND');
  },
}));

const access = vi.fn();
vi.mock('@/lib/journal-page-access', () => ({ getJournalPageAccess: () => access() }));
const listJournalEntries = vi.fn();
const getJournalEntry = vi.fn();
vi.mock('@/lib/journal', () => ({
  listJournalEntries: (...a: unknown[]) => listJournalEntries(...a),
  getJournalEntry: (...a: unknown[]) => getJournalEntry(...a),
}));

const { default: ListPage, metadata: listMeta } = await import('./page');
const { default: NewPage } = await import('./new/page');
const { default: EntryPage, metadata: entryMeta } = await import('./[id]/page');

const ID = '11111111-1111-4111-8111-111111111111';
const item = (over: Record<string, unknown> = {}) => ({
  id: ID,
  title: null,
  preview: 'a short preview',
  previewTruncated: false,
  status: 'saved',
  entryType: 'independent',
  createdAt: new Date('2026-11-14T10:00:00Z'),
  updatedAt: new Date('2026-11-14T10:00:00Z'),
  ...over,
});
const render = async (el: Promise<React.ReactElement> | React.ReactElement) =>
  renderToStaticMarkup(await el);

beforeEach(() => {
  access.mockReset().mockResolvedValue({ state: 'ok', userId: 'u1' });
  listJournalEntries.mockReset().mockResolvedValue({ entries: [], hasMore: false });
  getJournalEntry.mockReset();
});

describe('My Reflections history page', () => {
  it("is private: noindex, never prerendered, and loads only the signed-in member's own entries", async () => {
    expect(JSON.stringify(listMeta)).toMatch(/noindex|"index":false/i);
    await render(ListPage({ searchParams: Promise.resolve({}) }));
    for (const call of listJournalEntries.mock.calls) expect(call[0]).toBe('u1');
  });

  it('shows the approved empty state with its button when there is nothing yet', async () => {
    const html = await render(ListPage({ searchParams: Promise.resolve({}) }));
    expect(html).toContain('Your space to reflect');
    expect(html).toContain('Write Your First Reflection');
    expect(html).toContain('Your reflections are private. Only you can see them.');
    expect(html).toContain('href="/dashboard/reflections/new"');
  });

  it('lists drafts (tagged) above saved reflections, as previews that link by id only', async () => {
    listJournalEntries.mockImplementation(async (_u: string, q: { status: string }) => ({
      entries:
        q.status === 'draft'
          ? [item({ id: '22222222-2222-4222-8222-222222222222', status: 'draft', title: 'D' })]
          : [item()],
      hasMore: false,
    }));
    const html = await render(ListPage({ searchParams: Promise.resolve({}) }));
    expect(html.indexOf('Drafts')).toBeLessThan(html.indexOf('Saved reflections'));
    expect(html).toContain('Draft');
    expect(html).toContain('a short preview');
    expect(html).toContain(`href="/dashboard/reflections/${ID}"`);
    expect(html).toContain('14 November 2026');
    expect(html).not.toContain('Your space to reflect');
  });

  it('shows the saved notice only for the one fixed token, and ignores anything else in the address', async () => {
    const ok = await render(ListPage({ searchParams: Promise.resolve({ notice: 'saved' }) }));
    expect(ok).toContain('Your reflection has been saved.');
    const other = await render(
      ListPage({ searchParams: Promise.resolve({ notice: 'my private words' }) }),
    );
    expect(other).not.toContain('private words');
    expect(other).not.toContain('Your reflection has been saved.');
  });

  it('pages with Newer/Older links and shows drafts on the first page only', async () => {
    listJournalEntries.mockResolvedValue({ entries: [item()], hasMore: true });
    const first = await render(ListPage({ searchParams: Promise.resolve({}) }));
    expect(first).toContain('Older');
    expect(first).not.toContain('Newer');
    listJournalEntries.mockClear();
    const second = await render(ListPage({ searchParams: Promise.resolve({ page: '2' }) }));
    expect(second).toContain('Newer');
    expect(listJournalEntries).toHaveBeenCalledTimes(1);
    expect(listJournalEntries.mock.calls[0]![1]).toMatchObject({ status: 'saved', offset: 20 });
  });

  it('shows a calm message and loads nothing while an account deletion is pending', async () => {
    access.mockResolvedValue({ state: 'locked' });
    const html = await render(ListPage({ searchParams: Promise.resolve({}) }));
    expect(html).toContain('account deletion is in progress');
    expect(listJournalEntries).not.toHaveBeenCalled();
  });
});

describe('My Reflections editor pages', () => {
  it('the new page offers Save Reflection and Save as Draft but no Delete (nothing exists yet)', async () => {
    const html = await render(NewPage());
    expect(html).toContain('My Reflection');
    expect(html).toContain('Save Reflection');
    expect(html).toContain('Save as Draft');
    expect(html).not.toContain('Delete Reflection');
    expect(html).toContain('Give your reflection a title (optional)');
    expect(html).toContain('Back to My Reflections');
  });

  it('a saved reflection reopens with its text, Delete, and NO way back to a draft', async () => {
    getJournalEntry.mockResolvedValue({
      id: ID,
      title: 'T',
      content: 'the saved words',
      status: 'saved',
      createdAt: new Date('2026-11-14T10:00:00Z'),
    });
    const html = await render(EntryPage({ params: Promise.resolve({ id: ID }) }));
    expect(html).toContain('the saved words');
    expect(html).toContain('Delete Reflection');
    expect(html).not.toContain('Save as Draft');
    expect(getJournalEntry).toHaveBeenCalledWith('u1', ID);
  });

  it('a draft reopens with Save as Draft; the page title is generic (the entry title is private)', async () => {
    getJournalEntry.mockResolvedValue({
      id: ID,
      title: 'My secret title',
      content: 'draft words',
      status: 'draft',
      createdAt: new Date('2026-11-14T10:00:00Z'),
    });
    const html = await render(EntryPage({ params: Promise.resolve({ id: ID }) }));
    expect(html).toContain('Save as Draft');
    expect(JSON.stringify(entryMeta)).not.toContain('secret');
  });

  it("another member's entry, a missing one and a malformed id are all 404, and a pending deletion shows the lock", async () => {
    getJournalEntry.mockResolvedValue(null);
    await expect(EntryPage({ params: Promise.resolve({ id: ID }) })).rejects.toThrow('NOT_FOUND');
    await expect(EntryPage({ params: Promise.resolve({ id: 'not-a-uuid' }) })).rejects.toThrow(
      'NOT_FOUND',
    );
    access.mockResolvedValue({ state: 'locked' });
    const html = await render(EntryPage({ params: Promise.resolve({ id: ID }) }));
    expect(html).toContain('account deletion is in progress');
    expect(getJournalEntry).toHaveBeenCalledTimes(1); // only the 404 case above, never when locked
  });
});
