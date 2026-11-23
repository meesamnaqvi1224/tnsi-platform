import { describe, expect, it } from 'vitest';
import { withCheckInApplied } from './today-after-check-in';
import { suggestionsViewForToday } from './home-suggestions';
import type { CheckIn, Practice, TodayResponse } from '@/api/types';

const checkIn = { id: 'today' } as unknown as CheckIn;
const practice = { id: 'old-practice' } as unknown as Practice;

// What Home holds just before the member checks in: the recommendation left over from an earlier check-in.
const before = {
  date: '2026-11-23',
  checkIn: null,
  practices: [],
  todayPractice: practice,
  alternativePractice: practice,
  suggestions: {
    condition: 'Safety',
    items: [
      { kind: 'powerDrop', id: 'exhale', slug: 'exhale', title: 'Exhale', description: null },
    ],
  },
} as unknown as TodayResponse;

describe('withCheckInApplied', () => {
  it('applies today’s check-in', () => {
    expect(withCheckInApplied(before, checkIn).checkIn).toBe(checkIn);
  });

  it('drops the recommendation made from the previous check-in', () => {
    const after = withCheckInApplied(before, checkIn);
    expect(after.todayPractice).toBeNull();
    expect(after.alternativePractice).toBeNull();
    expect(after.suggestions?.items).toEqual([]);
  });

  it('leaves Home with no suggestions to show, so no stale card appears before the refetch', () => {
    const after = withCheckInApplied(before, checkIn);
    expect(suggestionsViewForToday(after.checkIn, after.suggestions)).toBeNull();
  });

  it('keeps everything else, and does not change the input', () => {
    const after = withCheckInApplied(before, checkIn);
    expect(after.date).toBe(before.date);
    expect(after.practices).toBe(before.practices);
    expect(before.checkIn).toBeNull();
    expect(before.suggestions?.items).toHaveLength(1);
  });
});
