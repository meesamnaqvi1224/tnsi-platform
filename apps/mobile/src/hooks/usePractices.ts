import { useCallback, useEffect, useState } from 'react';
import { useApiClient } from './useApiClient';
import { humanizeApiError } from '@/lib/api-errors';
import type { Practice, PracticesListResponse } from '@/api/types';

export type PracticesState =
  | { status: 'loading' }
  | { status: 'success'; practices: Practice[] }
  | { status: 'error'; message: string };

/**
 * Fetches GET /api/v1/practices once on mount. The API already supports
 * `category`/`contentType` query params, but the Practices tab filters
 * client-side instead (see PracticeFilterBar) - the full published list is
 * small (one API call, `limit=50`), so refetching per filter tap would be
 * unnecessary network traffic for no real benefit.
 */
export function usePractices() {
  const api = useApiClient();
  const [state, setState] = useState<PracticesState>({ status: 'loading' });

  const load = useCallback(async () => {
    setState({ status: 'loading' });
    try {
      const result = await api.get<PracticesListResponse>('/api/v1/practices?limit=50');
      setState({ status: 'success', practices: result.practices });
    } catch (err) {
      setState({ status: 'error', message: humanizeApiError(err) });
    }
  }, [api]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- standard fetch-on-mount
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- fetch-once-on-mount is intentional: `load` depends on `api`, whose identity can change every render (Clerk's `getToken` isn't guaranteed stable - see useApiClient.ts), so depending on `[load]` here would re-fire on every render instead of once per mount.
  }, []);

  return { state, reload: load };
}
