import { describe, expect, it } from 'vitest';
import type { CheckIn, Practice } from '@/api/types';
import { practiceForToday } from './check-in-day';

const checkIn = { id: 'c1' } as CheckIn;
const practice = { id: 'p1', title: 'Slow exhale' } as Practice;

describe('practiceForToday', () => {
  it('shows the recommendation once the member has checked in today', () => {
    expect(practiceForToday(checkIn, practice)).toBe(practice);
  });

  it('shows nothing on a new day until they check in, even if the server still has a pick', () => {
    expect(practiceForToday(null, practice)).toBeNull();
    expect(practiceForToday(undefined, practice)).toBeNull();
  });

  it('shows nothing when there is no recommendation', () => {
    expect(practiceForToday(checkIn, null)).toBeNull();
    expect(practiceForToday(checkIn, undefined)).toBeNull();
  });
});
