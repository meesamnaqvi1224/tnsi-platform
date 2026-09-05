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
    // eslint-disable-next-line react-hooks/set-state-in-effect -- standard fetch-on-mount, see app/(tabs)/index.tsx for the same pattern
    load();
  }, [load]);

  /** Lets a caller (a successful check-in submission) update the cached checkIn without a refetch. */
  const setCheckIn = useCallback((checkIn: TodayResponse['checkIn']) => {
    setState((prev) =>
      prev.status === 'success' ? { ...prev, data: { ...prev.data, checkIn } } : prev,
    );
  }, []);

  return { state, reload: load, setCheckIn };
}
