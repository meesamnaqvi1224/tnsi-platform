import { describe, expect, it } from 'vitest';
import type { Practice, PracticeProgress } from '@/api/types';
import { hasActivity, profileActivity } from './profile-activity';

function practice(id: string, progress: Partial<PracticeProgress> | null): Practice {
  return {
    id,
    title: id,
    progress: progress && {
      id,
      progressPct: 0.4,
      positionSeconds: 10,
      completed: false,
      completedAt: null,
      playCount: 1,
      lastPlayedAt: '2026-11-01T10:00:00.000Z',
      ...progress,
    },
  } as Practice;
}

describe('profileActivity', () => {
  it('reports nothing for a member who has not practised', () => {
    const a = profileActivity([
      practice('a', null),
      practice('b', { playCount: 0, progressPct: null }),
    ]);
    expect(a).toEqual({ practised: 0, inProgress: 0, lastPlayedAt: null });
    expect(hasActivity(a)).toBe(false);
  });

  it('counts practised, in-progress (same rule as My Learning) and the latest play', () => {
    const a = profileActivity([
      practice('a', { progressPct: 0.5, lastPlayedAt: '2026-11-01T10:00:00.000Z' }),
      practice('b', {
        progressPct: 1,
        completed: true,
        completedAt: '2026-11-03T09:00:00.000Z',
        lastPlayedAt: '2026-11-03T09:00:00.000Z',
      }),
      practice('c', null),
    ]);
    expect(a.practised).toBe(2);
    expect(a.inProgress).toBe(1);
    expect(a.lastPlayedAt).toBe('2026-11-03T09:00:00.000Z');
    expect(hasActivity(a)).toBe(true);
  });

  it('ignores an unreadable play date instead of failing', () => {
    const a = profileActivity([practice('a', { lastPlayedAt: 'nope' })]);
    expect(a.practised).toBe(1);
    expect(a.lastPlayedAt).toBeNull();
  });
});
