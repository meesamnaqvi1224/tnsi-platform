import { useCallback, useEffect, useState } from 'react';
import { useApiClient } from './useApiClient';
import { humanizeApiError } from '@/lib/api-errors';
import { ApiRequestError } from '@/api/types';
import type { Practice, PracticeCompletionInput, PracticeCompletionResult } from '@/api/types';

export type PracticeDetailState =
  | { status: 'loading' }
  | { status: 'not-found' }
  | { status: 'success'; practice: Practice }
  | { status: 'error'; message: string };

/**
 * Fetches GET /api/v1/practices/[id] once per screen visit (Expo Router
 * remounts this on each navigation to a practice, so there's no risk of a
 * stale cached practice across visits, and no premature caching layer is
 * needed for a single fetch). Also owns POST .../complete, since only this
 * screen ever calls it and the result needs to update the same `practice`
 * state the screen already holds.
 */
export function usePracticeDetail(id: string) {
  const api = useApiClient();
  const [state, setState] = useState<PracticeDetailState>({ status: 'loading' });

  const load = useCallback(async () => {
    setState({ status: 'loading' });
    try {
      const practice = await api.get<Practice>(`/api/v1/practices/${id}`);
      setState({ status: 'success', practice });
    } catch (err) {
      if (err instanceof ApiRequestError && err.status === 404) {
        setState({ status: 'not-found' });
      } else {
        setState({ status: 'error', message: humanizeApiError(err) });
      }
    }
  }, [api, id]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- standard fetch-on-mount, see app/(tabs)/index.tsx for the same pattern
    load();
  }, [load]);

  const submitCompletion = useCallback(
    async (input: PracticeCompletionInput) => {
      const result = await api.post<PracticeCompletionResult>(
        `/api/v1/practices/${id}/complete`,
        input,
      );
      setState((prev) =>
        prev.status === 'success'
          ? {
              ...prev,
              practice: {
                ...prev.practice,
                progress: {
                  progressPct: result.progressPct,
                  positionSeconds: result.positionSeconds,
                  completed: result.completed,
                  completedAt: result.completedAt,
                  playCount: result.playCount,
                  lastPlayedAt: null,
                },
              },
            }
          : prev,
      );
      return result;
    },
    [api, id],
  );

  return { state, reload: load, submitCompletion };
}
