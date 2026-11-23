import { describe, expect, it } from 'vitest';
import {
  answerLabel,
  buildSummary,
  changeSentence,
  canContinue,
  exerciseInteractiveKey,
  exerciseProgress,
  guidedExerciseSlug,
  isExerciseSlug,
  parseGuidedExercise,
  toggleChoice,
  type ExerciseAnswers,
} from './exercise';

const base = {
  slug: 'state-before-after',
  title: 'State Before / State After',
  intro: 'A short check-in either side of a practice.',
  steps: [
    {
      id: 'before',
      type: 'scale',
      question: 'How settled?',
      lowLabel: 'Not at all',
      highLabel: 'Very',
    },
    { id: 'do', type: 'pause', body: 'Do your practice now.', actionLabel: 'I have finished' },
    {
      id: 'after',
      type: 'scale',
      question: 'How settled now?',
      lowLabel: 'Not at all',
      highLabel: 'Very',
    },
    {
      id: 'words',
      type: 'choice',
      question: 'Closest words',
      multiple: true,
      options: [
        { id: 'calm', label: 'Calmer' },
        { id: 'same', label: 'About the same' },
      ],
    },
    { id: 'note', type: 'text', question: 'Anything you noticed?' },
  ],
  summary: {
    heading: 'What you noticed',
    compare: [{ label: 'How settled', beforeStepId: 'before', afterStepId: 'after' }],
  },
  closing: { heading: 'Well done', message: 'Any change, or none, is useful.' },
};

describe('slug and key helpers', () => {
  it('accepts lowercase kebab-case slugs only', () => {
    expect(isExerciseSlug('early-warning-signs')).toBe(true);
    expect(isExerciseSlug('Early Warning')).toBe(false);
    expect(isExerciseSlug('../x')).toBe(false);
    expect(isExerciseSlug('')).toBe(false);
    expect(isExerciseSlug(42)).toBe(false);
  });

  it('builds and reads the interactive key', () => {
    expect(exerciseInteractiveKey('early-warning-signs')).toBe('exercise:early-warning-signs');
    expect(
      guidedExerciseSlug({
        contentType: 'interactive',
        interactiveKey: 'exercise:early-warning-signs',
      }),
    ).toBe('early-warning-signs');
  });

  it('returns null for anything that is not an exercise', () => {
    expect(
      guidedExerciseSlug({ contentType: 'meditation', interactiveKey: 'exercise:a-b' }),
    ).toBeNull();
    expect(
      guidedExerciseSlug({ contentType: 'interactive', interactiveKey: 'the-empty-chair' }),
    ).toBeNull();
    expect(
      guidedExerciseSlug({ contentType: 'interactive', interactiveKey: 'exercise:Bad Slug' }),
    ).toBeNull();
    expect(guidedExerciseSlug({ contentType: 'interactive', interactiveKey: null })).toBeNull();
  });
});

describe('parseGuidedExercise', () => {
  it('parses a valid exercise and fills the defaults', () => {
    const e = parseGuidedExercise(base);
    expect(e?.slug).toBe('state-before-after');
    expect(e?.steps).toHaveLength(5);
    const scale = e?.steps[0];
    expect(scale?.type === 'scale' && scale.max).toBe(5);
    expect(e?.summary?.showAnswers).toBe(true);
    expect(e?.summary?.compare).toHaveLength(1);
  });

  it('rejects content that is missing something essential', () => {
    expect(parseGuidedExercise(null)).toBeNull();
    expect(parseGuidedExercise({ ...base, title: '' })).toBeNull();
    expect(parseGuidedExercise({ ...base, intro: undefined })).toBeNull();
    expect(parseGuidedExercise({ ...base, closing: { heading: 'x' } })).toBeNull();
    expect(parseGuidedExercise({ ...base, steps: [] })).toBeNull();
    expect(parseGuidedExercise({ ...base, slug: 'Not A Slug' })).toBeNull();
  });

  it('rejects an unknown step type, a repeated id, or a choice with fewer than two options', () => {
    expect(
      parseGuidedExercise({ ...base, steps: [{ id: 'a', type: 'video', body: 'x' }] }),
    ).toBeNull();
    expect(
      parseGuidedExercise({
        ...base,
        steps: [
          { id: 'a', type: 'prompt', body: 'x' },
          { id: 'a', type: 'prompt', body: 'y' },
        ],
        summary: undefined,
      }),
    ).toBeNull();
    expect(
      parseGuidedExercise({
        ...base,
        steps: [{ id: 'c', type: 'choice', question: 'q', options: [{ id: 'one', label: 'One' }] }],
        summary: undefined,
      }),
    ).toBeNull();
  });

  it('rejects a comparison that does not point at two scales of the same length', () => {
    expect(
      parseGuidedExercise({
        ...base,
        summary: {
          heading: 'x',
          compare: [{ label: 'l', beforeStepId: 'before', afterStepId: 'words' }],
        },
      }),
    ).toBeNull();
    const longScale = {
      id: 'after',
      type: 'scale',
      max: 7,
      question: 'q',
      lowLabel: 'a',
      highLabel: 'b',
    };
    expect(
      parseGuidedExercise({
        ...base,
        steps: [base.steps[0], longScale],
      }),
    ).toBeNull();
  });

  it('allows an exercise with no summary', () => {
    expect(parseGuidedExercise({ ...base, summary: undefined })?.summary).toBeNull();
  });
});

describe('answering', () => {
  const exercise = parseGuidedExercise(base)!;
  const [before, , , words, note] = exercise.steps;

  it('needs a scale value in range and a choice from the options', () => {
    expect(canContinue(before!, undefined)).toBe(false);
    expect(canContinue(before!, { kind: 'scale', value: 3 })).toBe(true);
    expect(canContinue(before!, { kind: 'scale', value: 6 })).toBe(false);
    expect(canContinue(words!, { kind: 'choice', optionIds: [] })).toBe(false);
    expect(canContinue(words!, { kind: 'choice', optionIds: ['nope'] })).toBe(false);
    expect(canContinue(words!, { kind: 'choice', optionIds: ['calm'] })).toBe(true);
  });

  it('never requires a written answer', () => {
    expect(canContinue(note!, undefined)).toBe(true);
  });

  it('toggles several options, or replaces a single choice', () => {
    if (words?.type !== 'choice') throw new Error('expected a choice step');
    const one = toggleChoice(words, undefined, 'calm');
    const two = toggleChoice(words, one, 'same');
    expect(two).toEqual({ kind: 'choice', optionIds: ['calm', 'same'] });
    expect(toggleChoice(words, two, 'calm')).toEqual({ kind: 'choice', optionIds: ['same'] });
    expect(toggleChoice({ ...words, multiple: false }, two, 'calm')).toEqual({
      kind: 'choice',
      optionIds: ['calm'],
    });
  });

  it('describes each answer in words', () => {
    expect(answerLabel(before!, { kind: 'scale', value: 2 })).toBe('2 of 5');
    expect(answerLabel(words!, { kind: 'choice', optionIds: ['calm', 'same'] })).toBe(
      'Calmer, About the same',
    );
    expect(answerLabel(note!, { kind: 'text', text: '  slower breathing  ' })).toBe(
      'slower breathing',
    );
    expect(answerLabel(note!, { kind: 'text', text: '   ' })).toBeNull();
    expect(answerLabel(before!, undefined)).toBeNull();
  });
});

describe('buildSummary', () => {
  const exercise = parseGuidedExercise(base)!;

  it('lists the answers and compares the before and after scales neutrally', () => {
    const answers: ExerciseAnswers = {
      before: { kind: 'scale', value: 2 },
      after: { kind: 'scale', value: 4 },
      words: { kind: 'choice', optionIds: ['calm'] },
      note: { kind: 'text', text: '' },
    };
    const { rows, comparisons } = buildSummary(exercise, answers);
    expect(rows.map((r) => r.stepId)).toEqual(['before', 'after', 'words']);
    expect(comparisons).toEqual([
      { label: 'How settled', before: 2, after: 4, max: 5, change: 'higher' },
    ]);
  });

  it('reports a lower or unchanged result without judgement', () => {
    const lower = buildSummary(exercise, {
      before: { kind: 'scale', value: 4 },
      after: { kind: 'scale', value: 3 },
    });
    expect(lower.comparisons[0]?.change).toBe('lower');
    const same = buildSummary(exercise, {
      before: { kind: 'scale', value: 3 },
      after: { kind: 'scale', value: 3 },
    });
    expect(same.comparisons[0]?.change).toBe('the same');
  });

  it('skips a comparison when one side was not answered', () => {
    expect(buildSummary(exercise, { before: { kind: 'scale', value: 3 } }).comparisons).toEqual([]);
  });
});

describe('changeSentence', () => {
  it('describes a change in either direction, or none, without judgement', () => {
    expect(changeSentence('higher')).toBe('Your number is higher than before.');
    expect(changeSentence('lower')).toBe('Your number is lower than before.');
    expect(changeSentence('the same')).toBe('Your number is the same as before.');
  });
});

describe('exerciseProgress', () => {
  it('stays between 0 and 1', () => {
    expect(exerciseProgress(0, 5)).toBe(0);
    expect(exerciseProgress(5, 5)).toBe(1);
    expect(exerciseProgress(9, 5)).toBe(1);
    expect(exerciseProgress(-1, 5)).toBe(0);
    expect(exerciseProgress(1, 0)).toBe(0);
  });
});
