import { describe, expect, it } from 'vitest';
import { scoreAssessment, type AssessmentScoringRules } from './scoring';

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

describe('scoreAssessment', () => {
  it('scores a single answered question', () => {
    const result = scoreAssessment(
      { q1: 'b' },
      rules({
        questions: [
          {
            key: 'q1',
            choices: [
              { key: 'a', value: 0 },
              { key: 'b', value: 5 },
            ],
          },
        ],
      }),
    );
    expect(result.score).toBe(5);
    expect(result.unansweredQuestionKeys).toEqual([]);
  });

  it('sums values across multiple answered questions', () => {
    const result = scoreAssessment({ q1: 'b', q2: 'b' }, rules());
    expect(result.score).toBe(10);
    expect(result.unansweredQuestionKeys).toEqual([]);
  });

  it('selects the result tier whose range contains the score, boundaries inclusive', () => {
    expect(scoreAssessment({ q1: 'a', q2: 'a' }, rules()).resultTier).toBe('low'); // score 0
    expect(scoreAssessment({ q1: 'b', q2: 'a' }, rules()).resultTier).toBe('high'); // score 5, exact lower edge of "high"
    expect(scoreAssessment({ q1: 'a', q2: 'a' }, rules()).score).toBe(0);
  });

  it('selects a tier when the score lands exactly on its inclusive upper bound', () => {
    const result = scoreAssessment(
      { q1: 'x' },
      rules({
        questions: [{ key: 'q1', choices: [{ key: 'x', value: 4 }] }],
        resultTiers: [
          { key: 'low', minScore: 0, maxScore: 4 },
          { key: 'high', minScore: 5, maxScore: 10 },
        ],
      }),
    );
    expect(result.score).toBe(4);
    expect(result.resultTier).toBe('low');
  });

  it('selects the highest tier when the score lands exactly on its inclusive upper bound', () => {
    const result = scoreAssessment(
      { q1: 'y' },
      rules({
        questions: [{ key: 'q1', choices: [{ key: 'y', value: 10 }] }],
        resultTiers: [
          { key: 'low', minScore: 0, maxScore: 4 },
          { key: 'high', minScore: 5, maxScore: 10 },
        ],
      }),
    );
    expect(result.score).toBe(10);
    expect(result.resultTier).toBe('high');
  });

  it('returns a null resultTier when the score falls outside every tier range', () => {
    const result = scoreAssessment(
      { q1: 'b' },
      rules({ questions: [{ key: 'q1', choices: [{ key: 'b', value: 100 }] }] }),
    );
    expect(result.resultTier).toBeNull();
  });

  it('treats a missing answer as a zero contribution, not an error', () => {
    const result = scoreAssessment({ q1: 'b' }, rules()); // q2 left unanswered
    expect(result.score).toBe(5);
    expect(result.unansweredQuestionKeys).toEqual(['q2']);
  });

  it('treats an answer that matches no known choice as a zero contribution', () => {
    const result = scoreAssessment({ q1: 'not-a-real-choice-key', q2: 'b' }, rules());
    expect(result.score).toBe(5);
    expect(result.unansweredQuestionKeys).toEqual(['q1']);
  });

  it('is deterministic — identical input always produces identical output', () => {
    const answers = { q1: 'b', q2: 'a' };
    const r = rules();
    expect(scoreAssessment(answers, r)).toEqual(scoreAssessment(answers, r));
  });

  it('fails safe on an unrecognized scoring method rather than guessing a formula', () => {
    const result = scoreAssessment(
      { q1: 'b', q2: 'b' },
      rules({ method: 'weighted-average' as AssessmentScoringRules['method'] }),
    );
    expect(result.score).toBe(0);
    expect(result.unansweredQuestionKeys).toEqual(['q1', 'q2']);
  });

  it('handles an assessment with no questions without error', () => {
    const result = scoreAssessment({}, rules({ questions: [] }));
    expect(result.score).toBe(0);
    expect(result.unansweredQuestionKeys).toEqual([]);
  });
});
