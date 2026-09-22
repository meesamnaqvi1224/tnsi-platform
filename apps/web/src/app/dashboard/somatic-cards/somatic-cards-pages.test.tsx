import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';

/**
 * Page-orchestration tests for the three Somatic Card dashboard routes -
 * member-access gating, not-found routing, and empty/error rendering.
 * Mocks `@/lib/auth-api`, `@/lib/somatic-cards-client`, and
 * `next/navigation`'s `notFound` at the module boundary (no real Clerk
 * session or database - those are exercised by the Read API's own
 * integration tests). Presentational rendering itself is covered by the
 * dedicated view-component test files; these tests are about the page's
 * own orchestration logic.
 */

const mockRequireMemberAccessOrRedirect = vi.fn();
vi.mock('@/lib/auth-api', () => ({
  requireMemberAccessOrRedirect: () => mockRequireMemberAccessOrRedirect(),
}));

const mockFetchSeriesList = vi.fn();
const mockFetchSeriesDetail = vi.fn();
const mockFetchCardDetail = vi.fn();
vi.mock('@/lib/somatic-cards-client', () => ({
  fetchSomaticSeriesList: () => mockFetchSeriesList(),
  fetchSomaticSeriesDetail: (slug: string) => mockFetchSeriesDetail(slug),
  fetchSomaticCardDetail: (slug: string) => mockFetchCardDetail(slug),
}));

const NOT_FOUND_SENTINEL = new Error('NEXT_NOT_FOUND_SENTINEL');
const mockNotFound = vi.fn(() => {
  throw NOT_FOUND_SENTINEL;
});
vi.mock('next/navigation', () => ({ notFound: () => mockNotFound() }));

const SeriesListPage = (await import('./page')).default;
const SeriesDetailPage = (await import('./[seriesSlug]/page')).default;
const CardDetailPage = (await import('./card/[cardSlug]/page')).default;

beforeEach(() => {
  vi.clearAllMocks();
  mockRequireMemberAccessOrRedirect.mockResolvedValue({ id: 'user-1' });
});

describe('SomaticCardsPage (series list)', () => {
  it('19. requires member access before fetching', async () => {
    mockFetchSeriesList.mockResolvedValueOnce({ status: 'ok', data: [] });
    await SeriesListPage();
    expect(mockRequireMemberAccessOrRedirect).toHaveBeenCalled();
    expect(mockFetchSeriesList).toHaveBeenCalled();
  });

  it('19. never fetches when member access is denied (auth throws/redirects first)', async () => {
    mockRequireMemberAccessOrRedirect.mockRejectedValueOnce(new Error('NEXT_REDIRECT'));
    await expect(SomaticCardsPageOrReject()).rejects.toThrow('NEXT_REDIRECT');
    expect(mockFetchSeriesList).not.toHaveBeenCalled();

    async function SomaticCardsPageOrReject() {
      return SeriesListPage();
    }
  });

  it('16. renders an empty-state explanation when there are no published series', async () => {
    mockFetchSeriesList.mockResolvedValueOnce({ status: 'ok', data: [] });
    const html = renderToStaticMarkup(await SeriesListPage());
    expect(html.toLowerCase()).toContain('no series available');
  });

  it('17. renders an error state without leaking server details', async () => {
    mockFetchSeriesList.mockResolvedValueOnce({ status: 'error' });
    const html = renderToStaticMarkup(await SeriesListPage());
    expect(html.toLowerCase()).toContain('something went wrong');
    expect(html).not.toMatch(/postgres|drizzle|stack|at\s+\//i);
  });

  it('1. renders series data on success', async () => {
    mockFetchSeriesList.mockResolvedValueOnce({
      status: 'ok',
      data: [
        {
          id: 's1',
          seriesNumber: 1,
          title: 'Support Series',
          slug: 'support-series',
          collection: 'core-series',
          description: null,
          coreQuestion: null,
          visualTreatment: 'singleHero',
          defaultLayout: null,
          sortOrder: 0,
        },
      ],
    });
    const html = renderToStaticMarkup(await SeriesListPage());
    expect(html).toContain('Support Series');
  });
});

describe('SomaticSeriesDetailPage', () => {
  it('19. requires member access before fetching', async () => {
    mockFetchSeriesDetail.mockResolvedValueOnce({
      status: 'ok',
      data: {
        id: 's1',
        cards: [],
        seriesNumber: 1,
        title: 'X',
        slug: 'x',
        collection: 'c',
        description: null,
        coreQuestion: null,
        visualTreatment: null,
        defaultLayout: null,
        sortOrder: 0,
      },
    });
    await SeriesDetailPage({ params: Promise.resolve({ seriesSlug: 'x' }) });
    expect(mockRequireMemberAccessOrRedirect).toHaveBeenCalled();
  });

  it('18. calls notFound() when the series does not exist/is unpublished', async () => {
    mockFetchSeriesDetail.mockResolvedValueOnce({ status: 'not-found' });
    await expect(
      SeriesDetailPage({ params: Promise.resolve({ seriesSlug: 'missing' }) }),
    ).rejects.toThrow(NOT_FOUND_SENTINEL);
    expect(mockNotFound).toHaveBeenCalled();
  });

  it('17. renders an error state on API error', async () => {
    mockFetchSeriesDetail.mockResolvedValueOnce({ status: 'error' });
    const html = renderToStaticMarkup(
      await SeriesDetailPage({ params: Promise.resolve({ seriesSlug: 'x' }) }),
    );
    expect(html.toLowerCase()).toContain('something went wrong');
  });
});

describe('SomaticCardDetailPage', () => {
  it('19. requires member access before fetching', async () => {
    mockFetchCardDetail.mockResolvedValueOnce({
      status: 'ok',
      data: {
        id: 'c1',
        cardNumber: 1,
        title: 'Ground and Press',
        slug: 'ground-and-press',
        sortOrder: 0,
        series: { id: 's1', seriesNumber: 1, title: 'X', slug: 'x', collection: 'c' },
        invitation: null,
        purpose: null,
        description: null,
        orientation: null,
        gentleNote: null,
        anchor: null,
        visualTreatment: null,
        cardArtwork: null,
        heroImage: null,
        practiceSteps: [],
        whatToNotice: [],
        supportingImages: [],
        demonstrationSequence: [],
      },
    });
    await CardDetailPage({ params: Promise.resolve({ cardSlug: 'ground-and-press' }) });
    expect(mockRequireMemberAccessOrRedirect).toHaveBeenCalled();
  });

  it('18. calls notFound() when the card does not exist/is unpublished', async () => {
    mockFetchCardDetail.mockResolvedValueOnce({ status: 'not-found' });
    await expect(
      CardDetailPage({ params: Promise.resolve({ cardSlug: 'missing' }) }),
    ).rejects.toThrow(NOT_FOUND_SENTINEL);
    expect(mockNotFound).toHaveBeenCalled();
  });
});
