import { describe, it, expect, vi } from 'vitest';
import {
  fetchSomaticSeriesList,
  fetchSomaticSeriesDetail,
  fetchSomaticCardDetail,
} from './somatic-cards';
import type { ApiClient } from './client';

/**
 * These three functions are the mobile UI's *only* content-fetching
 * path into the Read API (see docs/TNSI_Somatic_Card_Mobile_UI_v1.md
 * §API Client) - every call goes through the same shared, bearer-token-
 * authenticated `ApiClient` used by every other domain in this app
 * (`usePractices`, `usePowerDrops`, etc.), never a bypass. These tests
 * verify the URL each function constructs and that the (mocked) client's
 * `get` is what's actually called - `ApiClient` itself (token
 * attachment, {data}/{error} envelope unwrapping, 401/404 mapping to
 * `ApiRequestError`) is existing, unmodified, shared code.
 */

function mockApi(): ApiClient {
  return {
    get: vi.fn(),
    post: vi.fn(),
    delete: vi.fn(),
  };
}

describe('fetchSomaticSeriesList', () => {
  it('19. calls the shared authenticated client, not a bypass', async () => {
    const api = mockApi();
    vi.mocked(api.get).mockResolvedValueOnce({ series: [], pagination: { limit: 50, offset: 0 } });
    await fetchSomaticSeriesList(api);
    expect(api.get).toHaveBeenCalledWith('/api/v1/somatic-cards/series?limit=50');
  });
});

describe('fetchSomaticSeriesDetail', () => {
  it('3. builds the URL from the given series slug', async () => {
    const api = mockApi();
    vi.mocked(api.get).mockResolvedValueOnce({});
    await fetchSomaticSeriesDetail(api, 'ground-and-press');
    expect(api.get).toHaveBeenCalledWith('/api/v1/somatic-cards/series/ground-and-press');
  });

  it('encodes a slug that needs it', async () => {
    const api = mockApi();
    vi.mocked(api.get).mockResolvedValueOnce({});
    await fetchSomaticSeriesDetail(api, 'a slug/with special?chars');
    expect(api.get).toHaveBeenCalledWith(
      `/api/v1/somatic-cards/series/${encodeURIComponent('a slug/with special?chars')}`,
    );
  });
});

describe('fetchSomaticCardDetail', () => {
  it('6. builds the URL from the given card slug', async () => {
    const api = mockApi();
    vi.mocked(api.get).mockResolvedValueOnce({});
    await fetchSomaticCardDetail(api, 'ground-and-press');
    expect(api.get).toHaveBeenCalledWith('/api/v1/somatic-cards/ground-and-press');
  });
});
