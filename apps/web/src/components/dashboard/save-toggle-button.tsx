'use client';

import { useState } from 'react';
import { Button, cn } from '@tnsi/ui';

interface SaveToggleButtonProps {
  practiceId: string;
  initialSaved: boolean;
  className?: string;
}

/**
 * A personal bookmark toggle - "Save" / "Saved", never an icon-only
 * control (see practice-saves.ts's own comment: this is a plain on/off
 * convenience, not a score or an interpretation of intent). Deliberately
 * optimistic (flips immediately, reverts on failure) unlike
 * PracticeCompleteButton's wait-for-response pattern elsewhere in this
 * app - saving is trivially reversible with no data-loss consequence, so
 * the instant feedback is worth the small risk of a rare revert, where a
 * completion or reflection is not.
 */
export function SaveToggleButton({ practiceId, initialSaved, className }: SaveToggleButtonProps) {
  const [saved, setSaved] = useState(initialSaved);
  const [pending, setPending] = useState(false);

  async function toggle(event: React.MouseEvent) {
    // Defensive only - this button is never actually nested inside a
    // navigating link in this app, but stopping propagation costs nothing
    // and guards against a future wrapping accidentally triggering
    // navigation/playback on the same click.
    event.preventDefault();
    event.stopPropagation();
    if (pending) return;

    const next = !saved;
    setSaved(next);
    setPending(true);

    try {
      const response = await fetch(`/api/v1/practices/${practiceId}/save`, {
        method: next ? 'POST' : 'DELETE',
      });
      if (!response.ok) throw new Error('Save request failed');
    } catch {
      setSaved(!next);
    } finally {
      setPending(false);
    }
  }

  return (
    <Button
      type="button"
      variant={saved ? 'secondary' : 'outline'}
      size="sm"
      onClick={(event) => void toggle(event)}
      disabled={pending}
      aria-label={saved ? 'Remove practice from saved' : 'Save practice'}
      aria-pressed={saved}
      className={cn('shrink-0', className)}
    >
      {saved ? 'Saved' : 'Save'}
    </Button>
  );
}
