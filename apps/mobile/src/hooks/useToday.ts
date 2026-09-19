import { useCallback, useEffect, useState } from 'react';
import { useApiClient } from './useApiClient';
import { humanizeApiError } from '@/lib/api-errors';
import type { TodayResponse } from '@/api/types';

export type TodayState =
  | { status: 'loading' }
  | { status: 'success'; data: TodayResponse }
  | { status: 'error'; message: string };

/**
 * Fetches GET /api/v1/today once on mount - Home's single data need for
 * Phase 2 (today's check-in state + today's practice). No polling, no
 * background refresh: the retry action re-runs this same fetch.
 */
export function useToday() {
  const api = useApiClient();
  const [state, setState] = useState<TodayState>({ status: 'loading' });

  const load = useCallback(async () => {
    setState({ status: 'loading' });
    try {
      const data = await api.get<TodayResponse>('/api/v1/today');
      setState({ status: 'success', data });
    } catch (err) {
      setState({ status: 'error', message: humanizeApiError(err) });
    }
  }, [api]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- standard fetch-on-mount
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- fetch-once-on-mount is intentional: `load` depends on `api`, whose identity can change every render (Clerk's `getToken` isn't guaranteed stable - see useApiClient.ts), so depending on `[load]` here would re-fire on every render instead of once per mount.
  }, []);

  /** Lets a caller (a successful check-in submission) update the cached checkIn without a refetch. */
  const setCheckIn = useCallback((checkIn: TodayResponse['checkIn']) => {
    setState((prev) =>
      prev.status === 'success' ? { ...prev, data: { ...prev.data, checkIn } } : prev,
    );
  }, []);

  /**
   * Re-fetches /api/v1/today and merges the fresh response into an
   * already-`success` state, without flipping `status` back to `loading`
   * first - a real refetch (like `setCheckIn` above's local patch can't
   * be), but one that shouldn't skeleton-flash Home over a check-in
   * submission it already has its own "recorded" transition for. Used
   * right after a check-in is saved, so `todayPractice` reflects the
   * capacity category that check-in just routed to (see
   * getRecommendedPractice) instead of staying whatever was recommended
   * (often nothing) before today's check-in existed. Fails silently -
   * worst case Home keeps showing pre-check-in data until the next
   * explicit `reload`, not worse than not calling this at all.
   */
  const refresh = useCallback(async () => {
    try {
      const data = await api.get<TodayResponse>('/api/v1/today');
      setState({ status: 'success', data });
    } catch {
      // Silent by design - see comment above.
    }
  }, [api]);

  return { state, reload: load, setCheckIn, refresh };
}
