import { useCallback, useEffect, useState } from 'react';
import { useApiClient } from './useApiClient';
import { humanizeApiError } from '@/lib/api-errors';
import type { ReturnPathResponse } from '@/api/types';

export type ReturnPathState =
  | { status: 'loading' }
  | { status: 'success'; data: ReturnPathResponse }
  | { status: 'error'; message: string };

/**
 * Fetches GET /api/v1/return-path once per visit: the copy and breath timings
 * (from Sanity, via the server) and the levels this member may start. The
 * labyrinth itself is generated on the device, so nothing else is downloaded.
 */
export function useReturnPath() {
  const api = useApiClient();
  const [state, setState] = useState<ReturnPathState>({ status: 'loading' });

  const load = useCallback(async () => {
    setState({ status: 'loading' });
    try {
      const data = await api.get<ReturnPathResponse>('/api/v1/return-path');
      setState({ status: 'success', data });
    } catch (err) {
      setState({ status: 'error', message: humanizeApiError(err) });
    }
  }, [api]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- standard fetch-on-mount
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- fetch-once-on-mount is intentional: `load` depends on `api`, whose identity can change every render (see useApiClient.ts), so depending on `[load]` would re-fire on every render.
  }, []);

  return { state, reload: load };
}
