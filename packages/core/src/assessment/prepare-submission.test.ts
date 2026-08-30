import { describe, expect, it } from 'vitest';
import { prepareAssessmentSubmission } from './prepare-submission';
import type { AssessmentScoringRules } from './scoring';

function rules(overrides: Partial<AssessmentScoringRules> = {}): AssessmentScoringRules {
  return {
    method: 'sum',
    questions: [
      {
        key: 'q1',
        choices: [
          { key: 'a', value: 0 },
          { key: 'b', value: 5 },
        ],
      },
      {
        key: 'q2',
        choices: [
          { key: 'a', value: 0 },
          { key: 'b', value: 5 },
        ],
      },
    ],
    resultTiers: [
      { key: 'low', minScore: 0, maxScore: 4 },
      { key: 'high', minScore: 5, maxScore: 10 },
    ],
    ...overrides,
  };
}

describe('prepareAssessmentSubmission', () => {
  it('scores a valid submission whose keys all match real questions/choices', () => {
    const result = prepareAssessmentSubmission({ q1: 'b', q2: 'a' }, rules());
    expect(result.valid).toBe(true);
    if (result.valid) {
      expect(result.result.score).toBe(5);
      expect(result.result.resultTier).toBe('high');
    }
  });

  it('rejects a submission naming a question key the assessment does not have', () => {
    const result = prepareAssessmentSubmission({ q1: 'b', bogus: 'a' }, rules());
    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.errors).toEqual([{ type: 'unknown-question', questionKey: 'bogus' }]);
    }
  });

  it('rejects a submission naming a choice key that is not one of the question’s options', () => {
    const result = prepareAssessmentSubmission({ q1: 'not-a-real-choice' }, rules());
    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.errors).toEqual([
        { type: 'unknown-choice', questionKey: 'q1', choiceKey: 'not-a-real-choice' },
      ]);
    }
  });

  it('collects every invalid key rather than stopping at the first', () => {
    const result = prepareAssessmentSubmission(
      { q1: 'nope', bogus: 'a', q2: 'also-nope' },
      rules(),
    );
    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.errors).toHaveLength(3);
      expect(result.errors).toEqual(
        expect.arrayContaining([
          { type: 'unknown-choice', questionKey: 'q1', choiceKey: 'nope' },
          { type: 'unknown-question', questionKey: 'bogus' },
          { type: 'unknown-choice', questionKey: 'q2', choiceKey: 'also-nope' },
        ]),
      );
    }
  });

  it('treats an empty answer set as valid — a partial submission is not a malformed one', () => {
    const result = prepareAssessmentSubmission({}, rules());
    expect(result.valid).toBe(true);
    if (result.valid) {
      expect(result.result.score).toBe(0);
      expect(result.result.unansweredQuestionKeys).toEqual(['q1', 'q2']);
    }
  });

  it('is deterministic for the same valid input', () => {
    const answers = { q1: 'b', q2: 'a' };
    const r = rules();
    expect(prepareAssessmentSubmission(answers, r)).toEqual(
      prepareAssessmentSubmission(answers, r),
    );
  });
});
