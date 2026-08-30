/**
 * Pure assessment-scoring engine. No database, Sanity, HTTP, auth, or env
 * access — a deterministic function of plain data in, plain data out, per
 * ARCHITECTURE.md's packages/core boundary ("depends on nothing
 * infrastructure-specific; everything else depends on it, not the
 * reverse"). Scoring rules (questions, choice weights, result-tier
 * thresholds) are supplied by the caller as data — normally sourced from a
 * Sanity `assessment` document (packages/cms) — never hardcoded here. This
 * module doesn't know or care which real assessment it's scoring.
 *
 * The types below mirror the shape this module needs rather than importing
 * from `@tnsi/cms`, the same "structural interface, not a cross-package
 * import" pattern already used by
 * packages/auth/src/authorize/entitlements.ts's `EntitlementRecord`.
 */

export interface AssessmentChoice {
  key: string;
  value: number;
}

export interface AssessmentQuestion {
  key: string;
  choices: AssessmentChoice[];
}

export interface AssessmentResultTier {
  key: string;
  /** Inclusive lower bound. */
  minScore: number;
  /** Inclusive upper bound. */
  maxScore: number;
}

/**
 * Only "sum" is implemented today. The union leaves room to add a method
 * later without changing the surrounding shape — do not add a second
 * method speculatively.
 */
export type AssessmentScoringMethod = 'sum';

export interface AssessmentScoringRules {
  method: AssessmentScoringMethod;
  questions: AssessmentQuestion[];
  resultTiers: AssessmentResultTier[];
}

/** Submitted answers, keyed by question `key`, valued by the chosen choice's `key`. */
export type AssessmentAnswers = Record<string, string>;

export interface AssessmentScoringResult {
  score: number;
  /** The matching tier's `key`, or null if no tier's range contains `score`. */
  resultTier: string | null;
  /**
   * Questions with no answer, or an answer that didn't match any of that
   * question's choices — both are treated as a safe zero contribution to
   * the score, never an error.
   */
  unansweredQuestionKeys: string[];
}

/**
 * Scores a set of answers against a set of rules. Deterministic: identical
 * inputs always produce identical output, with no reliance on ordering,
 * time, or external state. Never throws — a missing answer, an answer that
 * names an unknown choice, or an unrecognized `method` all fail safe to a
 * zero contribution rather than rejecting the submission, since a
 * partial/malformed answer set from a client is an expected condition to
 * handle gracefully, not an exceptional one.
 */
export function scoreAssessment(
  answers: AssessmentAnswers,
  rules: AssessmentScoringRules,
): AssessmentScoringResult {
  const unansweredQuestionKeys: string[] = [];
  const canScore = rules.method === 'sum';

  let score = 0;
  for (const question of rules.questions) {
    const chosenKey = canScore ? answers[question.key] : undefined;
    const choice = chosenKey ? question.choices.find((c) => c.key === chosenKey) : undefined;

    if (choice) {
      score += choice.value;
    } else {
      unansweredQuestionKeys.push(question.key);
    }
  }

  const resultTier =
    rules.resultTiers.find((tier) => score >= tier.minScore && score <= tier.maxScore)?.key ?? null;

  return { score, resultTier, unansweredQuestionKeys };
}
