import { useMemo } from 'react';
import { useAuth } from '@clerk/clerk-expo';
import { createApiClient } from '@/api/client';

/**
 * Binds the typed API client to the current Clerk session's `getToken()`.
 *
 * `getToken` isn't guaranteed referentially stable across renders
 * (observed live on iOS: it changes every render), so `api`'s identity
 * changes here too. Every screen's data hook's fetch-on-mount effect
 * (useToday/usePractices/useArticles/etc.) accounts for this by using an
 * empty dependency array rather than depending on `load`'s identity - see
 * those files for why that's the correct fix rather than trying to force
 * `api` itself to stay stable (which conflicts with the project's
 * ref-during-render lint rule).
 */
export function useApiClient() {
  const { getToken } = useAuth();

  return useMemo(() => createApiClient(() => getToken()), [getToken]);
}
