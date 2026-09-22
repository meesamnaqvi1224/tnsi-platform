import { useCallback, useEffect, useState } from 'react';
import { useApiClient } from './useApiClient';
import { fetchSomaticSeriesDetail } from '@/api/somatic-cards';
import { humanizeApiError } from '@/lib/api-errors';
import { ApiRequestError } from '@/api/types';
import type { SomaticSeriesDetail } from '@/api/types';

export type SomaticSeriesDetailState =
  | { status: 'loading' }
  | { status: 'not-found' }
  | { status: 'success'; series: SomaticSeriesDetail }
  | { status: 'error'; message: string };

/** Fetches GET /api/v1/somatic-cards/series/[seriesSlug] once per screen visit - same shape as usePowerDropDetail. */
export function useSomaticSeriesDetail(seriesSlug: string) {
  const api = useApiClient();
  const [state, setState] = useState<SomaticSeriesDetailState>({ status: 'loading' });

  const load = useCallback(async () => {
    setState({ status: 'loading' });
    try {
      const series = await fetchSomaticSeriesDetail(api, seriesSlug);
      setState({ status: 'success', series });
    } catch (err) {
      if (err instanceof ApiRequestError && err.status === 404) {
        setState({ status: 'not-found' });
      } else {
        setState({ status: 'error', message: humanizeApiError(err) });
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- `api` intentionally excluded, see useApiClient.ts
  }, [seriesSlug]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- standard fetch-on-mount
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- depends on `seriesSlug`, not `load`, see usePowerDropDetail.ts's identical comment
  }, [seriesSlug]);

  return { state, reload: load };
}
