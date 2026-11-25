import { describe, expect, it } from 'vitest';
import { drivingDayKey, preferFresh, suggestedIdsOf, suggestedMetadata } from './check-in-driving';

const day = new Date('2026-12-01T00:00:00.000Z');

describe('drivingDayKey', () => {
  it('keeps the plain date for the first check-in of the day, with the switch on or off', () => {
    const first = { id: 'a', completedDate: day, isPrimary: true };
    expect(drivingDayKey(first, true)).toBe('2026-12-01');
    expect(drivingDayKey(first, false)).toBe('2026-12-01');
  });

  it('gives a later check-in its own key only when every check-in drives', () => {
    const later = { id: 'b', completedDate: day, isPrimary: false };
    expect(drivingDayKey(later, true)).toBe('2026-12-01|b');
    expect(drivingDayKey(later, false)).toBe('2026-12-01');
  });
});

describe('suggestedIdsOf / suggestedMetadata', () => {
  it('round-trips and de-duplicates', () => {
    expect(suggestedIdsOf(suggestedMetadata(['x', 'y', 'x']))).toEqual(['x', 'y']);
  });

  it('reads nothing from unusable metadata', () => {
    for (const bad of [
      null,
      undefined,
      5,
      'x',
      [],
      {},
      { suggested: 3 },
      { suggested: { ids: 'x' } },
    ]) {
      expect(suggestedIdsOf(bad)).toEqual([]);
    }
    expect(suggestedIdsOf({ suggested: { ids: ['a', 3, null, 'b'] } })).toEqual(['a', 'b']);
  });
});

describe('preferFresh', () => {
  const s = (kind: string, id: string) => ({ kind, item: { id } });

  it('swaps in an unseen item of the same kind', () => {
    const all = [s('somaticCard', 'old'), s('powerDrop', 'drop-old')];
    const fresh = [s('somaticCard', 'new')];
    expect(preferFresh(all, fresh).map((x) => x.item.id)).toEqual(['new', 'drop-old']);
  });

  it('lets an earlier item repeat when nothing new is left', () => {
    const all = [s('somaticCard', 'old')];
    expect(preferFresh(all, [])).toEqual(all);
  });

  it('uses each fresh item once, in order', () => {
    const all = [s('somaticCard', 'o1'), s('somaticCard', 'o2')];
    const fresh = [s('somaticCard', 'n1')];
    expect(preferFresh(all, fresh).map((x) => x.item.id)).toEqual(['n1', 'o2']);
  });
});
