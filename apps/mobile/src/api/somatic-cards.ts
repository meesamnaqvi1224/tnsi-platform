import type { ApiClient } from './client';
import type { SomaticSeriesListResponse, SomaticSeriesDetail, SomaticCardDetail } from './types';

/**
 * The Somatic Card mobile UI's minimal client functions - thin named
 * wrappers over the existing shared `ApiClient` (see `./client.ts`), not
 * a second HTTP abstraction. Each mirrors exactly what
 * docs/TNSI_Somatic_Card_Read_API_v1.md documents for that endpoint; no
 * Postgres/Sanity/CMS call happens anywhere in this file or its callers.
 */

/** GET /api/v1/somatic-cards/series - the Core Series is 9 Series total, comfortably under one page (`limit=50`), matching how usePowerDrops/usePractices fetch their whole (similarly small) library in one call. */
export function fetchSomaticSeriesList(api: ApiClient) {
  return api.get<SomaticSeriesListResponse>('/api/v1/somatic-cards/series?limit=50');
}

/** GET /api/v1/somatic-cards/series/:seriesSlug */
export function fetchSomaticSeriesDetail(api: ApiClient, seriesSlug: string) {
  return api.get<SomaticSeriesDetail>(
    `/api/v1/somatic-cards/series/${encodeURIComponent(seriesSlug)}`,
  );
}

/** GET /api/v1/somatic-cards/:cardSlug */
export function fetchSomaticCardDetail(api: ApiClient, cardSlug: string) {
  return api.get<SomaticCardDetail>(`/api/v1/somatic-cards/${encodeURIComponent(cardSlug)}`);
}
