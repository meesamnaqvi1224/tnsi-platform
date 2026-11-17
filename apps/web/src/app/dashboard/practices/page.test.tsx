import { beforeEach, describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';

/**
 * Practice Library page: the condition filter, sort, "Start here", the
 * locked-practice state and the empty states. Auth, membership and the data
 * layer are mocked at the module boundary - no Clerk session or database.
 */

vi.mock('@/lib/auth-api', () => ({
  requireMemberAccessOrRedirect: () => Promise.resolve({ id: 'user-1', entitlements: {} }),
}));

vi.mock('@/lib/membership', () => ({
  contentAccessFor: () => ({ canOpen: (practice: { id: string }) => practice.id !== 'locked' }),
}));

const mockGetPublishedPractices = vi.fn();
const mockGetPracticeCompletion = vi.fn();
vi.mock('@/lib/practices', () => ({
  formatContentTypeLabel: (value: string) => value.charAt(0).toUpperCase() + value.slice(1),
  formatPracticeDuration: (seconds: number | null) =>
    seconds ? `${Math.round(seconds / 60)} min` : null,
  getPracticeCompletion: (...args: unknown[]) => mockGetPracticeCompletion(...args),
  getPublishedPractices: () => mockGetPublishedPractices(),
  isPracticeSaved: () => Promise.resolve(false),
}));

const Page = (await import('./page')).default;

function practice(
  id: string,
  overrides: Partial<{
    title: string;
    description: string | null;
    contentType: string;
    interactiveKey: string | null;
    durationSeconds: number | null;
    tags: string[];
  }> = {},
) {
  return {
    id,
    title: overrides.title ?? id,
    description: overrides.description ?? `About ${id}.`,
    contentType: overrides.contentType ?? 'video',
    mediaUrl: null,
    interactiveKey: overrides.interactiveKey ?? null,
    thumbnailUrl: null,
    durationSeconds: overrides.durationSeconds ?? 600,
    category: null,
    tags: overrides.tags ?? [],
    difficulty: 1,
    isFree: false,
  };
}

async function render(search: Record<string, string> = {}) {
  return renderToStaticMarkup(await Page({ searchParams: Promise.resolve(search) }));
}

function text(html: string): string {
  return html
    .replace(/<[^>]+>/g, ' ')
    .replace(/&#x27;/g, "'")
    .replace(/\s+/g, ' ');
}

beforeEach(() => {
  vi.clearAllMocks();
  mockGetPracticeCompletion.mockResolvedValue(null);
  mockGetPublishedPractices.mockResolvedValue([
    practice('rp', {
      title: 'The Return Path',
      contentType: 'interactive',
      interactiveKey: 'the-return-path',
      durationSeconds: 240,
    }),
    practice('a', { title: 'Root to Rise', durationSeconds: 1080, tags: ['Safety', 'Expansion'] }),
    practice('b', {
      title: 'The Mountain State',
      durationSeconds: 600,
      tags: ['Capacity', 'Safety'],
    }),
    practice('c', {
      title: 'The Forest Walk',
      durationSeconds: 720,
      tags: ['Availability', 'Safety'],
    }),
  ]);
});

describe('PracticeLibraryPage — condition filter', () => {
  it('offers only the conditions that some practice carries, and never Participation when none does', async () => {
    const t = text(await render());
    for (const name of ['Safety', 'Capacity', 'Availability', 'Expansion'])
      expect(t).toContain(name);
    expect(t).not.toContain('Participation');
  });

  it('narrows the list to practices carrying the chosen condition, with a count', async () => {
    const html = await render({ condition: 'Capacity' });
    const t = text(html);
    expect(t).toContain('The Mountain State');
    expect(t).not.toContain('Root to Rise');
    expect(t).not.toContain('The Forest Walk');
    expect(t).toContain('Showing 1 of 4');
  });

  it('treats an unknown or mistyped condition as no filter', async () => {
    const t = text(await render({ condition: 'nonsense' }));
    expect(t).toContain('Root to Rise');
    expect(t).toContain('The Mountain State');
    expect(t).not.toContain('Showing');
  });

  it('a condition chip on a card links to that filter', async () => {
    expect(await render()).toContain('href="/dashboard/practices?condition=Expansion"');
  });

  it('keeps the other filters when one is chosen', async () => {
    const html = await render({ contentType: 'video' });
    expect(html).toContain('contentType=video');
    expect(html).toContain('condition=Safety');
  });
});

describe('PracticeLibraryPage — sort', () => {
  // A member who has begun something, so the "Start here" strip (which also names The Return Path) is not on the page.
  beforeEach(() => {
    mockGetPracticeCompletion.mockImplementation((_user: string, id: string) =>
      Promise.resolve(id === 'a' ? { completed: false, progressPct: 0.4 } : null),
    );
  });

  it('puts the shortest practice first when asked', async () => {
    const t = text(await render({ sort: 'shortest' }));
    expect(t.indexOf('The Return Path')).toBeLessThan(t.indexOf('The Mountain State'));
    expect(t.indexOf('The Mountain State')).toBeLessThan(t.indexOf('Root to Rise'));
  });

  it('puts the longest first for longest, and ignores an unknown sort', async () => {
    const longest = text(await render({ sort: 'longest' }));
    expect(longest.indexOf('Root to Rise')).toBeLessThan(longest.indexOf('The Return Path'));
    const unknown = text(await render({ sort: 'bogus' }));
    expect(unknown.indexOf('The Return Path')).toBeLessThan(unknown.indexOf('Root to Rise'));
  });
});

describe('PracticeLibraryPage — Start here', () => {
  it('points a member who has not begun anything at The Return Path', async () => {
    const html = await render();
    expect(text(html)).toContain('Start here');
    expect(html).toContain('href="/dashboard/practices/rp"');
  });

  it('is hidden once the member has started anything, and while a filter is active', async () => {
    mockGetPracticeCompletion.mockImplementation((_user: string, id: string) =>
      Promise.resolve(id === 'a' ? { completed: false, progressPct: 0.4 } : null),
    );
    expect(text(await render())).not.toContain('Start here');
    mockGetPracticeCompletion.mockResolvedValue(null);
    expect(text(await render({ condition: 'Safety' }))).not.toContain('Start here');
  });
});

describe('PracticeLibraryPage — cards and states', () => {
  it('shows the count, a save control per openable practice and a duration chip', async () => {
    const html = await render();
    expect(text(html)).toContain('4 practices');
    expect(html).toContain('aria-label="Save practice"');
    expect(text(html)).toContain('18 min');
  });

  it('a locked practice shows Members and cannot be saved', async () => {
    mockGetPublishedPractices.mockResolvedValue([practice('locked', { title: 'Locked one' })]);
    const html = await render();
    expect(text(html)).toContain('Members');
    expect(html).not.toContain('aria-label="Save practice"');
  });

  it('keeps tags that are not conditions, as plain chips', async () => {
    mockGetPublishedPractices.mockResolvedValue([practice('t', { tags: ['Safety', 'sleep'] })]);
    const t = text(await render());
    expect(t).toContain('Safety');
    expect(t).toContain('sleep');
  });

  it('shows the empty state for an empty library and for filters that match nothing', async () => {
    mockGetPublishedPractices.mockResolvedValue([]);
    expect(text(await render())).toContain('Practices are being prepared.');
    mockGetPublishedPractices.mockResolvedValue([practice('a', { tags: ['Safety'] })]);
    expect(text(await render({ q: 'zzz' }))).toContain('No practices match these filters.');
  });
});
