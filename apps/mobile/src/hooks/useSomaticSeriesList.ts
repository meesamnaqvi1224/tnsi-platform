import { useCallback, useEffect, useState } from 'react';
import { useApiClient } from './useApiClient';
import { fetchSomaticSeriesList } from '@/api/somatic-cards';
import { humanizeApiError } from '@/lib/api-errors';
import type { SomaticSeriesListItem } from '@/api/types';

export type SomaticSeriesListState =
  | { status: 'loading' }
  | { status: 'success'; series: SomaticSeriesListItem[] }
  | { status: 'error'; message: string };

/**
 * Fetches GET /api/v1/somatic-cards/series once on mount - the Core
 * Series is 9 Series total, so one call covers the whole library (same
 * shape as usePowerDrops/usePractices). Series arrive already ordered by
 * `sortOrder` from the API; this hook never re-sorts them.
 */
export function useSomaticSeriesList() {
  const api = useApiClient();
  const [state, setState] = useState<SomaticSeriesListState>({ status: 'loading' });

  const load = useCallback(async () => {
    setState({ status: 'loading' });
    try {
      const result = await fetchSomaticSeriesList(api);
      setState({ status: 'success', series: result.series });
    } catch (err) {
      setState({ status: 'error', message: humanizeApiError(err) });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- `api` intentionally excluded, see useApiClient.ts
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- standard fetch-on-mount
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- fetch-once-on-mount is intentional, see usePowerDrops.ts's identical comment
  }, []);

  return { state, reload: load };
}
