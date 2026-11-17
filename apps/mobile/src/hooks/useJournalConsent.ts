import { useEffect, useState } from 'react';
import { JOURNAL_CONSENT_COPY, type JournalConsentState } from '@tnsi/core';
import { useApiClient } from './useApiClient';

export type JournalConsentView =
  | { status: 'loading' }
  | { status: 'unknown' }
  | { status: JournalConsentState['status']; version: string };

/**
 * The member's first-use acknowledgement for My Reflections (decision Q1, 16 Nov 2026). The server is the
 * authority: it refuses to create or change a reflection without a current acknowledgement (403
 * JOURNAL_CONSENT_REQUIRED), so this hook only decides what to SHOW. If the state cannot be read the view
 * is `unknown`, and the screens carry on as before - a save the server refuses reports why.
 *
 * `agree` records the notice version the member was shown; `withdraw` stops writing; with
 * `deleteEntries` it also deletes every reflection (the member's explicit choice). Otherwise existing
 * reflections stay and can still be read and deleted. Both return whether they worked. Nothing is
 * stored on the device.
 */
export function useJournalConsent() {
  const api = useApiClient();
  const [view, setView] = useState<JournalConsentView>({ status: 'loading' });
  const [busy, setBusy] = useState(false);

  // Read the state once when the screen opens. `api` changes identity on every render (see useApiClient),
  // so it is deliberately not a dependency: listing it would re-fetch on every render.
  useEffect(() => {
    let cancelled = false;
    api
      .get<JournalConsentState>('/api/v1/journal/consent')
      .then((state) => {
        if (!cancelled) setView({ status: state.status, version: state.version });
      })
      .catch(() => {
        if (!cancelled) setView({ status: 'unknown' });
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- fetch-once-on-mount is intentional (see above)
  }, []);

  async function agree(version: string): Promise<boolean> {
    setBusy(true);
    try {
      const state = await api.post<JournalConsentState>('/api/v1/journal/consent', { version });
      setView({ status: state.status, version: state.version });
      return state.status === 'granted';
    } catch {
      return false;
    } finally {
      setBusy(false);
    }
  }

  async function withdraw(deleteEntries = false): Promise<boolean> {
    setBusy(true);
    try {
      const state = await api.delete<JournalConsentState>(
        deleteEntries ? '/api/v1/journal/consent?entries=delete' : '/api/v1/journal/consent',
      );
      setView({ status: state.status, version: state.version });
      return true;
    } catch {
      return false;
    } finally {
      setBusy(false);
    }
  }

  return { view, busy, agree, withdraw, copy: JOURNAL_CONSENT_COPY };
}
