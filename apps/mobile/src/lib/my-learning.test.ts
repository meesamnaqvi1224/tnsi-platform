import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import type { Practice, PracticeHistoryEntry } from '@/api/types';
import {
  buildLearningIndex,
  completedEver,
  describeWhen,
  describeWhenInline,
  formatLearningDate,
  inProgressPractices,
  parseLearningView,
  percentLabel,
} from './my-learning';

function practice(
  id: string,
  progress: Partial<NonNullable<Practice['progress']>> | null,
): Practice {
  return {
    id,
    title: `Practice ${id}`,
    description: null,
    contentType: 'meditation',
    mediaUrl: null,
    thumbnailUrl: null,
    durationSeconds: 600,
    category: null,
    tags: [],
    difficulty: 1,
    progress: progress && {
      id: `c-${id}`,
      progressPct: 0,
      positionSeconds: 0,
      completed: false,
      completedAt: null,
      playCount: 1,
      lastPlayedAt: null,
      ...progress,
    },
  };
}

function session(id: string, completedAt: string): PracticeHistoryEntry {
  return {
    id,
    title: `Practice ${id}`,
    description: null,
    contentType: 'meditation',
    mediaUrl: null,
    thumbnailUrl: null,
    durationSeconds: 600,
    category: null,
    tags: [],
    difficulty: 1,
    completionId: `${id}-${completedAt}`,
    completedAt,
    reflection: null,
  };
}

describe('My Learning: In Progress', () => {
  it('includes a practice whose latest session is unfinished with real progress', () => {
    const list = [practice('a', { progressPct: 0.4, lastPlayedAt: '2026-11-01T10:00:00Z' })];
    expect(inProgressPractices(list).map((p) => p.id)).toEqual(['a']);
  });

  it('excludes never-started, zero-progress, finished and fully-played practices', () => {
    const list = [
      practice('none', null),
      practice('zero', { progressPct: 0 }),
      practice('done', { progressPct: 1, completed: true }),
      practice('full', { progressPct: 1 }),
    ];
    expect(inProgressPractices(list)).toEqual([]);
  });

  it('puts the most recently played first', () => {
    const list = [
      practice('old', { progressPct: 0.2, lastPlayedAt: '2026-10-01T10:00:00Z' }),
      practice('new', { progressPct: 0.7, lastPlayedAt: '2026-11-02T10:00:00Z' }),
      practice('undated', { progressPct: 0.5, lastPlayedAt: null }),
    ];
    expect(inProgressPractices(list).map((p) => p.id)).toEqual(['new', 'old', 'undated']);
  });
});

describe('My Learning: Completed (ever)', () => {
  it('lists each practice once however many sessions were completed', () => {
    const history = [
      session('a', '2026-11-02T10:00:00Z'),
      session('b', '2026-10-20T10:00:00Z'),
      session('a', '2026-09-01T10:00:00Z'),
    ];
    const items = completedEver(history);
    expect(items.map((i) => i.id)).toEqual(['a', 'b']);
    expect(items[0]).toMatchObject({ id: 'a', sessions: 2, completedAt: '2026-11-02T10:00:00Z' });
  });

  it('keeps the most recent completion date even if history arrives out of order', () => {
    const items = completedEver([
      session('a', '2026-09-01T10:00:00Z'),
      session('a', '2026-11-02T10:00:00Z'),
    ]);
    expect(items[0]!.completedAt).toBe('2026-11-02T10:00:00Z');
  });

  it('keeps a completed practice that has since been restarted', () => {
    const history = [session('a', '2026-10-01T10:00:00Z')];
    const list = [practice('a', { progressPct: 0.3, completed: false })];
    expect(completedEver(history, list).map((i) => i.id)).toEqual(['a']);
    expect(inProgressPractices(list).map((p) => p.id)).toEqual(['a']);
  });

  it('adds a practice the list reports completed when history has not loaded it yet', () => {
    const list = [
      practice('z', { completed: true, progressPct: 1, completedAt: '2026-08-01T10:00:00Z' }),
    ];
    expect(completedEver([], list).map((i) => i.id)).toEqual(['z']);
  });

  it('does not duplicate a practice that is in both history and the list', () => {
    const history = [session('a', '2026-10-01T10:00:00Z')];
    const list = [
      practice('a', { completed: true, progressPct: 1, completedAt: '2026-10-01T10:00:00Z' }),
    ];
    expect(completedEver(history, list)).toHaveLength(1);
  });

  it('keeps historical practices that are no longer in the published list', () => {
    expect(
      completedEver([session('unpublished', '2026-05-01T10:00:00Z')], []).map((i) => i.id),
    ).toEqual(['unpublished']);
  });
});

describe('My Learning: overlapping states', () => {
  it('reports saved, in progress and completed for one practice at once', () => {
    const list = [practice('a', { progressPct: 0.5, lastPlayedAt: '2026-11-02T10:00:00Z' })];
    const completed = completedEver([session('a', '2026-10-01T10:00:00Z')], list);
    const index = buildLearningIndex({ practices: list, completed, savedIds: new Set(['a']) });
    expect(index.statusOf('a')).toEqual({
      inProgressPct: 0.5,
      lastPlayedAt: '2026-11-02T10:00:00Z',
      completedAt: '2026-10-01T10:00:00Z',
      saved: true,
    });
  });

  it('reports saved independently of completion', () => {
    const index = buildLearningIndex({
      practices: [practice('a', null)],
      completed: [],
      savedIds: new Set(['a']),
    });
    expect(index.statusOf('a')).toEqual({
      inProgressPct: null,
      lastPlayedAt: null,
      completedAt: null,
      saved: true,
    });
  });

  it('reports nothing for an unknown practice', () => {
    const index = buildLearningIndex({ practices: [], completed: [], savedIds: new Set() });
    expect(index.statusOf('nope')).toEqual({
      inProgressPct: null,
      lastPlayedAt: null,
      completedAt: null,
      saved: false,
    });
  });
});

describe('My Learning: view parameter and labels', () => {
  it('opens a known view and falls back to In Progress', () => {
    expect(parseLearningView('saved')).toBe('saved');
    expect(parseLearningView(['completed'])).toBe('completed');
    expect(parseLearningView('nonsense')).toBe('in-progress');
    expect(parseLearningView(undefined)).toBe('in-progress');
  });

  it('describes when something happened', () => {
    const now = new Date('2026-11-04T15:00:00');
    expect(describeWhen('2026-11-04T08:00:00', now)).toBe('Today');
    expect(describeWhen('2026-11-03T23:00:00', now)).toBe('Yesterday');
    expect(describeWhen('2026-11-01T10:00:00', now)).toBe('3 days ago');
    expect(describeWhen('2026-10-01T10:00:00', now)).toBe(
      formatLearningDate('2026-10-01T10:00:00'),
    );
    expect(describeWhen('not a date', now)).toBe('');
  });

  it('describes when something happened in the middle of a sentence', () => {
    const now = new Date('2026-11-04T15:00:00');
    expect(describeWhenInline('2026-11-04T08:00:00', now)).toBe('today');
    expect(describeWhenInline('2026-11-03T08:00:00', now)).toBe('yesterday');
    expect(describeWhenInline('2026-11-01T10:00:00', now)).toBe('3 days ago');
    expect(describeWhenInline('2026-10-01T10:00:00', now)).toBe(
      formatLearningDate('2026-10-01T10:00:00'),
    );
  });

  it('formats progress as a whole percentage, clamped', () => {
    expect(percentLabel(0.4237)).toBe('42%');
    expect(percentLabel(2)).toBe('100%');
    expect(percentLabel(-1)).toBe('0%');
  });
});

describe('My Learning: touch targets (Android minimum 48 dp)', () => {
  const source = (path: string) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');

  it('gives the Save pill a 48 dp touch area: 32 dp drawn plus 8 dp of slop above and below', () => {
    const save = source('components/practices/SaveToggleButton.tsx');
    expect(save).toContain('minHeight: 32');
    expect(save).toContain('hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}');
  });

  it("gives the Saved view's remove pill the same 48 dp touch area, and the Undo button 48 dp", () => {
    expect(source('components/learning/RemoveSavedButton.tsx')).toContain(
      'hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}',
    );
    expect(source('components/learning/UndoBar.tsx')).toContain('minHeight: 48');
  });

  it('makes each tab and each Continue button at least 48 dp tall', () => {
    expect(source('components/learning/LearningTabs.tsx')).toContain('minHeight: 48');
    expect(source('components/learning/InProgressView.tsx')).toContain('minHeight: 48');
    expect(source('components/learning/CompletedView.tsx')).toContain('minHeight: 48');
  });
});
