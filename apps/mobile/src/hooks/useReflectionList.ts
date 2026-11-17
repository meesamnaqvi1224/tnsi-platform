import { useCallback, useEffect, useRef, useState } from 'react';
import { useApiClient } from './useApiClient';
import { describeReflectionError, type ReflectionErrorKind } from '@/lib/reflections';
import type { ReflectionListItem, ReflectionsListResponse, ReflectionStatus } from '@/api/types';

const PAGE_SIZE = 20;

export type ReflectionListState =
  | { status: 'loading' }
  | {
      status: 'success';
      entries: ReflectionListItem[];
      hasMore: boolean;
      loadingMore: boolean;
    }
  | { status: 'error'; kind: ReflectionErrorKind; message: string };

/**
 * One section of My Reflections: the member's saved reflections (`status: 'saved'`) or their own
 * drafts (`'draft'`). Each section has its own hook, so a failure in one never hides the other.
 *
 * `refresh()` re-fetches the first page quietly (no loading flash) when the member comes back to the
 * screen after writing, keeping what is already on screen until fresh data arrives. Only previews are
 * ever fetched here - the full text is loaded one reflection at a time, when it is opened.
 */
export function useReflectionList(status: ReflectionStatus) {
  const api = useApiClient();
  const [state, setState] = useState<ReflectionListState>({ status: 'loading' });
  // A newer request supersedes an older one, so a slow reply can never overwrite fresher data.
  const requestId = useRef(0);

  const fetchFirstPage = useCallback(
    async (quiet: boolean) => {
      const mine = ++requestId.current;
      if (!quiet) setState({ status: 'loading' });
      try {
        const result = await api.get<ReflectionsListResponse>(
          `/api/v1/journal/entries?status=${status}&limit=${PAGE_SIZE}&offset=0`,
        );
        if (mine !== requestId.current) return;
        setState({
          status: 'success',
          entries: result.entries,
          hasMore: result.pagination.hasMore,
          loadingMore: false,
        });
      } catch (err) {
        if (mine !== requestId.current) return;
        const described = describeReflectionError(err, 'list');
        // A failed quiet refresh keeps what is already shown; only a first load (or a locked
        // account, which must stop showing anything) replaces the content with an error.
        setState((current) =>
          quiet && current.status === 'success' && described.kind !== 'locked'
            ? current
            : { status: 'error', kind: described.kind, message: described.message },
        );
      }
    },
    [api, status],
  );

  async function loadMore() {
    if (state.status !== 'success' || !state.hasMore || state.loadingMore) return;
    const offset = state.entries.length;
    const mine = requestId.current;
    setState({ ...state, loadingMore: true });
    try {
      const result = await api.get<ReflectionsListResponse>(
        `/api/v1/journal/entries?status=${status}&limit=${PAGE_SIZE}&offset=${offset}`,
      );
      if (mine !== requestId.current) return;
      setState((current) =>
        current.status === 'success'
          ? {
              status: 'success',
              // An entry saved meanwhile can shift the pages; never show the same one twice.
              entries: [
                ...current.entries,
                ...result.entries.filter((e) => !current.entries.some((c) => c.id === e.id)),
              ],
              hasMore: result.pagination.hasMore,
              loadingMore: false,
            }
          : current,
      );
    } catch {
      // A failed "load more" leaves what is already on screen; the member can simply try again.
      setState((current) =>
        current.status === 'success' ? { ...current, loadingMore: false } : current,
      );
    }
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- standard fetch-on-mount
    void fetchFirstPage(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- fetch once per mount: the API client's identity changes every render (see useApiClient.ts).
  }, []);

  return {
    state,
    reload: () => fetchFirstPage(false),
    refresh: () => fetchFirstPage(true),
    loadMore,
  };
}
