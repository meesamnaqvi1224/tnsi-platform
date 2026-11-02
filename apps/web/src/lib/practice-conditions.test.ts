import { describe, expect, it } from 'vitest';
import {
  conditionsOf,
  displayableThumbnail,
  parseCondition,
  primaryCondition,
} from './practice-conditions';

describe('conditionsOf', () => {
  it('finds the condition tags in tag order, ignoring case, and skips everything else', () => {
    expect(conditionsOf(['Expansion', 'grounding', 'capacity'])).toEqual(['Expansion', 'Capacity']);
  });

  it('never repeats a condition and returns nothing when there are none', () => {
    expect(conditionsOf(['Safety', 'safety', ' SAFETY '])).toEqual(['Safety']);
    expect(conditionsOf([])).toEqual([]);
    expect(conditionsOf(['sleep'])).toEqual([]);
  });
});

describe('primaryCondition', () => {
  it('is the first condition tag, not the first tag', () => {
    expect(primaryCondition(['calm', 'Safety', 'Expansion'])).toBe('Safety');
  });

  it('is null for a practice with no condition', () => {
    expect(primaryCondition(['calm'])).toBeNull();
  });
});

describe('parseCondition', () => {
  it('accepts exactly the five names and treats anything else as no filter', () => {
    expect(parseCondition('Participation')).toBe('Participation');
    expect(parseCondition('safety')).toBeUndefined();
    expect(parseCondition(undefined)).toBeUndefined();
  });
});

describe('displayableThumbnail', () => {
  it('serves only Sanity image URLs', () => {
    expect(
      displayableThumbnail('https://cdn.sanity.io/images/abc/production/x.png'),
    ).not.toBeNull();
    expect(displayableThumbnail('https://cdn.sanity.io/files/abc/x.mp4')).toBeNull();
    expect(displayableThumbnail('https://example.com/x.png')).toBeNull();
    expect(displayableThumbnail(null)).toBeNull();
  });
});
