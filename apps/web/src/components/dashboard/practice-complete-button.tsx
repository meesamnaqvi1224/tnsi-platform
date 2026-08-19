'use client';

import * as React from 'react';
import { Alert, Button, Text } from '@tnsi/ui';

type Status = 'idle' | 'submitting' | 'completed' | 'error';

interface PracticeCompleteButtonProps {
  practiceId: string;
  initialCompleted: boolean;
}

/**
 * Posts to the existing `POST /api/v1/practices/[id]/complete` — no new
 * endpoint. That route already upserts idempotently (updates the existing
 * completion row rather than rejecting a repeat call), so there's no
 * "already completed" error case to handle here, unlike check-ins.
 */
export function PracticeCompleteButton({
  practiceId,
  initialCompleted,
}: PracticeCompleteButtonProps) {
  const [status, setStatus] = React.useState<Status>(initialCompleted ? 'completed' : 'idle');
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
        setStatus('completed');
        return;
      }

      setStatus('error');
      setErrorMessage("We couldn't save that. Please try again.");
    } catch {
      setStatus('error');
      setErrorMessage("We couldn't save that. Please try again.");
    }
  }

  if (status === 'completed') {
    return (
      <Text role="status" tone="muted">
        Completed
      </Text>
    );
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
