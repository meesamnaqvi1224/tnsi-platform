'use client';

import * as React from 'react';
import { Alert, Button } from '@tnsi/ui';

type Status = 'idle' | 'submitting' | 'completed' | 'error';

interface PracticeCompleteButtonProps {
  practiceId: string;
  /** Called once, after a successful save, with the id of the now-completed session - lets a parent (see PracticeExperience) move on to the reflection step, and attach it to the right session, without this component knowing anything about what happens after. */
  onCompleted?: (completionId: string) => void;
}

/**
 * Posts to the existing `POST /api/v1/practices/[id]/complete` — no new
 * endpoint. That route already upserts idempotently (updates the existing
 * completion row rather than rejecting a repeat call), so there's no
 * "already completed" error case to handle here, unlike check-ins.
 *
 * Never renders anything for an already-completed practice itself - the
 * parent (PracticeExperience) owns that decision and simply doesn't mount
 * this component once `completed` is true, swapping in
 * PostPracticeReflection instead.
 */
export function PracticeCompleteButton({ practiceId, onCompleted }: PracticeCompleteButtonProps) {
  const [status, setStatus] = React.useState<Status>('idle');
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);

  async function handleClick() {
    setStatus('submitting');
    setErrorMessage(null);

    try {
      const response = await fetch(`/api/v1/practices/${practiceId}/complete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ completed: true }),
      });

      if (response.ok) {
        const json = (await response.json().catch(() => null)) as { data?: { id?: string } } | null;
        setStatus('completed');
        if (json?.data?.id) onCompleted?.(json.data.id);
        return;
      }

      setStatus('error');
      setErrorMessage("We couldn't save that. Please try again.");
    } catch {
      setStatus('error');
      setErrorMessage("We couldn't save that. Please try again.");
    }
  }

  return (
    <div>
      {status === 'error' && errorMessage ? (
        <Alert variant="destructive" className="mb-(--space-sm)">
          {errorMessage}
        </Alert>
      ) : null}
      <Button type="button" onClick={handleClick} disabled={status === 'submitting'}>
        {status === 'submitting' ? 'Saving…' : 'Mark as Complete'}
      </Button>
    </div>
  );
}
