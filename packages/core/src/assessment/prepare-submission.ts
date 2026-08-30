import {
  scoreAssessment,
  type AssessmentAnswers,
  type AssessmentScoringRules,
  type AssessmentScoringResult,
} from './scoring';

/**
 * One submitted answer that doesn't correspond to real content: either the
 * question key itself is unrecognised, or the question exists but the
 * chosen choice key isn't one of its options.
 */
export interface UnknownAnswerKeyError {
  type: 'unknown-question' | 'unknown-choice';
  questionKey: string;
  choiceKey?: string;
}

export type PrepareAssessmentSubmissionResult =
  | { valid: true; result: AssessmentScoringResult }
  | { valid: false; errors: UnknownAnswerKeyError[] };

/**
 * Validates a submitted answer set against `rules` before scoring it.
 *
 * This is deliberately stricter than `scoreAssessment` itself:
 * `scoreAssessment` treats an unrecognised question/choice key as a safe
 * zero-value contribution (it has to — it's also used defensively wherever
 * scoring runs), but at the point a submission first arrives, an answer
 * that names a question or choice the assessment doesn't have is a sign of
 * a malformed or tampered request, not a partial one. Callers (e.g. a
 * submission API route) should reject it rather than silently score it.
 *
 * Pure and side-effect free — no DB, Sanity, HTTP, or auth access, per
 * packages/core's boundary. Collects every error rather than stopping at
 * the first, so a caller can report all of them at once.
 */
export function prepareAssessmentSubmission(
  answers: AssessmentAnswers,
  rules: AssessmentScoringRules,
): PrepareAssessmentSubmissionResult {
  const questionsByKey = new Map(rules.questions.map((question) => [question.key, question]));
  const errors: UnknownAnswerKeyError[] = [];

  for (const [questionKey, choiceKey] of Object.entries(answers)) {
    const question = questionsByKey.get(questionKey);
    if (!question) {
      errors.push({ type: 'unknown-question', questionKey });
      continue;
    }
    if (!question.choices.some((choice) => choice.key === choiceKey)) {
      errors.push({ type: 'unknown-choice', questionKey, choiceKey });
    }
  }

  if (errors.length > 0) {
    return { valid: false, errors };
  }

  return { valid: true, result: scoreAssessment(answers, rules) };
}
