/**
 * Guided exercises: short, interactive practices made of typed steps (a prompt, a choice, a scale,
 * a written answer, a pause) that end in a summary and a closing. One renderer per platform (the
 * website and the app) draws any exercise from this shape, so a new exercise is CMS content, not
 * code. The content lives in Sanity (`guidedExercise`); everything here is pure and shared by both
 * apps: what a valid exercise looks like, when a step may be continued, and how the answers are
 * summarised.
 *
 * Privacy: a member's answers are held in memory for the length of the session and shown back in the
 * summary. They are never sent anywhere or stored; only the completion of the practice is recorded.
 */

/** The `practices.interactive_key` prefix of an exercise, e.g. `exercise:early-warning-signs`. */
export const EXERCISE_KEY_PREFIX = 'exercise:';

const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export function isExerciseSlug(value: unknown): value is string {
  return typeof value === 'string' && value.length <= 64 && SLUG.test(value);
}

export function exerciseInteractiveKey(slug: string): string {
  return `${EXERCISE_KEY_PREFIX}${slug}`;
}

/** The exercise a practice opens, or `null` for any other practice. */
export function guidedExerciseSlug(practice: {
  contentType: string;
  interactiveKey?: string | null;
}): string | null {
  if (practice.contentType !== 'interactive') return null;
  const key = practice.interactiveKey;
  if (typeof key !== 'string' || !key.startsWith(EXERCISE_KEY_PREFIX)) return null;
  const slug = key.slice(EXERCISE_KEY_PREFIX.length);
  return isExerciseSlug(slug) ? slug : null;
}

export type ExerciseOption = { id: string; label: string };

export type ExerciseStep =
  | { id: string; type: 'prompt'; title: string | null; body: string }
  | {
      id: string;
      type: 'choice';
      question: string;
      help: string | null;
      options: ExerciseOption[];
      /** More than one option may be chosen. */
      multiple: boolean;
    }
  | {
      id: string;
      type: 'scale';
      question: string;
      help: string | null;
      /** The scale runs 1..max. */
      max: number;
      lowLabel: string;
      highLabel: string;
    }
  | {
      id: string;
      type: 'text';
      question: string;
      help: string | null;
      placeholder: string | null;
    }
  | { id: string; type: 'pause'; title: string | null; body: string; actionLabel: string };

export type ExerciseSummaryConfig = {
  heading: string;
  intro: string | null;
  /** Show the member's own answers back to them. */
  showAnswers: boolean;
  /** Pairs of scale steps (for example before and after a practice) shown side by side. */
  compare: { label: string; beforeStepId: string; afterStepId: string }[];
};

export type GuidedExercise = {
  slug: string;
  title: string;
  subtitle: string | null;
  intro: string;
  durationLabel: string | null;
  steps: ExerciseStep[];
  summary: ExerciseSummaryConfig | null;
  closing: { heading: string; message: string };
};

/* ------------------------------------------------------------------ parsing */

const asRecord = (value: unknown): Record<string, unknown> | null =>
  value !== null && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;

function text(value: unknown, max: number): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed.length > 0 && trimmed.length <= max ? trimmed : null;
}

const optionalText = (value: unknown, max: number): string | null => text(value, max);

const ID = /^[A-Za-z0-9_-]{1,64}$/;

function parseStep(raw: unknown): ExerciseStep | null {
  const s = asRecord(raw);
  if (!s) return null;
  const id = typeof s.id === 'string' && ID.test(s.id) ? s.id : null;
  if (!id) return null;

  switch (s.type) {
    case 'prompt': {
      const body = text(s.body, 1200);
      return body ? { id, type: 'prompt', title: optionalText(s.title, 120), body } : null;
    }
    case 'pause': {
      const body = text(s.body, 1200);
      if (!body) return null;
      return {
        id,
        type: 'pause',
        title: optionalText(s.title, 120),
        body,
        actionLabel: optionalText(s.actionLabel, 40) ?? 'Continue',
      };
    }
    case 'choice': {
      const question = text(s.question, 300);
      if (!question || !Array.isArray(s.options)) return null;
      const options: ExerciseOption[] = [];
      for (const rawOption of s.options) {
        const o = asRecord(rawOption);
        const optionId = o && typeof o.id === 'string' && ID.test(o.id) ? o.id : null;
        const label = o ? text(o.label, 160) : null;
        if (!optionId || !label || options.some((x) => x.id === optionId)) return null;
        options.push({ id: optionId, label });
      }
      if (options.length < 2 || options.length > 12) return null;
      return {
        id,
        type: 'choice',
        question,
        help: optionalText(s.help, 400),
        options,
        multiple: s.multiple === true,
      };
    }
    case 'scale': {
      const question = text(s.question, 300);
      const lowLabel = text(s.lowLabel, 60);
      const highLabel = text(s.highLabel, 60);
      const max = typeof s.max === 'number' && Number.isInteger(s.max) ? s.max : 5;
      if (!question || !lowLabel || !highLabel || max < 3 || max > 7) return null;
      return {
        id,
        type: 'scale',
        question,
        help: optionalText(s.help, 400),
        max,
        lowLabel,
        highLabel,
      };
    }
    case 'text': {
      const question = text(s.question, 300);
      return question
        ? {
            id,
            type: 'text',
            question,
            help: optionalText(s.help, 400),
            placeholder: optionalText(s.placeholder, 120),
          }
        : null;
    }
    default:
      return null;
  }
}

/**
 * Turns whatever the CMS returned into a valid exercise, or `null` when anything essential is
 * missing or malformed. Content is never trusted: a half-edited document must not crash a screen,
 * so the apps show "not available" instead of a broken exercise.
 */
export function parseGuidedExercise(raw: unknown): GuidedExercise | null {
  const e = asRecord(raw);
  if (!e) return null;

  const slug = isExerciseSlug(e.slug) ? e.slug : null;
  const title = text(e.title, 120);
  const intro = text(e.intro, 1200);
  const closing = asRecord(e.closing);
  const closingHeading = closing ? text(closing.heading, 160) : null;
  const closingMessage = closing ? text(closing.message, 1200) : null;
  if (!slug || !title || !intro || !closingHeading || !closingMessage) return null;
  if (!Array.isArray(e.steps) || e.steps.length === 0 || e.steps.length > 40) return null;

  const steps: ExerciseStep[] = [];
  for (const rawStep of e.steps) {
    const step = parseStep(rawStep);
    if (!step || steps.some((x) => x.id === step.id)) return null;
    steps.push(step);
  }

  let summary: ExerciseSummaryConfig | null = null;
  const rawSummary = asRecord(e.summary);
  if (rawSummary) {
    const heading = text(rawSummary.heading, 160);
    if (!heading) return null;
    const compare: ExerciseSummaryConfig['compare'] = [];
    for (const rawPair of Array.isArray(rawSummary.compare) ? rawSummary.compare : []) {
      const pair = asRecord(rawPair);
      const label = pair ? text(pair.label, 120) : null;
      const before = steps.find((x) => x.id === pair?.beforeStepId);
      const after = steps.find((x) => x.id === pair?.afterStepId);
      // A comparison only makes sense between two scales of the same length.
      if (
        !pair ||
        !label ||
        before?.type !== 'scale' ||
        after?.type !== 'scale' ||
        before.max !== after.max
      ) {
        return null;
      }
      compare.push({ label, beforeStepId: before.id, afterStepId: after.id });
    }
    summary = {
      heading,
      intro: optionalText(rawSummary.intro, 600),
      showAnswers: rawSummary.showAnswers !== false,
      compare,
    };
  }

  return {
    slug,
    title,
    subtitle: optionalText(e.subtitle, 160),
    intro,
    durationLabel: optionalText(e.durationLabel, 40),
    steps,
    summary,
    closing: { heading: closingHeading, message: closingMessage },
  };
}

/* ------------------------------------------------------------------- answers */

export type ExerciseAnswer =
  | { kind: 'choice'; optionIds: string[] }
  | { kind: 'scale'; value: number }
  | { kind: 'text'; text: string };

export type ExerciseAnswers = Record<string, ExerciseAnswer>;

/**
 * Whether the member may move on from a step. A choice needs at least one option and a scale needs a
 * value, so a summary is never built from blanks. A written answer is always optional: nobody is
 * required to put something sensitive into words to finish.
 */
export function canContinue(step: ExerciseStep, answer: ExerciseAnswer | undefined): boolean {
  switch (step.type) {
    case 'choice':
      return (
        answer?.kind === 'choice' &&
        answer.optionIds.length > 0 &&
        answer.optionIds.every((id) => step.options.some((o) => o.id === id))
      );
    case 'scale':
      return (
        answer?.kind === 'scale' &&
        Number.isInteger(answer.value) &&
        answer.value >= 1 &&
        answer.value <= step.max
      );
    default:
      return true;
  }
}

/** Chooses an option, replacing the previous choice unless the step allows several. */
export function toggleChoice(
  step: Extract<ExerciseStep, { type: 'choice' }>,
  current: ExerciseAnswer | undefined,
  optionId: string,
): ExerciseAnswer {
  const chosen = current?.kind === 'choice' ? current.optionIds : [];
  if (!step.multiple) return { kind: 'choice', optionIds: [optionId] };
  return {
    kind: 'choice',
    optionIds: chosen.includes(optionId)
      ? chosen.filter((id) => id !== optionId)
      : [...chosen, optionId],
  };
}

/** The answer in words, or `null` when there is nothing to show (an unanswered or empty step). */
export function answerLabel(step: ExerciseStep, answer: ExerciseAnswer | undefined): string | null {
  if (!answer) return null;
  if (step.type === 'choice' && answer.kind === 'choice') {
    const labels = answer.optionIds
      .map((id) => step.options.find((o) => o.id === id)?.label)
      .filter((label): label is string => !!label);
    return labels.length > 0 ? labels.join(', ') : null;
  }
  if (step.type === 'scale' && answer.kind === 'scale') {
    return `${answer.value} of ${step.max}`;
  }
  if (step.type === 'text' && answer.kind === 'text') {
    const value = answer.text.trim();
    return value.length > 0 ? value : null;
  }
  return null;
}

export type SummaryRow = { stepId: string; question: string; value: string };
export type SummaryComparison = {
  label: string;
  before: number;
  after: number;
  max: number;
  /** Neutral wording: a change in either direction, or none, is simply information. */
  change: 'higher' | 'lower' | 'the same';
};

/** What the summary screen shows: the member's own answers and any before/after comparisons. */
export function buildSummary(
  exercise: GuidedExercise,
  answers: ExerciseAnswers,
): { rows: SummaryRow[]; comparisons: SummaryComparison[] } {
  const rows: SummaryRow[] = [];
  for (const step of exercise.steps) {
    if (step.type === 'prompt' || step.type === 'pause') continue;
    const value = answerLabel(step, answers[step.id]);
    if (value) rows.push({ stepId: step.id, question: step.question, value });
  }

  const comparisons: SummaryComparison[] = [];
  for (const pair of exercise.summary?.compare ?? []) {
    const before = answers[pair.beforeStepId];
    const after = answers[pair.afterStepId];
    const step = exercise.steps.find((s) => s.id === pair.beforeStepId);
    if (before?.kind !== 'scale' || after?.kind !== 'scale' || step?.type !== 'scale') continue;
    comparisons.push({
      label: pair.label,
      before: before.value,
      after: after.value,
      max: step.max,
      change:
        after.value > before.value ? 'higher' : after.value < before.value ? 'lower' : 'the same',
    });
  }
  return { rows, comparisons };
}

/** The change between two scale answers as a plain sentence, with no judgement either way. */
export function changeSentence(change: SummaryComparison['change']): string {
  return change === 'the same'
    ? 'Your number is the same as before.'
    : `Your number is ${change} than before.`;
}

/** How far through the exercise the member is, 0..1, for a quiet progress indicator. */
export function exerciseProgress(index: number, total: number): number {
  if (total <= 0) return 0;
  return Math.min(1, Math.max(0, index / total));
}
