import { useCallback, useEffect, useState } from 'react';
import { useApiClient } from './useApiClient';
import { humanizeApiError } from '@/lib/api-errors';
import type { ArticleListItem, ArticlesListResponse } from '@/api/types';

export type ArticlesState =
  | { status: 'loading' }
  | { status: 'success'; articles: ArticleListItem[] }
  | { status: 'error'; message: string };

/**
 * Fetches GET /api/v1/articles once on mount, at the API's max bound
 * (`limit=50`) - category filtering then happens client-side (see
 * ArticleFilterBar), same rationale as `usePractices`: one call for the
 * whole bounded catalogue is simpler and cheaper than refetching per
 * filter tap. The real dev catalogue (7 articles) is well within this
 * bound; if it ever grows past 50, this screen would need real
 * pagination - not built here, since the API gap audit didn't call for
 * it and inventing one now would be scope creep.
 */
export function useArticles() {
  const api = useApiClient();
  const [state, setState] = useState<ArticlesState>({ status: 'loading' });

  const load = useCallback(async () => {
    setState({ status: 'loading' });
    try {
      const result = await api.get<ArticlesListResponse>('/api/v1/articles?limit=50');
      setState({ status: 'success', articles: result.articles });
    } catch (err) {
      setState({ status: 'error', message: humanizeApiError(err) });
    }
  }, [api]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- standard fetch-on-mount, see usePractices.ts for the same pattern
    load();
  }, [load]);

  return { state, reload: load };
}
