/**
 * The Somatic Card web UI's one and only content-fetching path — calls
 * the already-approved Read API's exported Route Handler functions
 * directly (`GET /api/v1/somatic-cards*`, see
 * docs/TNSI_Somatic_Card_Read_API_v1.md), never Postgres or Sanity
 * itself. Next.js Route Handlers are plain async functions, so calling
 * them directly from a Server Component is the same code path a real
 * HTTP request to that route would run (same `requireMemberAccess()`
 * gate, same query, same publication filtering, same response mapping)
 * without a wasteful self-referential HTTP round trip - Clerk's `auth()`
 * reads the ambient Next.js request context, not the synthetic `Request`
 * object passed in below, so authentication still resolves correctly.
 *
 * This is the API's one client, not a second implementation of it - no
 * page/component in this milestone queries `@tnsi/db` or Sanity.
 */
import { GET as seriesListGET } from '@/app/api/v1/somatic-cards/series/route';
import { GET as seriesDetailGET } from '@/app/api/v1/somatic-cards/series/[seriesSlug]/route';
import { GET as cardDetailGET } from '@/app/api/v1/somatic-cards/[cardSlug]/route';
import type {
  ApiSomaticSeriesListItem,
  ApiSomaticSeriesDetail,
  ApiSomaticCardDetail,
} from './somatic-card-api';

export type SomaticApiResult<T> =
  { status: 'ok'; data: T } | { status: 'not-found' } | { status: 'error' };

export type SomaticApiListResult<T> = { status: 'ok'; data: T } | { status: 'error' };

export async function fetchSomaticSeriesList(): Promise<
  SomaticApiListResult<ApiSomaticSeriesListItem[]>
> {
  const res = await seriesListGET(new Request('http://internal/api/v1/somatic-cards/series'));
  if (res.status !== 200) return { status: 'error' };
  const body = (await res.json()) as { data: { series: ApiSomaticSeriesListItem[] } };
  return { status: 'ok', data: body.data.series };
}

export async function fetchSomaticSeriesDetail(
  seriesSlug: string,
): Promise<SomaticApiResult<ApiSomaticSeriesDetail>> {
  const res = await seriesDetailGET(new Request('http://internal/api/v1/somatic-cards/series'), {
    params: Promise.resolve({ seriesSlug }),
  });
  if (res.status === 404) return { status: 'not-found' };
  if (res.status !== 200) return { status: 'error' };
  const body = (await res.json()) as { data: ApiSomaticSeriesDetail };
  return { status: 'ok', data: body.data };
}

export async function fetchSomaticCardDetail(
  cardSlug: string,
): Promise<SomaticApiResult<ApiSomaticCardDetail>> {
  const res = await cardDetailGET(new Request('http://internal/api/v1/somatic-cards'), {
    params: Promise.resolve({ cardSlug }),
  });
  if (res.status === 404) return { status: 'not-found' };
  if (res.status !== 200) return { status: 'error' };
  const body = (await res.json()) as { data: ApiSomaticCardDetail };
  return { status: 'ok', data: body.data };
}
