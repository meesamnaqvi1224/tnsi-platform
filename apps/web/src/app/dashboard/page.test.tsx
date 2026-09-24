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
vi.mock('@/lib/somatic-cards-client', () => ({
  fetchSomaticSeriesList: () => mockFetchSomaticSeriesList(),
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
  mockFetchSomaticSeriesList.mockResolvedValue({
    status: 'ok',
    data: [
      { id: 's1', seriesNumber: 1 },
      { id: 's2', seriesNumber: 2 },
    ],
  });
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
      data: Array.from({ length: 9 }, (_, i) => ({ id: `s${i}`, seriesNumber: i + 1 })),
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
