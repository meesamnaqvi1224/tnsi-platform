/**
 * "Today's recommended practice" content routing. Pure, deterministic
 * mapping from a check-in's `capacityScore` to a practice category — no
 * database, no LLM, no clinical judgment. Per the approved product decision:
 * this is mechanical content routing based on a self-reported score, not an
 * inference about the user's condition. See ARCHITECTURE.md's packages/core
 * boundary (no infrastructure access; everything else depends on this).
 */

export const CAPACITY_STATES = [
  'LOW',
  'LOW_MODERATE',
  'MODERATE',
  'MODERATE_HIGH',
  'HIGH',
] as const;

export type CapacityState = (typeof CAPACITY_STATES)[number];

export const RECOMMENDED_PRACTICE_CATEGORIES = [
  'GROUNDING',
  'REGULATION',
  'CENTERING',
  'EMBODIMENT',
  'EXPANSION',
] as const;

export type RecommendedPracticeCategory = (typeof RECOMMENDED_PRACTICE_CATEGORIES)[number];

const SCORE_TO_CAPACITY_STATE: Record<number, CapacityState> = {
  1: 'LOW',
  2: 'LOW_MODERATE',
  3: 'MODERATE',
  4: 'MODERATE_HIGH',
  5: 'HIGH',
};

/** `check_ins.capacityScore` is a DB-constrained integer 1-5 (`check_ins_capacity_score_range`); any other value is a caller bug, not a normal branch to swallow. */
export function normalizeCapacityScore(capacityScore: number): CapacityState {
  const state = SCORE_TO_CAPACITY_STATE[capacityScore];
  if (!state) {
    throw new RangeError(`capacityScore must be an integer 1-5, got ${capacityScore}`);
  }
  return state;
}

const CAPACITY_STATE_TO_CATEGORY: Record<CapacityState, RecommendedPracticeCategory> = {
  LOW: 'GROUNDING',
  LOW_MODERATE: 'REGULATION',
  MODERATE: 'CENTERING',
  MODERATE_HIGH: 'EMBODIMENT',
  HIGH: 'EXPANSION',
};

export function categoryForCapacityState(state: CapacityState): RecommendedPracticeCategory {
  return CAPACITY_STATE_TO_CATEGORY[state];
}

/** Convenience composition of the two steps above, for callers that only have the raw score. */
export function categoryForCapacityScore(capacityScore: number): RecommendedPracticeCategory {
  return categoryForCapacityState(normalizeCapacityScore(capacityScore));
}

/**
 * Deterministically picks one candidate from an already-filtered (published,
 * category-matched) list, so the same input set always yields the same
 * result across repeat calls regardless of DB scan/return order. Sorts by
 * `id` rather than relying on array order, which query engines don't
 * guarantee to be stable.
 */
export function pickDeterministicCandidate<T extends { id: string }>(
  candidates: readonly T[],
): T | null {
  return pickDeterministicCandidates(candidates, 1)[0] ?? null;
}

/**
 * The first `count` candidates in the same deterministic (id) order
 * `pickDeterministicCandidate` uses, so the primary pick is always element 0
 * and an optional alternative is element 1 - the same category, the next one
 * in the same fixed order. No new scoring rule: it only reads further down the
 * list the existing routing already produces.
 */
export function pickDeterministicCandidates<T extends { id: string }>(
  candidates: readonly T[],
  count: number,
): T[] {
  return [...candidates]
    .sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0))
    .slice(0, Math.max(0, count));
}
