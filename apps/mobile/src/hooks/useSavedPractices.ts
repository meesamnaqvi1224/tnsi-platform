import { useCallback, useEffect, useState } from 'react';
import { useApiClient } from './useApiClient';
import { humanizeApiError } from '@/lib/api-errors';
import type { SavedPractice, SavedPracticesResponse } from '@/api/types';

export type SavedPracticesState =
  | { status: 'loading' }
  | { status: 'success'; practices: SavedPractice[] }
  | { status: 'error'; message: string };

/**
 * Fetches GET /api/v1/practices/saved once on mount - a member's saved
 * list is expected to stay small (a personal shortlist, not a growing
 * history), so unlike usePracticeHistory/useJourney this deliberately has
 * no pagination, matching this milestone's "smallest clean API surface"
 * scope.
 */
export function useSavedPractices() {
  const api = useApiClient();
  const [state, setState] = useState<SavedPracticesState>({ status: 'loading' });

  const load = useCallback(async () => {
    setState({ status: 'loading' });
    try {
      const result = await api.get<SavedPracticesResponse>('/api/v1/practices/saved');
      setState({ status: 'success', practices: result.practices });
    } catch (err) {
      setState({ status: 'error', message: humanizeApiError(err) });
    }
  }, [api]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- standard fetch-on-mount
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- fetch-once-on-mount is intentional, same reasoning as usePracticeHistory/useJourney.
  }, []);

  return { state, reload: load };
}
