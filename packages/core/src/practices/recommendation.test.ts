import { describe, expect, it } from 'vitest';
import {
  categoryForCapacityScore,
  categoryForCapacityState,
  normalizeCapacityScore,
  pickDeterministicCandidate,
  type CapacityState,
  type RecommendedPracticeCategory,
} from './recommendation';

describe('normalizeCapacityScore', () => {
  const cases: Array<[number, CapacityState]> = [
    [1, 'LOW'],
    [2, 'LOW_MODERATE'],
    [3, 'MODERATE'],
    [4, 'MODERATE_HIGH'],
    [5, 'HIGH'],
  ];

  it.each(cases)('maps capacityScore %i to %s', (score, state) => {
    expect(normalizeCapacityScore(score)).toBe(state);
  });

  it('rejects out-of-range scores', () => {
    expect(() => normalizeCapacityScore(0)).toThrow(RangeError);
    expect(() => normalizeCapacityScore(6)).toThrow(RangeError);
  });

  it('rejects non-integer scores', () => {
    expect(() => normalizeCapacityScore(2.5)).toThrow(RangeError);
  });
});

describe('categoryForCapacityState', () => {
  const cases: Array<[CapacityState, RecommendedPracticeCategory]> = [
    ['LOW', 'GROUNDING'],
    ['LOW_MODERATE', 'REGULATION'],
    ['MODERATE', 'CENTERING'],
    ['MODERATE_HIGH', 'EMBODIMENT'],
    ['HIGH', 'EXPANSION'],
  ];

  it.each(cases)('maps %s to category %s', (state, category) => {
    expect(categoryForCapacityState(state)).toBe(category);
  });
});

describe('categoryForCapacityScore', () => {
  it('composes normalization and category mapping', () => {
    expect(categoryForCapacityScore(1)).toBe('GROUNDING');
    expect(categoryForCapacityScore(5)).toBe('EXPANSION');
  });
});

describe('pickDeterministicCandidate', () => {
  it('returns null for an empty list', () => {
    expect(pickDeterministicCandidate([])).toBeNull();
  });

  it('returns the single candidate when there is exactly one', () => {
    const candidate = { id: 'a' };
    expect(pickDeterministicCandidate([candidate])).toBe(candidate);
  });

  it('picks the same candidate regardless of input order', () => {
    const a = { id: 'aaa' };
    const b = { id: 'bbb' };
    const c = { id: 'ccc' };

    expect(pickDeterministicCandidate([c, a, b])).toEqual(a);
    expect(pickDeterministicCandidate([b, c, a])).toEqual(a);
    expect(pickDeterministicCandidate([a, b, c])).toEqual(a);
  });

  it('is stable across repeat calls with the same input', () => {
    const candidates = [{ id: 'z' }, { id: 'm' }, { id: 'a' }];
    const first = pickDeterministicCandidate(candidates);
    const second = pickDeterministicCandidate(candidates);
    expect(first).toEqual(second);
    expect(first).toEqual({ id: 'a' });
  });
});
