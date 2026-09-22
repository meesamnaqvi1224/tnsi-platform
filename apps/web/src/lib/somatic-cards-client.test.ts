import { describe, it, expect, vi } from 'vitest';

/**
 * Pure unit tests for the Somatic Card UI's one content-fetching seam
 * (`somatic-cards-client.ts`) - mocks the three Read API Route Handlers
 * it calls, verifying the `ok`/`not-found`/`error` status mapping the
 * pages rely on. No DB needed; the handlers themselves already have
 * dedicated integration coverage (see
 * apps/web/src/app/api/v1/somatic-cards/somatic-cards.integration.test.ts).
 */

const mockSeriesListGET = vi.fn();
const mockSeriesDetailGET = vi.fn();
const mockCardDetailGET = vi.fn();

vi.mock('@/app/api/v1/somatic-cards/series/route', () => ({ GET: mockSeriesListGET }));
vi.mock('@/app/api/v1/somatic-cards/series/[seriesSlug]/route', () => ({
  GET: mockSeriesDetailGET,
}));
vi.mock('@/app/api/v1/somatic-cards/[cardSlug]/route', () => ({ GET: mockCardDetailGET }));

const { fetchSomaticSeriesList, fetchSomaticSeriesDetail, fetchSomaticCardDetail } =
  await import('./somatic-cards-client');

function jsonResponse(status: number, body: unknown) {
  return new Response(JSON.stringify(body), { status });
}

describe('fetchSomaticSeriesList', () => {
  it('returns ok with data on 200', async () => {
    mockSeriesListGET.mockResolvedValueOnce(
      jsonResponse(200, { data: { series: [{ id: 's1' }] } }),
    );
    const result = await fetchSomaticSeriesList();
    expect(result).toEqual({ status: 'ok', data: [{ id: 's1' }] });
  });

  it('returns error on a non-200 status (e.g. 401/500)', async () => {
    mockSeriesListGET.mockResolvedValueOnce(
      jsonResponse(401, { error: { code: 'UNAUTHENTICATED' } }),
    );
    const result = await fetchSomaticSeriesList();
    expect(result).toEqual({ status: 'error' });
  });
});

describe('fetchSomaticSeriesDetail', () => {
  it('returns ok with data on 200', async () => {
    mockSeriesDetailGET.mockResolvedValueOnce(jsonResponse(200, { data: { id: 's1', cards: [] } }));
    const result = await fetchSomaticSeriesDetail('some-slug');
    expect(result).toEqual({ status: 'ok', data: { id: 's1', cards: [] } });
  });

  it('returns not-found on 404 (never renders as a generic error)', async () => {
    mockSeriesDetailGET.mockResolvedValueOnce(jsonResponse(404, { error: { code: 'NOT_FOUND' } }));
    const result = await fetchSomaticSeriesDetail('missing-slug');
    expect(result).toEqual({ status: 'not-found' });
  });

  it('returns error on 500', async () => {
    mockSeriesDetailGET.mockResolvedValueOnce(
      jsonResponse(500, { error: { code: 'INTERNAL_ERROR' } }),
    );
    const result = await fetchSomaticSeriesDetail('some-slug');
    expect(result).toEqual({ status: 'error' });
  });
});

describe('fetchSomaticCardDetail', () => {
  it('returns ok with data on 200', async () => {
    mockCardDetailGET.mockResolvedValueOnce(jsonResponse(200, { data: { id: 'c1' } }));
    const result = await fetchSomaticCardDetail('some-slug');
    expect(result).toEqual({ status: 'ok', data: { id: 'c1' } });
  });

  it('returns not-found on 404', async () => {
    mockCardDetailGET.mockResolvedValueOnce(jsonResponse(404, { error: { code: 'NOT_FOUND' } }));
    const result = await fetchSomaticCardDetail('missing-slug');
    expect(result).toEqual({ status: 'not-found' });
  });
});
