import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';

/**
 * Dashboard home page tests, scoped to the new Somatic Cards discovery
 * tile - not a full re-test of every existing section (check-in,
 * in-progress practices, articles, etc. already have their own coverage
 * elsewhere). Every data dependency is mocked at the module boundary,
 * matching `dashboard/somatic-cards/somatic-cards-pages.test.tsx`'s
 * pattern - no real Clerk session or database.
 */

const mockRequireMemberAccessOrRedirect = vi.fn();
vi.mock('@/lib/auth-api', () => ({
  requireMemberAccessOrRedirect: () => mockRequireMemberAccessOrRedirect(),
}));

const mockGetTodayCheckIn = vi.fn();
const mockGetCheckInHistory = vi.fn();
vi.mock('@/lib/check-ins', () => ({
  getTodayCheckIn: () => mockGetTodayCheckIn(),
  getCheckInHistory: () => mockGetCheckInHistory(),
}));

const mockGetHetSuggestions = vi.fn();
vi.mock('@/lib/het-suggestions', () => ({
  getHetSuggestions: (...args: unknown[]) => mockGetHetSuggestions(...args),
}));
const mockGetTodayPractice = vi.fn();
vi.mock('@/lib/practices', () => ({
  formatContentTypeLabel: (v: string) => v,
  formatPracticeDuration: () => '5 min',
  getCompletedPracticeCount: () => Promise.resolve(0),
  getInProgressPracticeCount: () => Promise.resolve(0),
  getInProgressPractices: () => Promise.resolve([]),
  getRecentCompletions: () => Promise.resolve([]),
  getTodayPractice: () => mockGetTodayPractice(),
}));

const mockFetchSomaticSeriesList = vi.fn();
const mockFetchSomaticSeriesDetail = vi.fn();
vi.mock('@/lib/somatic-cards-client', () => ({
  fetchSomaticSeriesList: () => mockFetchSomaticSeriesList(),
  fetchSomaticSeriesDetail: (slug: string) => mockFetchSomaticSeriesDetail(slug),
}));

vi.mock('@/content/cms/loaders', () => ({ getLatestArticles: () => Promise.resolve([]) }));
vi.mock('@/content/articles', () => ({ articlesContent: { categories: { items: [] } } }));

const DashboardPage = (await import('./page')).default;

beforeEach(() => {
  vi.clearAllMocks();
  mockRequireMemberAccessOrRedirect.mockResolvedValue({
    id: 'user-1',
    fullName: 'Test User',
    entitlements: { tier: 'free' },
  });
  mockGetTodayCheckIn.mockResolvedValue(null);
  mockGetCheckInHistory.mockResolvedValue({ checkIns: [] });
  mockGetTodayPractice.mockResolvedValue(null);
  mockGetHetSuggestions.mockResolvedValue({ condition: null, items: [] });
  mockFetchSomaticSeriesList.mockResolvedValue({
    status: 'ok',
    data: [
      { id: 's1', seriesNumber: 1, title: 'Support, Pressure & Proprioception', slug: 's1' },
      { id: 's2', seriesNumber: 2, title: 'Breath & Cardiorespiratory Rhythm', slug: 's2' },
    ],
  });
  mockFetchSomaticSeriesDetail.mockResolvedValue({ status: 'ok', data: { cards: [] } });
});

describe('DashboardPage — Somatic Cards discovery tile', () => {
  it('renders a Somatic Cards tile with the expected copy and CTA', async () => {
    const html = renderToStaticMarkup(await DashboardPage());
    expect(html).toContain('Somatic Cards');
    expect(html).toContain('Explore the Core Series');
    expect(html).toContain('Explore Cards');
  });

  it('the tile links to /dashboard/somatic-cards', async () => {
    const html = renderToStaticMarkup(await DashboardPage());
    expect(html).toContain('href="/dashboard/somatic-cards"');
  });

  it('shows a dynamic series count from the API, not a hardcoded number', async () => {
    mockFetchSomaticSeriesList.mockResolvedValueOnce({
      status: 'ok',
      data: Array.from({ length: 9 }, (_, i) => ({
        id: `s${i}`,
        seriesNumber: i + 1,
        title: `Series ${i + 1}`,
        slug: `s${i}`,
      })),
    });
    const html = renderToStaticMarkup(await DashboardPage());
    expect(html).toContain('9 series available');
  });

  it('degrades gracefully (no crash, no count shown) when the Somatic API errors', async () => {
    mockFetchSomaticSeriesList.mockResolvedValueOnce({ status: 'error' });
    const html = renderToStaticMarkup(await DashboardPage());
    expect(html).toContain('Somatic Cards');
    expect(html).not.toContain('series available');
  });

  it('does not replace or alter the existing Today’s Practice card', async () => {
    const html = renderToStaticMarkup(await DashboardPage());
    expect(html).toContain('Today&#x27;s Practice');
    expect(html).toContain('Visit the Practice Library');
  });

  it('does not alter the existing Check In card', async () => {
    const html = renderToStaticMarkup(await DashboardPage());
    expect(html).toContain('Pause for a moment.');
  });
});

describe('DashboardPage — Your Access follows the resolved membership', () => {
  const user = (entitlements: Record<string, unknown>) => ({
    id: 'user-1',
    fullName: 'Test User',
    entitlements,
  });

  it('an ended membership renders as a Free Member, whatever plan the row last held', async () => {
    mockRequireMemberAccessOrRedirect.mockResolvedValue(
      user({ tier: 'monthly', status: 'canceled', programs: [], certifications: [], features: [] }),
    );
    const html = renderToStaticMarkup(await DashboardPage());
    expect(html).toContain('Free Member');
    expect(html).toContain('Your paid membership has ended. Your free account remains active.');
    expect(html).not.toContain('Monthly Member');
  });

  it('a paying member still sees their plan', async () => {
    mockRequireMemberAccessOrRedirect.mockResolvedValue(
      user({ tier: 'annual', status: 'active', programs: [], certifications: [], features: [] }),
    );
    const html = renderToStaticMarkup(await DashboardPage());
    expect(html).toContain('Annual Member');
    expect(html).not.toContain('paid membership has ended');
  });

  it('a member in their free trial is a Trial Membership, not a Free Member', async () => {
    const DAY = 24 * 60 * 60 * 1000;
    mockRequireMemberAccessOrRedirect.mockResolvedValue(
      user({
        tier: 'free',
        status: 'active',
        programs: [],
        certifications: [],
        features: [],
        trialStartedAt: new Date(Date.now() - 3 * DAY),
        trialEndsAt: new Date(Date.now() + 27 * DAY),
      }),
    );
    const html = renderToStaticMarkup(await DashboardPage());
    expect(html).toContain('Trial · Day 4 of 30');
    expect(html).toContain('Your free trial ends on');
    expect(html).not.toContain('Free Member');
  });
});

describe('DashboardPage — one clear next step', () => {
  it('offers the check-in first when the member has not checked in today', async () => {
    const html = renderToStaticMarkup(await DashboardPage());
    expect(html).toContain('Check in today');
    expect(html).toContain('href="#check-in"');
  });

  it('once checked in, points at today’s practice instead', async () => {
    mockGetTodayCheckIn.mockResolvedValue({ id: 'c1' });
    mockGetTodayPractice.mockResolvedValue({
      practice: {
        id: 'p1',
        title: 'Future Self Integration',
        description: null,
        contentType: 'audio',
        durationSeconds: 600,
        category: null,
        difficulty: 1,
      },
      completed: false,
    });
    const html = renderToStaticMarkup(await DashboardPage());
    expect(html).not.toContain('Check in today');
    expect(html).toContain('Begin practice');
    expect(html).toContain('href="/dashboard/practices/p1"');
  });

  it('no longer carries the placeholder Account block', async () => {
    const html = renderToStaticMarkup(await DashboardPage());
    expect(html).not.toContain('Manage your account details');
  });
});

describe('DashboardPage — More for today (Human Expansion Theory suggestions)', () => {
  const practice = {
    id: 'p1',
    title: 'The Mountain State',
    description: null,
    contentType: 'audio',
    durationSeconds: 600,
    category: null,
    difficulty: 1,
  };
  const suggestions = {
    condition: 'Safety',
    items: [
      { kind: 'practice', id: 'p1', slug: null, title: 'The Mountain State', description: null },
      {
        kind: 'powerDrop',
        id: 'pd1',
        slug: 'exhale',
        title: '90-Second Exhale Drop',
        description: null,
      },
      {
        kind: 'somaticCard',
        id: 'c1',
        slug: 'the-heel-press-reset',
        title: 'The Heel Press Reset',
        description: 'Press the heels down.',
      },
    ],
  };

  it('shows nothing, and asks for nothing, before the member has checked in', async () => {
    const html = renderToStaticMarkup(await DashboardPage());
    expect(html).not.toContain('More for today');
    expect(mockGetHetSuggestions).not.toHaveBeenCalled();
  });

  it('after a check-in, lists the Somatic Card with the approved reason line', async () => {
    mockGetTodayCheckIn.mockResolvedValue({ id: 'c1' });
    mockGetTodayPractice.mockResolvedValue({ practice, completed: false });
    mockGetHetSuggestions.mockResolvedValue(suggestions);
    const html = renderToStaticMarkup(await DashboardPage());
    expect(html).toContain('More for today');
    expect(html).toContain('Chosen to help you find steadiness and support in this moment.');
    expect(html).toContain('The Heel Press Reset');
    expect(html).toContain('href="/dashboard/somatic-cards/card/the-heel-press-reset"');
  });

  it('does not repeat today’s practice and does not offer PowerDrops, which have no web page', async () => {
    mockGetTodayCheckIn.mockResolvedValue({ id: 'c1' });
    mockGetTodayPractice.mockResolvedValue({ practice, completed: false });
    mockGetHetSuggestions.mockResolvedValue(suggestions);
    const html = renderToStaticMarkup(await DashboardPage());
    const block = html.slice(html.indexOf('More for today'));
    expect(block).not.toContain('90-Second Exhale Drop');
    expect(block.match(/The Mountain State/g) ?? []).toHaveLength(0);
  });

  it('renders no block when the only suggestions cannot be opened from the website', async () => {
    mockGetTodayCheckIn.mockResolvedValue({ id: 'c1' });
    mockGetHetSuggestions.mockResolvedValue({
      condition: 'Safety',
      items: [suggestions.items[1]],
    });
    const html = renderToStaticMarkup(await DashboardPage());
    expect(html).not.toContain('More for today');
  });
});
