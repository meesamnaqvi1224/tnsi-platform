import { describe, expect, it } from 'vitest';
import {
  HET_CONDITIONS,
  hetConditionsOf,
  hetPreferenceForCapacityScore,
  pickHetRecommendations,
  pickHetSuggestions,
} from './het-recommendation';

/** The ten live guided practices as tagged in Sanity after the 18 Nov 2026 tag fixes. */
const LIVE = [
  { id: 'root-to-rise', tags: ['Safety', 'Expansion'] },
  { id: 'safe-distance', tags: ['Safety', 'Availability'] },
  { id: 'room-no-demands', tags: ['Safety', 'Capacity'] },
  { id: 'shoreline-reset', tags: ['Safety'] },
  { id: 'body-softening', tags: ['Safety'] },
  { id: 'return-path', tags: ['Safety', 'Capacity'] },
  { id: 'greenhouse', tags: ['Safety', 'Capacity'] },
  { id: 'mountain-state', tags: ['Capacity', 'Safety'] },
  { id: 'forest-walk', tags: ['Availability', 'Safety'] },
  { id: 'future-self', tags: ['Expansion', 'Capacity'] },
];
const base = { userKey: 'member-1', dayKey: '2026-11-18' };

describe('hetConditionsOf', () => {
  it('keeps tag order, ignores case, spaces, repeats and non-condition tags', () => {
    expect(hetConditionsOf([' safety ', 'Healing', 'CAPACITY', 'Safety'])).toEqual([
      'Safety',
      'Capacity',
    ]);
    expect(hetConditionsOf(['Practice, Healing, Meditation'])).toEqual([]);
    expect(hetConditionsOf([])).toEqual([]);
  });
});

describe('hetPreferenceForCapacityScore (the approved answer table)', () => {
  it('starts with the approved primary and secondary condition for each answer', () => {
    const head = (s: number) => hetPreferenceForCapacityScore(s).slice(0, 2);
    expect(head(1)).toEqual(['Safety', 'Capacity']);
    expect(head(2)).toEqual(['Safety', 'Capacity']);
    expect(head(3)).toEqual(['Capacity', 'Safety']);
    expect(head(4)).toEqual(['Availability', 'Expansion']);
    expect(head(5)).toEqual(['Expansion', 'Capacity']);
  });

  it('lists every condition exactly once, with Participation last, for every answer', () => {
    for (const s of [1, 2, 3, 4, 5]) {
      const pref = hetPreferenceForCapacityScore(s);
      expect([...pref].sort()).toEqual([...HET_CONDITIONS].sort());
      expect(pref[4]).toBe('Participation');
    }
  });

  it('rejects a score outside 1-5 rather than guessing', () => {
    expect(() => hetPreferenceForCapacityScore(0)).toThrow(RangeError);
    expect(() => hetPreferenceForCapacityScore(6)).toThrow(RangeError);
  });
});

describe('pickHetRecommendations on the live library', () => {
  it('gives every answer a primary, and an alternative for every answer that has two relevant items', () => {
    for (const capacityScore of [1, 2, 3, 4, 5]) {
      const { picks, condition } = pickHetRecommendations(LIVE, { ...base, capacityScore });
      expect(picks.length).toBe(2);
      expect(condition).not.toBeNull();
      expect(picks[0]!.id).not.toBe(picks[1]!.id);
    }
  });

  it('answers to the approved primary condition: an overwhelmed member gets Safety-first content', () => {
    const { picks, condition } = pickHetRecommendations(LIVE, { ...base, capacityScore: 1 });
    expect(condition).toBe('Safety');
    expect(hetConditionsOf(picks[0]!.tags)[0]).toBe('Safety');
  });

  it("score 3 ('I'm okay') leads with Capacity; the item that carries it as primary comes first", () => {
    const { picks, condition } = pickHetRecommendations(LIVE, { ...base, capacityScore: 3 });
    expect(condition).toBe('Capacity');
    expect(picks[0]!.id).toBe('mountain-state');
  });

  it('score 4 leads with Availability (the Forest Walk), then Safety-led content that also carries it', () => {
    const { picks, condition } = pickHetRecommendations(LIVE, { ...base, capacityScore: 4 });
    expect(condition).toBe('Availability');
    expect(picks[0]!.id).toBe('forest-walk');
    expect(picks[1]!.id).toBe('safe-distance');
  });

  it('score 5 leads with Expansion (Future Self Integration), then Root to Rise which also carries it', () => {
    const { picks } = pickHetRecommendations(LIVE, { ...base, capacityScore: 5 });
    expect(picks[0]!.id).toBe('future-self');
    expect(picks[1]!.id).toBe('root-to-rise');
  });

  it('is stable for a member on a day and different for another day or another member', () => {
    const run = (o: Partial<typeof base>) =>
      pickHetRecommendations(LIVE, { ...base, ...o, capacityScore: 1 }).picks.map((p) => p.id);
    expect(run({})).toEqual(run({}));
    const variants = new Set(
      ['2026-11-18', '2026-11-19', '2026-11-20', '2026-11-21', '2026-11-22'].map((d) =>
        run({ dayKey: d }).join(),
      ),
    );
    expect(variants.size).toBeGreaterThan(1);
  });

  it('does not depend on input order', () => {
    const forward = pickHetRecommendations(LIVE, { ...base, capacityScore: 1 }).picks;
    const reversed = pickHetRecommendations([...LIVE].reverse(), {
      ...base,
      capacityScore: 1,
    }).picks;
    expect(reversed.map((p) => p.id)).toEqual(forward.map((p) => p.id));
  });

  it('offers recently completed items after unseen ones of the same relevance, but still offers them if they are the best', () => {
    const first = pickHetRecommendations(LIVE, { ...base, capacityScore: 1 }).picks[0]!;
    const after = pickHetRecommendations(LIVE, {
      ...base,
      capacityScore: 1,
      recentlyCompletedIds: new Set([first.id]),
    }).picks;
    expect(after.map((p) => p.id)).not.toContain(first.id);
    // Only one item exists for Expansion-first answers: it is still offered even if just completed.
    const only = pickHetRecommendations([LIVE[9]!], {
      ...base,
      capacityScore: 5,
      recentlyCompletedIds: new Set(['future-self']),
    });
    expect(only.picks.map((p) => p.id)).toEqual(['future-self']);
  });

  it('never returns an empty result while any item carries a condition, falling back down the order', () => {
    const onlyExpansion = [{ id: 'x', tags: ['Expansion'] }];
    for (const capacityScore of [1, 2, 3, 4, 5]) {
      expect(
        pickHetRecommendations(onlyExpansion, { ...base, capacityScore }).picks.map((p) => p.id),
      ).toEqual(['x']);
    }
  });

  it('never recommends an untagged item and returns nothing for an empty library', () => {
    const untagged = [{ id: 'u', tags: ['Healing'] }];
    expect(pickHetRecommendations(untagged, { ...base, capacityScore: 1 })).toEqual({
      picks: [],
      condition: null,
    });
    expect(pickHetRecommendations([], { ...base, capacityScore: 1 })).toEqual({
      picks: [],
      condition: null,
    });
  });

  it('respects the requested count', () => {
    expect(pickHetRecommendations(LIVE, { ...base, capacityScore: 1 }, 1).picks).toHaveLength(1);
    expect(pickHetRecommendations(LIVE, { ...base, capacityScore: 1 }, 0).picks).toHaveLength(0);
  });
});

describe('pickHetSuggestions across the content library', () => {
  const pools = {
    practice: [{ id: 'mountain-state', tags: ['Capacity', 'Safety'] }],
    powerDrop: [
      { id: 'exhale', tags: ['Safety', 'Capacity'] },
      { id: 'enough', tags: ['Availability', 'Participation'] },
    ],
    somaticCard: [
      { id: 'heel', tags: ['Safety'] },
      { id: 'sway', tags: ['Expansion', 'Safety'] },
    ],
  };

  it('offers brief items first to someone whose answer is 1 or 2, and the guided practice first otherwise', () => {
    const kinds = (capacityScore: number) =>
      pickHetSuggestions(pools, { ...base, capacityScore }).items.map((s) => s.kind);
    expect(kinds(1)).toEqual(['powerDrop', 'somaticCard', 'practice']);
    expect(kinds(2)).toEqual(['powerDrop', 'somaticCard', 'practice']);
    expect(kinds(3)).toEqual(['practice', 'powerDrop', 'somaticCard']);
    expect(kinds(5)).toEqual(['practice', 'powerDrop', 'somaticCard']);
  });

  it('picks the most relevant item inside each kind', () => {
    const one = pickHetSuggestions(pools, { ...base, capacityScore: 1 }).items;
    expect(one.find((s) => s.kind === 'powerDrop')!.item.id).toBe('exhale');
    expect(one.find((s) => s.kind === 'somaticCard')!.item.id).toBe('heel');
    const four = pickHetSuggestions(pools, { ...base, capacityScore: 4 }).items;
    expect(four.find((s) => s.kind === 'powerDrop')!.item.id).toBe('enough');
  });

  it("skips a kind with nothing relevant and reports the first suggestion's condition", () => {
    const r = pickHetSuggestions(
      { powerDrop: pools.powerDrop, somaticCard: [{ id: 'bare', tags: ['Healing'] }] },
      { ...base, capacityScore: 1 },
    );
    expect(r.items.map((s) => s.kind)).toEqual(['powerDrop']);
    expect(r.condition).toBe('Safety');
    expect(pickHetSuggestions({}, { ...base, capacityScore: 1 })).toEqual({
      items: [],
      condition: null,
    });
  });

  it('caps the result at maxItems', () => {
    expect(pickHetSuggestions(pools, { ...base, capacityScore: 1 }, 2).items).toHaveLength(2);
  });
});
