import { useEffect, useState } from 'react';
import { useApiClient } from './useApiClient';

/**
 * Which optional features the server has switched on. The server is the authority (it refuses a switched
 * -off feature's own routes), so this only decides what to SHOW. Fails closed: until the answer arrives,
 * and if it cannot be read, every optional feature is treated as off and its entry points stay hidden.
 */
export function useFeatures(): { reflections: boolean; ready: boolean } {
  const api = useApiClient();
  const [state, setState] = useState({ reflections: false, ready: false });

  useEffect(() => {
    let cancelled = false;
    api
      .get<{ reflections: boolean }>('/api/v1/features')
      .then((f) => {
        if (!cancelled) setState({ reflections: f.reflections === true, ready: true });
      })
      .catch(() => {
        if (!cancelled) setState({ reflections: false, ready: true });
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- fetch once on mount; `api` changes identity every render
  }, []);

  return state;
}
