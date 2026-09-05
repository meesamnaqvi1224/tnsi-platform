import { useMemo } from 'react';
import { useAuth } from '@clerk/clerk-expo';
import { createApiClient } from '@/api/client';

/** Binds the typed API client to the current Clerk session's `getToken()`. */
export function useApiClient() {
  const { getToken } = useAuth();

  return useMemo(() => createApiClient(() => getToken()), [getToken]);
}
