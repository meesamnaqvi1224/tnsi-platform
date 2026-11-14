import { useEffect, useState } from 'react';
import { useApiClient } from './useApiClient';

/**
 * Whether an account deletion this member started is still unfinished (GET /api/v1/me/account). The
 * Profile screen uses it to say so and to offer to finish it. A failed request simply reports "not
 * pending" - this is optional context, never a reason to block the screen.
 */
export function useAccountDeletionStatus() {
  const api = useApiClient();
  const [pending, setPending] = useState(false);

  useEffect(() => {
    let cancelled = false;
    api
      .get<{ status: 'active' | 'pending' }>('/api/v1/me/account')
      .then((result) => {
        if (!cancelled) setPending(result.status === 'pending');
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- fetch-once-on-mount is intentional: `api` changes identity on every render (Clerk's `getToken` isn't stable - see useApiClient.ts), so depending on it would re-fire every render.
  }, []);

  return { pending, setPending };
}
