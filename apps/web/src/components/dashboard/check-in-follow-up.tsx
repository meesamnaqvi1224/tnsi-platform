'use client';

import * as React from 'react';
import { Alert, Button, Stack, Text } from '@tnsi/ui';
import {
  FOLLOW_UP_ROUTING,
  backInFollowUp,
  canGoBackInFollowUp,
  chooseInFollowUp,
  currentFollowUpStep,
  followUpScreen,
  startFollowUp,
  type FollowUp,
  type FollowUpFlowState,
  type FollowUpOption,
} from '@tnsi/core';

interface CheckInFollowUpProps {
  /** The first check-in answer (1 to 5) this follow-up belongs to. */
  capacity: number;
  /** True while the check-in is being saved. */
  disabled: boolean;
  /** A save error to show above the question (the choice can then be made again). */
  error: string | null;
  /** The member finished the questions. */
  onDone: (followUp: FollowUp) => void;
  /** The member chose to skip: the check-in is saved without a follow-up. */
  onSkip: () => void;
  /** Back from the first question, to the check-in answers. */
  onExit: () => void;
}

const optionClassName =
  'border-foreground/30 bg-background/70 text-foreground hover:border-foreground focus-visible:ring-ring duration-base ease-standard w-full rounded-sm border px-4 py-3 text-left text-base transition-colors focus-visible:ring-2 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50';

/**
 * The second check-in question, shown after the member has chosen how they feel. The questions, wording
 * and rules all come from `@tnsi/core` (the same flow the app draws); this only renders them. One
 * question at a time, plain words only, a visible Back, and a way to skip. Choosing the last option
 * saves the check-in with the answer; skipping saves it without.
 */
export function CheckInFollowUp({
  capacity,
  disabled,
  error,
  onDone,
  onSkip,
  onExit,
}: CheckInFollowUpProps) {
  const [flow, setFlow] = React.useState<FollowUpFlowState | null>(() => startFollowUp(capacity));
  const headingRef = React.useRef<HTMLLegendElement>(null);
  const step = flow ? currentFollowUpStep(flow) : null;

  // Move focus to the new question so a keyboard or screen-reader user lands on it.
  React.useEffect(() => {
    headingRef.current?.focus();
  }, [step]);

  if (!FOLLOW_UP_ROUTING || !flow || !step) return null;
  const screen = followUpScreen(FOLLOW_UP_ROUTING, step);

  function choose(option: FollowUpOption) {
    if (!flow) return;
    const result = chooseInFollowUp(flow, option.choice);
    if (result.done) onDone(result.followUp);
    else setFlow(result.state);
  }

  function back() {
    if (flow && canGoBackInFollowUp(flow)) setFlow(backInFollowUp(flow));
    else onExit();
  }

  return (
    <fieldset className="flex flex-col gap-(--space-md)" disabled={disabled}>
      <legend
        ref={headingRef}
        tabIndex={-1}
        className="text-foreground mb-(--space-sm) text-lg font-medium outline-none"
      >
        {screen.heading}
      </legend>

      {error ? <Alert variant="destructive">{error}</Alert> : null}

      <ul className="flex flex-col gap-(--space-sm)">
        {screen.options.map((option) => (
          <li key={option.key}>
            <button type="button" className={optionClassName} onClick={() => choose(option)}>
              {option.label}
            </button>
          </li>
        ))}
      </ul>

      {screen.notSure ? (
        <button
          type="button"
          className={`${optionClassName} border-dashed`}
          onClick={() => choose(screen.notSure!)}
        >
          {screen.notSure.label}
        </button>
      ) : null}

      <Stack direction="row" gap="md">
        <Button type="button" variant="ghost" onClick={back}>
          Back
        </Button>
        <Button type="button" variant="ghost" onClick={onSkip}>
          Skip this question
        </Button>
      </Stack>
      <Text tone="muted" size="xs">
        There are no right answers. This only helps us suggest something that fits.
      </Text>
    </fieldset>
  );
}
