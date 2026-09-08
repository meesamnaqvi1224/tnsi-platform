import { useCallback, useEffect, useState } from 'react';
import { useApiClient } from './useApiClient';
import { humanizeApiError } from '@/lib/api-errors';
import type { Entitlements } from '@/api/types';

export type EntitlementsState =
  | { status: 'loading' }
  | { status: 'success'; entitlements: Entitlements }
  | { status: 'error'; message: string };

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

  const load = useCallback(async () => {
    setState({ status: 'loading' });
    try {
      const entitlements = await api.get<Entitlements>('/api/v1/me/entitlements');
      setState({ status: 'success', entitlements });
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
