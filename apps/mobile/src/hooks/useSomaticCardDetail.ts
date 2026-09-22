import { useCallback, useEffect, useState } from 'react';
import { useApiClient } from './useApiClient';
import { fetchSomaticCardDetail } from '@/api/somatic-cards';
import { humanizeApiError } from '@/lib/api-errors';
import { ApiRequestError } from '@/api/types';
import type { SomaticCardDetail } from '@/api/types';

export type SomaticCardDetailState =
  | { status: 'loading' }
  | { status: 'not-found' }
  | { status: 'success'; card: SomaticCardDetail }
  | { status: 'error'; message: string };

/** Fetches GET /api/v1/somatic-cards/[cardSlug] once per screen visit - same shape as usePowerDropDetail. */
export function useSomaticCardDetail(cardSlug: string) {
  const api = useApiClient();
  const [state, setState] = useState<SomaticCardDetailState>({ status: 'loading' });

  const load = useCallback(async () => {
    setState({ status: 'loading' });
    try {
      const card = await fetchSomaticCardDetail(api, cardSlug);
      setState({ status: 'success', card });
    } catch (err) {
      if (err instanceof ApiRequestError && err.status === 404) {
        setState({ status: 'not-found' });
      } else {
        setState({ status: 'error', message: humanizeApiError(err) });
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- `api` intentionally excluded, see useApiClient.ts
  }, [cardSlug]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- standard fetch-on-mount
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- depends on `cardSlug`, not `load`, see usePowerDropDetail.ts's identical comment
  }, [cardSlug]);

  return { state, reload: load };
}
