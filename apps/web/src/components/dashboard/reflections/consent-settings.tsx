'use client';

import * as React from 'react';
import NextLink from 'next/link';
import { useRouter } from 'next/navigation';
import { Alert, Button, Stack, Text } from '@tnsi/ui';
import { JOURNAL_CONSENT_COPY, type JournalConsentStatus } from '@tnsi/core';
import { reflectionsApi } from '@/lib/reflections-web-client';

/**
 * Where a member who has agreed can withdraw permission to write (decision Q1), or, after withdrawing,
 * agree again. Withdrawing stops new reflections and changes to existing ones; it never deletes anything
 * and the member can still read and delete what they wrote. Two steps (ask, then confirm) so it is never
 * one stray click. PROPOSED wording; legal review pending.
 */
export function ConsentSettings({ status }: { status: JournalConsentStatus }) {
  const router = useRouter();
  const [confirming, setConfirming] = React.useState(false);
  const [working, setWorking] = React.useState(false);
  const [failed, setFailed] = React.useState(false);
  const copy = JOURNAL_CONSENT_COPY.withdraw;

  const withdraw = React.useCallback(async () => {
    setWorking(true);
    setFailed(false);
    try {
      await reflectionsApi.delete('/api/v1/journal/consent');
      router.refresh();
    } catch {
      setFailed(true);
      setWorking(false);
    }
  }, [router]);

  if (status === 'required') return null;
  if (status === 'withdrawn') {
    return (
      <Text tone="muted" className="text-sm">
        {copy.done}{' '}
        <NextLink href="/dashboard/reflections/new" className="interaction-focus underline">
          {JOURNAL_CONSENT_COPY.agreeButton}
        </NextLink>
      </Text>
    );
  }
  return (
    <Stack gap="sm">
      {!confirming ? (
        <div>
          <Button type="button" variant="outline" onClick={() => setConfirming(true)}>
            {copy.button}
          </Button>
        </div>
      ) : (
        <Stack gap="sm">
          <Text className="text-sm">
            <strong>{copy.confirmTitle}</strong> {copy.confirmMessage}
          </Text>
          <div className="flex flex-wrap gap-3">
            <Button type="button" onClick={withdraw} disabled={working}>
              {copy.confirmButton}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => setConfirming(false)}
              disabled={working}
            >
              {copy.cancelButton}
            </Button>
          </div>
        </Stack>
      )}
      <div aria-live="polite">
        {failed ? <Alert variant="destructive">{copy.failed}</Alert> : null}
      </div>
    </Stack>
  );
}
