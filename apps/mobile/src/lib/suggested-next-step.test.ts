import { describe, expect, it } from 'vitest';
import type { Practice } from '@/api/types';
import { suggestedNextStep } from './suggested-next-step';

const NOW = new Date('2026-11-10T15:00:00');
const TODAY = '2026-11-10T09:30:00';
const YESTERDAY = '2026-11-09T09:30:00';

function practice(id: string, completedAt: string | null = null): Practice {
  return {
    id,
    title: `Practice ${id}`,
    progress: completedAt
      ? {
          id: `s-${id}`,
          progressPct: 100,
          positionSeconds: null,
          completed: true,
          completedAt,
          playCount: 1,
          lastPlayedAt: completedAt,
        }
      : null,
  } as Practice;
}

const last = (practiceId: string, completedAt: string) => ({
  practiceId,
  title: `Practice ${practiceId}`,
  completedAt,
});

describe('suggestedNextStep', () => {
  it('suggests today’s recommended practice until it has been completed today', () => {
    expect(
      suggestedNextStep({
        recommended: practice('a'),
        alternative: practice('b'),
        lastCompleted: null,
        now: NOW,
      })?.id,
    ).toBe('a');
  });

  it('still suggests it when it was last completed on an earlier day', () => {
    expect(
      suggestedNextStep({
        recommended: practice('a', YESTERDAY),
        alternative: practice('b'),
        lastCompleted: last('a', YESTERDAY),
        now: NOW,
      })?.id,
    ).toBe('a');
  });

  it('moves on to the alternative once the recommendation is completed today', () => {
    expect(
      suggestedNextStep({
        recommended: practice('a', TODAY),
        alternative: practice('b'),
        lastCompleted: last('a', TODAY),
        now: NOW,
      })?.id,
    ).toBe('b');
  });

  it('suggests nothing when the recommendation is done and there is no alternative', () => {
    expect(
      suggestedNextStep({
        recommended: practice('a', TODAY),
        alternative: null,
        lastCompleted: last('a', TODAY),
        now: NOW,
      }),
    ).toBeNull();
  });

  it('suggests nothing when both the recommendation and the alternative are done today', () => {
    expect(
      suggestedNextStep({
        recommended: practice('a', TODAY),
        alternative: practice('b'),
        lastCompleted: last('b', TODAY),
        now: NOW,
      }),
    ).toBeNull();
  });

  it('treats a recommendation completed today as done even if a later completion is another practice', () => {
    expect(
      suggestedNextStep({
        recommended: practice('a', TODAY),
        alternative: practice('b'),
        lastCompleted: last('c', TODAY),
        now: NOW,
      })?.id,
    ).toBe('b');
  });

  it('suggests nothing without a recommendation (no check-in today, or an empty category)', () => {
    expect(
      suggestedNextStep({ recommended: null, alternative: practice('b'), lastCompleted: null }),
    ).toBeNull();
    expect(
      suggestedNextStep({ recommended: undefined, alternative: null, lastCompleted: undefined }),
    ).toBeNull();
  });
});
