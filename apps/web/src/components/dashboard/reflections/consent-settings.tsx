'use client';

import * as React from 'react';
import NextLink from 'next/link';
import { useRouter } from 'next/navigation';
import { Alert, Button, Stack, Text } from '@tnsi/ui';
import { JOURNAL_CONSENT_COPY, type JournalConsentStatus } from '@tnsi/core';
import { reflectionsApi } from '@/lib/reflections-web-client';

/**
 * Where a member who has agreed can withdraw permission to write (decision Q1), or, after withdrawing,
 * agree again. Withdrawing stops new reflections and changes to existing ones. At withdrawal the member
 * chooses: keep their reflections (the default, still readable and deletable) or delete them all now
 * (a second, explicit confirmation, because it cannot be undone). Never one stray click. PROPOSED wording;
 * legal review pending.
 */
export function ConsentSettings({ status }: { status: JournalConsentStatus }) {
  const router = useRouter();
  const [step, setStep] = React.useState<'idle' | 'choose' | 'confirmDelete'>('idle');
  const [working, setWorking] = React.useState(false);
  const [failed, setFailed] = React.useState(false);
  const copy = JOURNAL_CONSENT_COPY.withdraw;

  const withdraw = React.useCallback(
    async (deleteEntries: boolean) => {
      setWorking(true);
      setFailed(false);
      try {
        await reflectionsApi.delete(
          deleteEntries ? '/api/v1/journal/consent?entries=delete' : '/api/v1/journal/consent',
        );
        router.refresh();
      } catch {
        setFailed(true);
        setWorking(false);
      }
    },
    [router],
  );

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
      {step === 'idle' ? (
        <div>
          <Button type="button" variant="outline" onClick={() => setStep('choose')}>
            {copy.button}
          </Button>
        </div>
      ) : step === 'choose' ? (
        <Stack gap="sm">
          <Text className="text-sm">
            <strong>{copy.confirmTitle}</strong> {copy.confirmMessage}
          </Text>
          <div className="flex flex-wrap gap-3">
            <Button type="button" onClick={() => withdraw(false)} disabled={working}>
              {copy.keepButton}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => setStep('confirmDelete')}
              disabled={working}
            >
              {copy.deleteButton}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => setStep('idle')}
              disabled={working}
            >
              {copy.cancelButton}
            </Button>
          </div>
        </Stack>
      ) : (
        <Stack gap="sm">
          <Text className="text-sm">
            <strong>{copy.deleteButton}?</strong> {copy.deleteWarning}
          </Text>
          <div className="flex flex-wrap gap-3">
            <Button type="button" onClick={() => withdraw(true)} disabled={working}>
              {copy.deleteButton}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => setStep('choose')}
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
