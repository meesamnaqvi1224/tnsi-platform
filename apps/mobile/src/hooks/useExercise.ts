import { useCallback, useEffect, useState } from 'react';
import { useApiClient } from './useApiClient';
import { humanizeApiError } from '@/lib/api-errors';
import type { ExerciseResponse } from '@/api/types';

export type ExerciseState =
  | { status: 'loading' }
  | { status: 'success'; data: ExerciseResponse }
  | { status: 'error'; message: string };

/**
 * Fetches GET /api/v1/exercises/[slug] once per visit: the exercise's content (steps, summary and
 * closing) from the CMS via the server, and the practice it is recorded against. A member who cannot
 * open the practice, or an exercise that is not published, comes back as an error and no content.
 */
export function useExercise(slug: string) {
  const api = useApiClient();
  const [state, setState] = useState<ExerciseState>({ status: 'loading' });

  const load = useCallback(async () => {
    setState({ status: 'loading' });
    try {
      const data = await api.get<ExerciseResponse>(`/api/v1/exercises/${encodeURIComponent(slug)}`);
      setState({ status: 'success', data });
    } catch (err) {
      setState({ status: 'error', message: humanizeApiError(err) });
    }
  }, [api, slug]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- standard fetch-on-mount
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- fetch-once-on-mount is intentional: `load` depends on `api`, whose identity can change every render (see useApiClient.ts), so depending on `[load]` would re-fire on every render.
  }, []);

  return { state, reload: load };
}
