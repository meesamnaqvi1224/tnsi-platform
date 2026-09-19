import { useCallback, useEffect, useState } from 'react';
import { useApiClient } from './useApiClient';
import { humanizeApiError } from '@/lib/api-errors';
import type { JourneyEntry, JourneyResponse } from '@/api/types';

const PAGE_SIZE = 20;

export type JourneyState =
  | { status: 'loading' }
  | { status: 'success'; entries: JourneyEntry[]; hasMore: boolean; loadingMore: boolean }
  | { status: 'error'; message: string };

/**
 * Fetches GET /api/v1/journey once on mount (newest first, `limit=20`) -
 * mirrors usePracticeHistory's/useCheckInHistory's exact shape
 * (fetch-on-mount, `loadMore()` appends the next page in place), the
 * established pattern for a member's own paginated history in this app.
 */
export function useJourney() {
  const api = useApiClient();
  const [state, setState] = useState<JourneyState>({ status: 'loading' });

  const load = useCallback(async () => {
    setState({ status: 'loading' });
    try {
      const result = await api.get<JourneyResponse>(`/api/v1/journey?limit=${PAGE_SIZE}&offset=0`);
      setState({
        status: 'success',
        entries: result.entries,
        hasMore: result.pagination.hasMore,
        loadingMore: false,
      });
    } catch (err) {
      setState({ status: 'error', message: humanizeApiError(err) });
    }
  }, [api]);

  // Not memoized with useCallback: it reads the current `entries.length` as
  // its offset, so it must always be the version closed over the latest
  // `state` - only called from a button's onPress, never an effect
  // dependency, so a new function identity each render is harmless here.
  async function loadMore() {
    if (state.status !== 'success' || !state.hasMore || state.loadingMore) return;

    const offset = state.entries.length;
    setState({ ...state, loadingMore: true });

    try {
      const result = await api.get<JourneyResponse>(
        `/api/v1/journey?limit=${PAGE_SIZE}&offset=${offset}`,
      );
      setState((current) =>
        current.status === 'success'
          ? {
              status: 'success',
              entries: [...current.entries, ...result.entries],
              hasMore: result.pagination.hasMore,
              loadingMore: false,
            }
          : current,
      );
    } catch {
      // A failed "load more" leaves the already-loaded entries on screen -
      // only the loading flag clears, so the member can just try again
      // rather than losing what already rendered.
      setState((current) =>
        current.status === 'success' ? { ...current, loadingMore: false } : current,
      );
    }
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- standard fetch-on-mount
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- fetch-once-on-mount is intentional: `load` depends on `api`, whose identity can change every render (Clerk's `getToken` isn't guaranteed stable - see useApiClient.ts), so depending on `[load]` here would re-fire on every render instead of once per mount.
  }, []);

  return { state, reload: load, loadMore };
}
