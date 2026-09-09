import { useCallback, useEffect, useState } from 'react';
import { useApiClient } from './useApiClient';
import { humanizeApiError } from '@/lib/api-errors';
import { ApiRequestError } from '@/api/types';
import type { PowerDrop, PowerDropUsageResult } from '@/api/types';

export type PowerDropDetailState =
  | { status: 'loading' }
  | { status: 'not-found' }
  | { status: 'success'; powerDrop: PowerDrop }
  | { status: 'error'; message: string };

/**
 * Fetches GET /api/v1/powerdrops/[slug] once per screen visit. Also owns
 * POST .../usage, since only this screen records a use - repeated use is
 * always allowed, so this never mutates local state to disable the
 * action afterward (mirrors usePracticeDetail's ownership of its own
 * completion call).
 */
export function usePowerDropDetail(slug: string) {
  const api = useApiClient();
  const [state, setState] = useState<PowerDropDetailState>({ status: 'loading' });

  const load = useCallback(async () => {
    setState({ status: 'loading' });
    try {
      const powerDrop = await api.get<PowerDrop>(`/api/v1/powerdrops/${slug}`);
      setState({ status: 'success', powerDrop });
    } catch (err) {
      if (err instanceof ApiRequestError && err.status === 404) {
        setState({ status: 'not-found' });
      } else {
        setState({ status: 'error', message: humanizeApiError(err) });
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- `api` intentionally excluded, see useApiClient.ts
  }, [slug]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- standard fetch-on-mount
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- depends on `slug`, not `load`: `load` also depends on `api`, whose identity can change every render (Clerk's `getToken` isn't guaranteed stable - see useApiClient.ts), so depending on `[load]` here would re-fire on every render instead of once per mount (or when `slug` genuinely changes).
  }, [slug]);

  const recordUsage = useCallback(async () => {
    return api.post<PowerDropUsageResult>(`/api/v1/powerdrops/${slug}/usage`);
  }, [api, slug]);

  return { state, reload: load, recordUsage };
}
