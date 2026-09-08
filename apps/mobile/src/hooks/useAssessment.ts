import { useCallback, useEffect, useState } from 'react';
import { useApiClient } from './useApiClient';
import { humanizeApiError } from '@/lib/api-errors';
import { ApiRequestError } from '@/api/types';
import type { AssessmentDefinition } from '@/api/types';

export type AssessmentState =
  | { status: 'loading' }
  | { status: 'not-found' }
  | { status: 'success'; assessment: AssessmentDefinition }
  | { status: 'error'; message: string };

/**
 * Fetches GET /api/v1/assessments/[slug] once on mount - the questions,
 * choices, and result-tier copy come entirely from this response; nothing
 * is hardcoded here. Public content (same as GET /api/v1/articles), so
 * this works identically signed in or signed out.
 */
export function useAssessment(slug: string) {
  const api = useApiClient();
  const [state, setState] = useState<AssessmentState>({ status: 'loading' });

  const load = useCallback(async () => {
    setState({ status: 'loading' });
    try {
      const assessment = await api.get<AssessmentDefinition>(`/api/v1/assessments/${slug}`);
      setState({ status: 'success', assessment });
    } catch (err) {
      if (err instanceof ApiRequestError && err.status === 404) {
        setState({ status: 'not-found' });
      } else {
        setState({ status: 'error', message: humanizeApiError(err) });
      }
    }
  }, [api, slug]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- standard fetch-on-mount
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- depends on `slug`, not `load`: `load` also depends on `api`, whose identity can change every render (Clerk's `getToken` isn't guaranteed stable - see useApiClient.ts), so depending on `[load]` here would re-fire on every render instead of once per mount (or when `slug` genuinely changes).
  }, [slug]);

  return { state, reload: load };
}
