'use client';

import * as React from 'react';
import NextLink from 'next/link';
import { Alert, Button, Stack } from '@tnsi/ui';
import {
  DELETION_COPY,
  interpretDeletionResponse,
  type DeletionOutcome,
} from '@/lib/account-deletion-client';

type Phase = 'idle' | 'confirming' | 'working' | 'done';

/**
 * Deletes the signed-in member's own account through the same endpoint the app uses. Two steps so it
 * cannot happen by accident: press "Delete my account", then tick that it cannot be undone and confirm.
 * Only a real 200 is shown as complete; every other outcome says what actually happened.
 */
export function DeleteAccountPanel({ initialPending }: { initialPending: boolean }) {
  const [phase, setPhase] = React.useState<Phase>('idle');
  const [understood, setUnderstood] = React.useState(false);
  const [outcome, setOutcome] = React.useState<DeletionOutcome | null>(null);

  const run = React.useCallback(async () => {
    setPhase('working');
    setOutcome(null);
    let result: DeletionOutcome;
    try {
      const response = await fetch('/api/v1/me/account', { method: 'DELETE' });
      const body = await response.json().catch(() => null);
      result = interpretDeletionResponse(response.status, body);
    } catch {
      result = interpretDeletionResponse(0, null);
    }
    setOutcome(result);
    setPhase(result.kind === 'deleted' || result.kind === 'finishing' ? 'done' : 'confirming');
  }, []);

  if (phase === 'done' && outcome) {
    return (
      <Stack gap="md">
        <Alert variant="success">
          {outcome.kind === 'deleted' ? DELETION_COPY.deleted : DELETION_COPY.finishing}
        </Alert>
        <NextLink className="interaction-focus text-sm underline" href="/">
          Return to the home page
        </NextLink>
      </Stack>
    );
  }

  return (
    <Stack gap="lg">
      {initialPending && phase === 'idle' ? (
        <Alert variant="destructive">{DELETION_COPY.pending}</Alert>
      ) : null}

      {phase === 'idle' ? (
        <Button type="button" variant="outline" size="lg" onClick={() => setPhase('confirming')}>
          {initialPending ? 'Finish deleting my account' : 'Delete my account'}
        </Button>
      ) : (
        <Stack gap="md">
          <p className="text-foreground text-sm leading-relaxed">
            This permanently deletes your account and everything you wrote in My Reflections. You
            will be signed out everywhere. This cannot be undone.
          </p>
          <label className="flex items-start gap-3 text-sm">
            <input
              type="checkbox"
              className="mt-1"
              checked={understood}
              onChange={(event) => setUnderstood(event.target.checked)}
              disabled={phase === 'working'}
            />
            <span>I understand this cannot be undone.</span>
          </label>
          <div className="flex flex-wrap gap-3">
            <Button
              type="button"
              size="lg"
              onClick={run}
              disabled={!understood || phase === 'working'}
            >
              {phase === 'working' ? 'Deleting…' : 'Permanently delete my account'}
            </Button>
            <Button
              type="button"
              variant="outline"
              size="lg"
              onClick={() => {
                setPhase('idle');
                setUnderstood(false);
                setOutcome(null);
              }}
              disabled={phase === 'working'}
            >
              Cancel
            </Button>
          </div>
        </Stack>
      )}

      <div aria-live="polite">
        {outcome && outcome.kind !== 'deleted' && outcome.kind !== 'finishing' ? (
          <Stack gap="sm">
            <Alert variant="destructive">{outcome.message}</Alert>
            {outcome.kind === 'subscription_active' ? (
              <NextLink href={outcome.manageHref} className="interaction-focus text-sm underline">
                Manage your membership
              </NextLink>
            ) : null}
          </Stack>
        ) : null}
      </div>
    </Stack>
  );
}
