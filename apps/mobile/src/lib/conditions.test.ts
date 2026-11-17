import { describe, expect, it } from 'vitest';
import {
  conditionsOf,
  parseCondition,
  practicesForCondition,
  primaryCondition,
} from './conditions';

describe('conditionsOf', () => {
  it('finds condition tags regardless of case and spacing, without repeats, in tag order', () => {
    expect(conditionsOf(['calm', ' capacity ', 'SAFETY', 'Capacity'])).toEqual([
      'Capacity',
      'Safety',
    ]);
  });
  it('returns none when no tag is a condition', () => {
    expect(conditionsOf(['breath', 'morning'])).toEqual([]);
    expect(primaryCondition([])).toBeNull();
  });
  it('takes the first condition as primary', () => {
    expect(primaryCondition(['x', 'Expansion', 'Safety'])).toBe('Expansion');
  });
});

describe('parseCondition', () => {
  it('accepts exactly the five names', () => {
    expect(parseCondition('Participation')).toBe('Participation');
    expect(parseCondition('participation')).toBeNull();
    expect(parseCondition(undefined)).toBeNull();
  });
});

describe('practicesForCondition', () => {
  const list = [
    { id: 1, tags: ['Safety'] },
    { id: 2, tags: ['Safety', 'Capacity'] },
    { id: 3, tags: [] },
  ];
  it('keeps every practice tagged with the condition, including multi-condition ones', () => {
    expect(practicesForCondition(list, 'Safety').map((p) => p.id)).toEqual([1, 2]);
    expect(practicesForCondition(list, 'Capacity').map((p) => p.id)).toEqual([2]);
    expect(practicesForCondition(list, 'Expansion')).toEqual([]);
  });
});
