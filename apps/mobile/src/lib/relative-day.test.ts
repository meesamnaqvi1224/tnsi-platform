import { describe, expect, it } from 'vitest';
import { relativeDay } from './relative-day';

describe('relativeDay', () => {
  const now = new Date(2026, 10, 10, 15, 0);
  it('names today and yesterday and dates anything older', () => {
    expect(relativeDay(new Date(2026, 10, 10, 8, 0).toISOString(), now)).toBe('Today');
    expect(relativeDay(new Date(2026, 10, 9, 23, 0).toISOString(), now)).toBe('Yesterday');
    expect(relativeDay(new Date(2026, 10, 2, 12, 0).toISOString(), now)).toBe('2 November');
  });
});
