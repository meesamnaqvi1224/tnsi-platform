'use client';

import * as React from 'react';
import NextLink from 'next/link';
import { Alert, Button, Heading, Stack, Text, Textarea } from '@tnsi/ui';

type ResponseValue = 'DIFFERENT' | 'SAME' | 'NOT_SURE';

const RESPONSE_OPTIONS: { value: ResponseValue; label: string }[] = [
  { value: 'DIFFERENT', label: 'I feel different' },
  { value: 'SAME', label: 'I feel the same' },
  { value: 'NOT_SURE', label: "I'm not sure yet" },
];

interface PostPracticeReflectionProps {
  practiceId: string;
  /** The specific session this reflection is about - required, since a reflection now belongs to one completion, not "this practice" in general (see packages/db/src/schema/practice-reflections.ts). */
  completionId: string;
  initialReflection: { response: ResponseValue | null; reflection: string | null } | null;
}

/**
 * Shown once a practice is marked complete (see PracticeExperience) -
 * never before, and never blocking. Both the response pill and the
 * reflection text are optional and independent: a member can pick one,
 * write the other, both, or neither and just use "Continue" - "Save
 * reflection" is only ever offered as something to opt into, matching the
 * product principle that this is space to notice, not a form to finish.
 *
 * Purely self-reported and never interpreted: the three options are
 * recorded verbatim (see packages/db/src/schema/enums.ts's
 * postPracticeResponseEnum) - nothing here scores, diagnoses, or explains
 * what a response "means".
 */
export function PostPracticeReflection({
  practiceId,
  completionId,
  initialReflection,
}: PostPracticeReflectionProps) {
  const [response, setResponse] = React.useState<ResponseValue | null>(
    initialReflection?.response ?? null,
  );
  const [text, setText] = React.useState(initialReflection?.reflection ?? '');
  const [status, setStatus] = React.useState<'idle' | 'saving' | 'saved' | 'error'>('idle');

  async function handleSave() {
    setStatus('saving');
    try {
      const res = await fetch(`/api/v1/practices/${practiceId}/reflection`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          completionId,
          ...(response ? { response } : {}),
          ...(text.trim() ? { reflection: text.trim() } : {}),
        }),
      });
      if (!res.ok) throw new Error('save failed');
      setStatus('saved');
    } catch {
      // The practice completion this follows is already saved and
      // unaffected - a failed reflection save just means this stays on
      // screen so the member can try again, not a broken practice.
      setStatus('error');
    }
  }

  return (
    <Stack gap="lg">
      <Stack gap="xs">
        <Heading as="h2" size="sm">
          Practice complete
        </Heading>
        <Text tone="muted">Take a moment before moving on.</Text>
      </Stack>

      <fieldset className="flex flex-col gap-(--space-sm)">
        <legend className="text-foreground text-sm font-medium">How do you feel now?</legend>
        <div className="flex flex-wrap gap-(--space-sm)">
          {RESPONSE_OPTIONS.map((option) => {
            const id = `post-practice-response-${option.value}`;
            const selected = response === option.value;
            return (
              <span key={option.value} className="contents">
                <input
                  type="radio"
                  id={id}
                  name="post-practice-response"
                  value={option.value}
                  checked={selected}
                  onChange={() => setResponse(option.value)}
                  disabled={status === 'saving'}
                  className="peer sr-only"
                />
                <label
                  htmlFor={id}
                  className="peer-checked:border-foreground peer-checked:bg-foreground peer-checked:text-background peer-focus-visible:ring-ring border-border text-muted-foreground duration-base ease-standard cursor-pointer rounded-full border px-(--space-md) py-(--space-sm) text-sm font-medium transition-colors peer-checked:border-2 peer-checked:font-semibold peer-focus-visible:ring-2 peer-focus-visible:ring-offset-2 peer-disabled:cursor-not-allowed peer-disabled:opacity-50"
                >
                  {option.label}
                </label>
              </span>
            );
          })}
        </div>
      </fieldset>

      <Stack gap="sm">
        <label htmlFor="post-practice-reflection" className="text-foreground text-sm font-medium">
          What did you notice?
        </label>
        <Textarea
          id="post-practice-reflection"
          name="reflection"
          rows={3}
          maxLength={2000}
          placeholder="Optional"
          value={text}
          onChange={(event) => setText(event.target.value)}
          disabled={status === 'saving'}
          className="border-border/80 bg-background rounded-sm"
        />
      </Stack>

      {status === 'error' ? (
        <Alert variant="destructive">
          We couldn&rsquo;t save that. Your practice is still marked complete - you can try saving
          again, or just continue.
        </Alert>
      ) : null}

      <Stack direction="row" gap="md" align="center" wrap="wrap">
        <Button type="button" onClick={handleSave} disabled={status === 'saving'}>
          {status === 'saving' ? 'Saving…' : status === 'saved' ? 'Saved' : 'Save reflection'}
        </Button>
        <NextLink href="/dashboard" className="interaction-text-link-underline text-sm">
          Continue
        </NextLink>
      </Stack>
    </Stack>
  );
}
