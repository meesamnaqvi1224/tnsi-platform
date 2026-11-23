'use client';

import * as React from 'react';
import NextLink from 'next/link';
import { Check, Clock } from 'lucide-react';
import { buttonVariants, cn, Heading, Text } from '@tnsi/ui';
import {
  buildSummary,
  canContinue,
  changeSentence,
  exerciseProgress,
  toggleChoice,
  type ExerciseAnswer,
  type ExerciseAnswers,
  type ExerciseStep,
  type GuidedExercise,
} from '@tnsi/core';
import { ResetBrand, ResetShell } from '../ninety-second-reset/reset-shell';
import { recordExerciseCompletion } from '@/lib/record-exercise-completion';

const PRACTICES_HREF = '/dashboard/practices';

/** The words the screen itself uses. Everything else comes from the exercise. */
export const EXERCISE_UI = {
  back: 'Back',
  begin: 'Begin',
  next: 'Next',
  finish: 'Finish',
  exit: 'Exit',
  backToPractices: 'Back to Practices',
  optional: 'Optional',
  yourAnswers: 'Your answers',
  onlyHere:
    'Your answers stay on this device and are not saved. Only the fact that you finished is recorded.',
  before: 'Before',
  after: 'After',
  seeSummary: 'See your summary',
} as const;

type Phase =
  { kind: 'intro' } | { kind: 'step'; index: number } | { kind: 'summary' } | { kind: 'closing' };

const chip =
  'inline-flex w-fit items-center gap-2.5 rounded-full border border-(--rs-line) bg-(--rs-card) px-3.5 py-1.5 text-xs font-medium tracking-[0.18em] text-(--rs-ink-soft) uppercase';
const primaryButton = cn(
  buttonVariants({ size: 'lg' }),
  'h-14 rounded-full bg-(--rs-ink) px-10 text-base text-(--rs-ground) hover:bg-(--rs-ink)/90 disabled:opacity-40',
);
const quietButton =
  'inline-flex min-h-11 items-center rounded-full px-4 text-sm text-(--rs-ink-soft) underline-offset-4 hover:text-(--rs-ink) hover:underline focus-visible:ring-2 focus-visible:ring-(--rs-bronze) focus-visible:outline-none';
const choiceButton = (selected: boolean) =>
  cn(
    'flex min-h-14 w-full items-center justify-between gap-3 rounded-2xl border px-5 py-3 text-left text-base transition-colors focus-visible:ring-2 focus-visible:ring-(--rs-bronze) focus-visible:outline-none',
    selected
      ? 'border-(--rs-bronze) bg-(--rs-wash) text-(--rs-ink)'
      : 'border-(--rs-line) bg-(--rs-card) text-(--rs-ink) hover:border-(--rs-bronze)',
  );

/**
 * One reusable, calm screen that plays any guided exercise: an introduction, then each step in turn,
 * an optional summary, and a quiet close. What it says comes from the exercise (CMS content); how a
 * step may be answered and summarised comes from `@tnsi/core`, shared with the app. Answers are held
 * in memory for the session only: nothing is sent anywhere but the fact of completion.
 */
export function ExerciseExperience({ exercise }: { exercise: GuidedExercise }) {
  const [phase, setPhase] = React.useState<Phase>({ kind: 'intro' });
  const [answers, setAnswers] = React.useState<ExerciseAnswers>({});
  const recorded = React.useRef(false);
  const headingRef = React.useRef<HTMLHeadingElement>(null);

  const total = exercise.steps.length;
  const stepIndex = phase.kind === 'step' ? phase.index : 0;
  const phaseKey = phase.kind === 'step' ? `step-${phase.index}` : phase.kind;

  // Move focus to the new screen's heading so a keyboard or screen-reader user lands on it.
  React.useEffect(() => {
    headingRef.current?.focus();
  }, [phaseKey]);

  // Completion is recorded once, when the closing screen is reached.
  React.useEffect(() => {
    if (phase.kind === 'closing' && !recorded.current) {
      recorded.current = true;
      recordExerciseCompletion(exercise.slug);
    }
  }, [phase.kind, exercise.slug]);

  const setAnswer = (stepId: string, answer: ExerciseAnswer) =>
    setAnswers((prev) => ({ ...prev, [stepId]: answer }));

  const afterLastStep = (): Phase => (exercise.summary ? { kind: 'summary' } : { kind: 'closing' });
  const next = () =>
    setPhase((p) =>
      p.kind === 'intro'
        ? { kind: 'step', index: 0 }
        : p.kind === 'step'
          ? p.index + 1 < total
            ? { kind: 'step', index: p.index + 1 }
            : afterLastStep()
          : { kind: 'closing' },
    );
  const back = () =>
    setPhase((p) =>
      p.kind === 'step'
        ? p.index > 0
          ? { kind: 'step', index: p.index - 1 }
          : { kind: 'intro' }
        : p.kind === 'summary'
          ? { kind: 'step', index: total - 1 }
          : p,
    );

  const heading =
    'font-heading text-3xl leading-tight font-medium text-balance text-(--rs-ink) outline-none sm:text-4xl';

  return (
    <ResetShell>
      <header className="flex items-start justify-between gap-4">
        <ResetBrand />
        {phase.kind === 'closing' ? null : (
          <NextLink href={PRACTICES_HREF} className={cn(quietButton, '-mt-2 -mr-3')}>
            {EXERCISE_UI.exit}
          </NextLink>
        )}
      </header>

      {phase.kind === 'step' ? (
        <div
          role="progressbar"
          aria-label="Progress"
          aria-valuemin={0}
          aria-valuemax={total}
          aria-valuenow={stepIndex + 1}
          className="mt-4 h-1 w-full max-w-xl self-center overflow-hidden rounded-full bg-(--rs-line)"
        >
          <div
            className="h-full rounded-full bg-(--rs-bronze) transition-[width] motion-reduce:transition-none"
            style={{ width: `${Math.round(exerciseProgress(stepIndex + 1, total) * 100)}%` }}
          />
        </div>
      ) : null}

      <main className="mx-auto flex w-full max-w-xl flex-1 flex-col justify-center gap-6 py-8">
        {phase.kind === 'intro' ? (
          <>
            <p className={chip}>
              <span aria-hidden className="size-1.5 rounded-full bg-(--rs-bronze)" />
              Guided exercise
            </p>
            <Heading as="h1" ref={headingRef} tabIndex={-1} className={heading}>
              {exercise.title}
            </Heading>
            {exercise.subtitle ? (
              <Text className="font-heading text-xl text-(--rs-bronze-text) italic">
                {exercise.subtitle}
              </Text>
            ) : null}
            <Text className="text-base leading-relaxed text-(--rs-ink-soft) sm:text-lg">
              {exercise.intro}
            </Text>
            {exercise.durationLabel ? (
              <p className="inline-flex items-center gap-2 text-sm text-(--rs-ink-soft)">
                <Clock aria-hidden className="size-4 text-(--rs-bronze)" />
                {exercise.durationLabel}
              </p>
            ) : null}
            <Text className="text-sm text-(--rs-ink-soft)">{EXERCISE_UI.onlyHere}</Text>
            <div>
              <button type="button" className={primaryButton} onClick={next}>
                {EXERCISE_UI.begin}
              </button>
            </div>
          </>
        ) : null}

        {phase.kind === 'step' ? (
          <StepView
            key={exercise.steps[stepIndex]!.id}
            step={exercise.steps[stepIndex]!}
            answer={answers[exercise.steps[stepIndex]!.id]}
            onAnswer={(a) => setAnswer(exercise.steps[stepIndex]!.id, a)}
            headingRef={headingRef}
            headingClass={heading}
            isLast={stepIndex + 1 === total}
            hasSummary={!!exercise.summary}
            onBack={back}
            onNext={next}
          />
        ) : null}

        {phase.kind === 'summary' && exercise.summary ? (
          <SummaryView
            exercise={exercise}
            answers={answers}
            headingRef={headingRef}
            headingClass={heading}
            onBack={back}
            onNext={next}
          />
        ) : null}

        {phase.kind === 'closing' ? (
          <div className="flex flex-col items-center gap-6 text-center">
            <p className={chip}>
              <Check aria-hidden className="size-3.5 text-(--rs-bronze)" />
              Exercise completed
            </p>
            <Heading as="h1" ref={headingRef} tabIndex={-1} className={heading}>
              {exercise.closing.heading}
            </Heading>
            <Text className="max-w-md text-base leading-relaxed text-(--rs-ink-soft) sm:text-lg">
              {exercise.closing.message}
            </Text>
            <NextLink href={PRACTICES_HREF} className={primaryButton}>
              {EXERCISE_UI.backToPractices}
            </NextLink>
          </div>
        ) : null}
      </main>
    </ResetShell>
  );
}

function StepView({
  step,
  answer,
  onAnswer,
  headingRef,
  headingClass,
  isLast,
  hasSummary,
  onBack,
  onNext,
}: {
  step: ExerciseStep;
  answer: ExerciseAnswer | undefined;
  onAnswer: (answer: ExerciseAnswer) => void;
  headingRef: React.RefObject<HTMLHeadingElement | null>;
  headingClass: string;
  isLast: boolean;
  hasSummary: boolean;
  onBack: () => void;
  onNext: () => void;
}) {
  const title = step.type === 'prompt' || step.type === 'pause' ? step.title : step.question;
  const ready = canContinue(step, answer);
  const nextLabel =
    step.type === 'pause'
      ? step.actionLabel
      : isLast
        ? hasSummary
          ? EXERCISE_UI.seeSummary
          : EXERCISE_UI.finish
        : EXERCISE_UI.next;

  return (
    <>
      {title ? (
        <Heading as="h1" ref={headingRef} tabIndex={-1} className={headingClass}>
          {title}
        </Heading>
      ) : null}
      {step.type === 'prompt' || step.type === 'pause' ? (
        <Text
          className="text-base leading-relaxed text-(--rs-ink-soft) sm:text-lg"
          {...(title ? {} : { tabIndex: -1 })}
        >
          {step.body}
        </Text>
      ) : step.help ? (
        <Text className="text-sm leading-relaxed text-(--rs-ink-soft)">{step.help}</Text>
      ) : null}

      {step.type === 'choice' ? (
        <div
          role={step.multiple ? 'group' : 'radiogroup'}
          aria-label={step.question}
          className="flex flex-col gap-3"
        >
          {step.options.map((option) => {
            const selected = answer?.kind === 'choice' && answer.optionIds.includes(option.id);
            return (
              <button
                key={option.id}
                type="button"
                {...(step.multiple
                  ? { role: 'checkbox', 'aria-checked': selected }
                  : { role: 'radio', 'aria-checked': selected })}
                className={choiceButton(selected)}
                onClick={() => onAnswer(toggleChoice(step, answer, option.id))}
              >
                <span>{option.label}</span>
                {selected ? (
                  <Check aria-hidden className="size-4 shrink-0 text-(--rs-bronze)" />
                ) : null}
              </button>
            );
          })}
        </div>
      ) : null}

      {step.type === 'scale' ? (
        <div>
          <div role="radiogroup" aria-label={step.question} className="flex gap-2">
            {Array.from({ length: step.max }, (_, i) => i + 1).map((value) => {
              const selected = answer?.kind === 'scale' && answer.value === value;
              return (
                <button
                  key={value}
                  type="button"
                  role="radio"
                  aria-checked={selected}
                  aria-label={`${value} of ${step.max}`}
                  className={cn(choiceButton(selected), 'justify-center px-0 text-lg')}
                  onClick={() => onAnswer({ kind: 'scale', value })}
                >
                  {value}
                </button>
              );
            })}
          </div>
          <div className="mt-2 flex justify-between text-sm text-(--rs-ink-soft)">
            <span>{step.lowLabel}</span>
            <span>{step.highLabel}</span>
          </div>
        </div>
      ) : null}

      {step.type === 'text' ? (
        <div>
          <label className="sr-only" htmlFor={`answer-${step.id}`}>
            {step.question}
          </label>
          <textarea
            id={`answer-${step.id}`}
            rows={4}
            maxLength={2000}
            placeholder={step.placeholder ?? ''}
            value={answer?.kind === 'text' ? answer.text : ''}
            onChange={(event) => onAnswer({ kind: 'text', text: event.target.value })}
            className="min-h-32 w-full rounded-2xl border border-(--rs-line) bg-(--rs-card) p-4 text-base text-(--rs-ink) placeholder:text-(--rs-ink-soft)/70 focus-visible:ring-2 focus-visible:ring-(--rs-bronze) focus-visible:outline-none"
          />
          <p className="mt-2 text-sm text-(--rs-ink-soft)">{EXERCISE_UI.optional}</p>
        </div>
      ) : null}

      <div className="flex flex-wrap items-center gap-3 pt-2">
        <button type="button" className={primaryButton} disabled={!ready} onClick={onNext}>
          {nextLabel}
        </button>
        <button type="button" className={quietButton} onClick={onBack}>
          {EXERCISE_UI.back}
        </button>
      </div>
    </>
  );
}

function SummaryView({
  exercise,
  answers,
  headingRef,
  headingClass,
  onBack,
  onNext,
}: {
  exercise: GuidedExercise;
  answers: ExerciseAnswers;
  headingRef: React.RefObject<HTMLHeadingElement | null>;
  headingClass: string;
  onBack: () => void;
  onNext: () => void;
}) {
  const summary = exercise.summary!;
  const { rows, comparisons } = buildSummary(exercise, answers);

  return (
    <>
      <Heading as="h1" ref={headingRef} tabIndex={-1} className={headingClass}>
        {summary.heading}
      </Heading>
      {summary.intro ? (
        <Text className="text-base leading-relaxed text-(--rs-ink-soft)">{summary.intro}</Text>
      ) : null}

      {comparisons.map((c) => (
        <div key={c.label} className="rounded-2xl border border-(--rs-line) bg-(--rs-card) p-5">
          <p className="text-xs font-medium tracking-[0.18em] text-(--rs-bronze-text) uppercase">
            {c.label}
          </p>
          <p className="font-heading mt-2 text-2xl text-(--rs-ink)">
            {EXERCISE_UI.before} {c.before} of {c.max} · {EXERCISE_UI.after} {c.after} of {c.max}
          </p>
          <p className="mt-1 text-sm text-(--rs-ink-soft)">
            {changeSentence(c.change)} Any change, or none, is useful information.
          </p>
        </div>
      ))}

      {summary.showAnswers && rows.length > 0 ? (
        <section aria-label={EXERCISE_UI.yourAnswers}>
          <p className="text-xs font-medium tracking-[0.18em] text-(--rs-bronze-text) uppercase">
            {EXERCISE_UI.yourAnswers}
          </p>
          <dl className="mt-3 flex flex-col gap-4">
            {rows.map((row) => (
              <div key={row.stepId} className="border-t border-(--rs-line) pt-3">
                <dt className="text-sm text-(--rs-ink-soft)">{row.question}</dt>
                <dd className="mt-1 text-base whitespace-pre-wrap text-(--rs-ink)">{row.value}</dd>
              </div>
            ))}
          </dl>
        </section>
      ) : null}

      <Text className="text-sm text-(--rs-ink-soft)">{EXERCISE_UI.onlyHere}</Text>
      <div className="flex flex-wrap items-center gap-3 pt-2">
        <button type="button" className={primaryButton} onClick={onNext}>
          {EXERCISE_UI.finish}
        </button>
        <button type="button" className={quietButton} onClick={onBack}>
          {EXERCISE_UI.back}
        </button>
      </div>
    </>
  );
}
