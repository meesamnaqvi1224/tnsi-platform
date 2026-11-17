import { useCallback, useEffect, useRef, useState } from 'react';
import { useApiClient } from './useApiClient';
import { humanizeApiError } from '@/lib/api-errors';
import { ApiRequestError, type Entitlements } from '@/api/types';

export type EntitlementsState =
  | { status: 'loading' }
  | { status: 'success'; entitlements: Entitlements }
  | { status: 'error'; message: string; sessionExpired: boolean };

/**
 * Fetches GET /api/v1/me/entitlements once on mount. Deliberately its own
 * hook, not folded into identity - Clerk's `useUser()` already gives the
 * Profile screen a fully usable identity synchronously, so a slow/failed
 * entitlements request must never block or crash the rest of the screen
 * (see ProfileScreen's independent loading/error handling for this state).
 */
export function useEntitlements() {
  const api = useApiClient();
  const [state, setState] = useState<EntitlementsState>({ status: 'loading' });
  const hasData = useRef(false);

  const load = useCallback(
    async (silent = false) => {
      // A silent refresh keeps what is on screen until the answer arrives (no loading flash).
      if (!silent) setState({ status: 'loading' });
      try {
        const entitlements = await api.get<Entitlements>('/api/v1/me/entitlements');
        hasData.current = true;
        setState({ status: 'success', entitlements });
      } catch (err) {
        // A failed silent refresh keeps the last good answer instead of replacing it with an error.
        if (silent && hasData.current) return;
        setState({
          status: 'error',
          message: humanizeApiError(err),
          // A 401 means the session is no longer valid: retrying cannot help, signing in again can.
          sessionExpired: err instanceof ApiRequestError && err.status === 401,
        });
      }
    },
    [api],
  );

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- standard fetch-on-mount
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- fetch-once-on-mount is intentional: `load` depends on `api`, whose identity can change every render (Clerk's `getToken` isn't guaranteed stable - see useApiClient.ts), so depending on `[load]` here would re-fire on every render instead of once per mount.
  }, []);

  const reload = useCallback(() => load(false), [load]);
  const refresh = useCallback(() => load(true), [load]);

  return { state, reload, refresh };
}
