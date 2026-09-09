import { useCallback, useEffect, useState } from 'react';
import { useApiClient } from './useApiClient';
import { humanizeApiError } from '@/lib/api-errors';
import type { PowerDropSummary, PowerDropsListResponse } from '@/api/types';

export type PowerDropsState =
  | { status: 'loading' }
  | { status: 'success'; powerDrops: PowerDropSummary[] }
  | { status: 'error'; message: string };

export interface UsePowerDropsOptions {
  category?: string;
  featured?: boolean;
}

/**
 * Fetches GET /api/v1/powerdrops once on mount (or when `category`/
 * `featured` change), `limit=50` - the published PowerDrop deck is small,
 * so one call covers the whole library the way usePractices does.
 */
export function usePowerDrops(options: UsePowerDropsOptions = {}) {
  const { category, featured } = options;
  const api = useApiClient();
  const [state, setState] = useState<PowerDropsState>({ status: 'loading' });

  const load = useCallback(async () => {
    setState({ status: 'loading' });
    try {
      const params = new URLSearchParams({ limit: '50' });
      if (category) params.set('category', category);
      if (featured) params.set('featured', 'true');
      const result = await api.get<PowerDropsListResponse>(`/api/v1/powerdrops?${params}`);
      setState({ status: 'success', powerDrops: result.powerDrops });
    } catch (err) {
      setState({ status: 'error', message: humanizeApiError(err) });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- `api` intentionally excluded, see useApiClient.ts
  }, [category, featured]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- standard fetch-on-mount
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- fetch-once-per-filter-change is intentional: `load` also depends on `api`, whose identity can change every render (Clerk's `getToken` isn't guaranteed stable - see useApiClient.ts), so depending on `[load]` here would re-fire on every render instead of only when `category`/`featured` genuinely change.
  }, [category, featured]);

  return { state, reload: load };
}
