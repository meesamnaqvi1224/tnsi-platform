import { useCallback, useEffect, useState } from 'react';
import { useApiClient } from './useApiClient';
import { humanizeApiError } from '@/lib/api-errors';
import { ApiRequestError } from '@/api/types';
import type { ArticleDetail } from '@/api/types';

export type ArticleDetailState =
  | { status: 'loading' }
  | { status: 'not-found' }
  | { status: 'success'; article: ArticleDetail }
  | { status: 'error'; message: string };

/**
 * Fetches GET /api/v1/articles/[slug] once per screen visit - same
 * fetch-on-mount, no-caching-layer pattern as `usePracticeDetail`. Public,
 * unauthenticated content (see the Phase 4.0/4.1 audits), but reuses the
 * same `useApiClient()` as everything else since a present-or-absent
 * bearer token makes no difference to this endpoint.
 */
export function useArticleDetail(slug: string) {
  const api = useApiClient();
  const [state, setState] = useState<ArticleDetailState>({ status: 'loading' });

  const load = useCallback(async () => {
    setState({ status: 'loading' });
    try {
      const article = await api.get<ArticleDetail>(`/api/v1/articles/${slug}`);
      setState({ status: 'success', article });
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
