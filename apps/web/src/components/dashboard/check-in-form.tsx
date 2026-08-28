'use client';

import * as React from 'react';
import { Alert, Button, Label, Stack, Text, Textarea } from '@tnsi/ui';

const SCALE = [1, 2, 3, 4, 5] as const;

type Status = 'idle' | 'submitting' | 'success' | 'already' | 'error';

interface ScaleFieldProps {
  name: string;
  legend: string;
  value: number | null;
  onChange: (value: number) => void;
  disabled: boolean;
}

function ScaleField({ name, legend, value, onChange, disabled }: ScaleFieldProps) {
  return (
    <fieldset className="flex flex-col gap-(--space-sm)">
      <legend className="text-foreground text-sm font-medium">{legend}</legend>
      <div className="flex gap-(--space-sm)">
        {SCALE.map((n) => {
          const id = `${name}-${n}`;
          return (
            <span key={n} className="contents">
              <input
                type="radio"
                id={id}
                name={name}
                value={n}
                checked={value === n}
                onChange={() => onChange(n)}
                disabled={disabled}
                required
                className="peer sr-only"
              />
              <label
                htmlFor={id}
                className="peer-checked:border-foreground peer-checked:bg-foreground peer-checked:text-background peer-focus-visible:ring-ring border-border text-muted-foreground duration-base ease-standard flex size-11 min-w-11 cursor-pointer items-center justify-center rounded-full border text-sm font-medium transition-colors peer-checked:border-2 peer-checked:font-semibold peer-focus-visible:ring-2 peer-focus-visible:ring-offset-2 peer-disabled:cursor-not-allowed peer-disabled:opacity-50"
              >
                {n}
              </label>
            </span>
          );
        })}
      </div>
      <Stack direction="row" justify="between">
        <Text tone="muted" size="xs">
          Low
        </Text>
        <Text tone="muted" size="xs">
          High
        </Text>
      </Stack>
    </fieldset>
  );
}

export function CheckInForm() {
  const [mood, setMood] = React.useState<number | null>(null);
  const [capacity, setCapacity] = React.useState<number | null>(null);
  const [notes, setNotes] = React.useState('');
  const [status, setStatus] = React.useState<Status>('idle');
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (mood === null || capacity === null) return;

    setStatus('submitting');
    setErrorMessage(null);

    try {
      const response = await fetch('/api/v1/check-ins', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          moodScore: mood,
          capacityScore: capacity,
          notes: notes.trim() || undefined,
        }),
      });

      if (response.ok) {
        setStatus('success');
        return;
      }

      const json = (await response.json().catch(() => null)) as {
        error?: { message?: string };
      } | null;

      if (
        response.status === 400 &&
        json?.error?.message === 'Check-in already exists for this date'
      ) {
        setStatus('already');
        return;
      }

      setStatus('error');
      setErrorMessage("We couldn't save your check-in. Please try again.");
    } catch {
      setStatus('error');
      setErrorMessage("We couldn't save your check-in. Please try again.");
    }
  }

  if (status === 'success') {
    return (
      <div role="status">
        <Text className="text-base leading-[1.85]">Check-in saved.</Text>
        <Text tone="muted" className="text-base leading-[1.85]">
          Thank you for taking a moment to notice where you are.
        </Text>
      </div>
    );
  }

  if (status === 'already') {
    return (
      <div role="status">
        <Text className="text-base leading-[1.85]">You&rsquo;ve checked in today.</Text>
        <Text tone="muted" className="text-base leading-[1.85]">
          Take a moment to notice where you are, and return whenever you need to pause.
        </Text>
      </div>
    );
  }

  const submitting = status === 'submitting';

  return (
    <form onSubmit={handleSubmit} noValidate={false}>
      <Stack gap="xl">
        {status === 'error' && errorMessage ? (
          <Alert variant="destructive">{errorMessage}</Alert>
        ) : null}

        <ScaleField
          name="mood"
          legend="Mood"
          value={mood}
          onChange={setMood}
          disabled={submitting}
        />
        <ScaleField
          name="capacity"
          legend="Capacity"
          value={capacity}
          onChange={setCapacity}
          disabled={submitting}
        />

        <Stack gap="sm">
          <Label htmlFor="check-in-notes">Anything you&rsquo;d like to note (optional)</Label>
          <Textarea
            id="check-in-notes"
            name="notes"
            rows={3}
            maxLength={2000}
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            disabled={submitting}
            className="border-border/80 bg-background rounded-sm"
          />
        </Stack>

        <Stack gap="xs">
          {mood === null || capacity === null ? (
            <Text tone="muted" size="sm">
              Select a mood and capacity above to save your check-in.
            </Text>
          ) : null}
          <Button
            type="submit"
            disabled={submitting || mood === null || capacity === null}
            className="w-full shadow-sm sm:w-fit"
          >
            {submitting ? 'Saving…' : 'Save Check-In'}
          </Button>
        </Stack>
      </Stack>
    </form>
  );
}
