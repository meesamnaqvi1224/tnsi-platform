import { describe, expect, it } from 'vitest';
import { hetPreferenceForFollowUp } from '../check-in/follow-up';
import { pickHetPrimaryAndAlternative, pickHetRecommendations } from './het-recommendation';

/** The seven Participation practices: four hold it first, three hold it second (after Capacity). */
const FIRST = [
  'The Empty Chair',
  'The Smallest Meaningful Movement',
  'Participation Goals',
  'Participation Bridge Tracker',
];
const SECOND = ['Capacity Protection Plan', 'My Participation Plan', 'Participation Area Check-In'];
const library = [
  ...FIRST.map((id) => ({ id, tags: ['Participation'] })),
  ...SECOND.map((id) => ({ id, tags: ['Capacity', 'Participation'] })),
  { id: 'The Growing Edge', tags: ['Expansion'] },
  { id: 'The Mountain State', tags: ['Safety', 'Capacity'] },
];
const grow = { v: 1, path: 'grow', growArea: 'participation' } as const;
const preference = hetPreferenceForFollowUp(5, grow);
const opts = (u: number, d: number, extra = {}) => ({
  capacityScore: 5,
  preference,
  userKey: `member-${u}`,
  dayKey: `day-${d}`,
  ...extra,
});

describe('pickHetPrimaryAndAlternative', () => {
  it('without a condition it is exactly the usual two picks', () => {
    for (let u = 0; u < 50; u++) {
      expect(pickHetPrimaryAndAlternative(library, opts(u, 1))).toEqual(
        pickHetRecommendations(library, opts(u, 1), 2),
      );
    }
  });

  it('Participation: the primary only ever has Participation first', () => {
    for (let u = 0; u < 200; u++) {
      for (let d = 0; d < 30; d++) {
        const { picks } = pickHetPrimaryAndAlternative(library, opts(u, d), {
          alternativeFromCondition: 'Participation',
        });
        expect(FIRST).toContain(picks[0]!.id);
      }
    }
  });

  it('Participation: the alternative is another Participation practice, never the primary', () => {
    for (let u = 0; u < 200; u++) {
      for (let d = 0; d < 30; d++) {
        const { picks } = pickHetPrimaryAndAlternative(library, opts(u, d), {
          alternativeFromCondition: 'Participation',
        });
        expect(picks).toHaveLength(2);
        expect(picks[1]!.id).not.toBe(picks[0]!.id);
        expect([...FIRST, ...SECOND]).toContain(picks[1]!.id);
      }
    }
  });

  it('all seven can appear, and the three Participation-second ones only as the alternative', () => {
    const asPrimary = new Set<string>();
    const asAlternative = new Set<string>();
    for (let u = 0; u < 200; u++) {
      for (let d = 0; d < 30; d++) {
        const { picks } = pickHetPrimaryAndAlternative(library, opts(u, d), {
          alternativeFromCondition: 'Participation',
        });
        asPrimary.add(picks[0]!.id);
        asAlternative.add(picks[1]!.id);
      }
    }
    expect([...asPrimary].sort()).toEqual([...FIRST].sort());
    for (const id of SECOND) expect(asAlternative.has(id)).toBe(true);
    for (const id of FIRST) expect(asAlternative.has(id)).toBe(true);
  });

  it('a recently finished alternative is offered after unseen ones', () => {
    const recent = new Set([...FIRST.slice(1), ...SECOND.slice(1)]);
    const { picks } = pickHetPrimaryAndAlternative(
      library,
      opts(1, 1, { recentlyCompletedIds: recent }),
      { alternativeFromCondition: 'Participation' },
    );
    const unseenOthers = [...FIRST, ...SECOND].filter(
      (id) => !recent.has(id) && id !== picks[0]!.id,
    );
    if (unseenOthers.length > 0) expect(unseenOthers).toContain(picks[1]!.id);
  });

  it('falls back to the usual ranking when nothing else carries the condition', () => {
    const thin = [
      { id: 'only-participation', tags: ['Participation'] },
      { id: 'a-safety', tags: ['Safety'] },
    ];
    const { picks } = pickHetPrimaryAndAlternative(thin, opts(1, 1), {
      alternativeFromCondition: 'Participation',
    });
    expect(picks.map((p) => p.id)).toEqual(['only-participation', 'a-safety']);
  });

  it('returns nothing when nothing is tagged', () => {
    expect(
      pickHetPrimaryAndAlternative([{ id: 'x', tags: [] }], opts(1, 1), {
        alternativeFromCondition: 'Participation',
      }).picks,
    ).toEqual([]);
  });
});
