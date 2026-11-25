import { describe, expect, it } from 'vitest';
import { pickHetRecommendations, pickHetSuggestions } from './het-recommendation';

const cards = [
  { id: 'card-safety-1', tags: ['Safety', 'Capacity'] },
  { id: 'card-safety-2', tags: ['Safety'] },
  { id: 'card-capacity', tags: ['Capacity'] },
  { id: 'card-avail', tags: ['Availability'] },
  { id: 'card-expansion-1', tags: ['Expansion'] },
  { id: 'card-expansion-2', tags: ['Expansion', 'Availability'] },
];
const drops = [
  { id: 'drop-safety', tags: ['Safety'] },
  { id: 'drop-capacity', tags: ['Capacity'] },
  { id: 'drop-avail', tags: ['Availability'] },
  { id: 'drop-expansion', tags: ['Expansion'] },
];
const practice = [{ id: 'practice-today', tags: ['Capacity'] }];
const pools = { practice, powerDrop: drops, somaticCard: cards };
const WEB = { powerDrop: 0, somaticCard: 2 } as const;
const o = (answer: number, u = 0, d = 0) => ({
  capacityScore: answer,
  userKey: `member-${u}`,
  dayKey: `day-${d}`,
});

describe('pickHetSuggestions without slots (the app) is unchanged', () => {
  it('one of each kind, brief items first for answers 1 and 2', () => {
    for (const answer of [1, 2]) {
      expect(pickHetSuggestions(pools, o(answer)).items.map((i) => i.kind)).toEqual([
        'powerDrop',
        'somaticCard',
        'practice',
      ]);
    }
    for (const answer of [3, 4, 5]) {
      expect(pickHetSuggestions(pools, o(answer)).items.map((i) => i.kind)).toEqual([
        'practice',
        'powerDrop',
        'somaticCard',
      ]);
    }
  });

  it('empty slots give exactly the same result as no slots', () => {
    for (let u = 0; u < 30; u++) {
      for (const answer of [1, 2, 3, 4, 5]) {
        expect(pickHetSuggestions(pools, o(answer, u), 3, {})).toEqual(
          pickHetSuggestions(pools, o(answer, u)),
        );
      }
    }
  });
});

describe('pickHetSuggestions for the website: never a PowerDrop, a second card instead', () => {
  it('never offers a PowerDrop, for any answer', () => {
    for (let u = 0; u < 100; u++) {
      for (let d = 0; d < 10; d++) {
        for (const answer of [1, 2, 3, 4, 5]) {
          const { items } = pickHetSuggestions(pools, o(answer, u, d), 3, WEB);
          expect(items.some((i) => i.kind === 'powerDrop')).toBe(false);
        }
      }
    }
  });

  it('the second card is never the same card as the first', () => {
    for (let u = 0; u < 100; u++) {
      for (let d = 0; d < 10; d++) {
        for (const answer of [1, 2, 3, 4, 5]) {
          const shown = pickHetSuggestions(pools, o(answer, u, d), 3, WEB).items.filter(
            (i) => i.kind === 'somaticCard',
          );
          expect(shown).toHaveLength(2);
          expect(shown[1]!.item.id).not.toBe(shown[0]!.item.id);
        }
      }
    }
  });

  it('the two cards are the two best by the same ranking the app uses', () => {
    for (const answer of [1, 3, 5]) {
      const web = pickHetSuggestions(pools, o(answer), 3, WEB)
        .items.filter((i) => i.kind === 'somaticCard')
        .map((i) => i.item.id);
      expect(web).toEqual(pickHetRecommendations(cards, o(answer), 2).picks.map((c) => c.id));
    }
  });

  it('keeps the order: cards first for answers 1 and 2, the practice first otherwise, three at most', () => {
    for (const answer of [1, 2]) {
      expect(pickHetSuggestions(pools, o(answer), 3, WEB).items.map((i) => i.kind)).toEqual([
        'somaticCard',
        'somaticCard',
        'practice',
      ]);
    }
    for (const answer of [3, 4, 5]) {
      expect(pickHetSuggestions(pools, o(answer), 3, WEB).items.map((i) => i.kind)).toEqual([
        'practice',
        'somaticCard',
        'somaticCard',
      ]);
    }
  });

  it('the reason condition comes from the first item actually shown', () => {
    // Low answer: the first thing shown is now a card, not the PowerDrop.
    const web = pickHetSuggestions(pools, o(1), 3, WEB);
    expect(web.items[0]!.kind).toBe('somaticCard');
    expect(web.condition).toBe(pickHetRecommendations(cards, o(1), 1).condition);
  });

  it('with only one card available it shows one card, never a repeat', () => {
    const { items } = pickHetSuggestions({ ...pools, somaticCard: [cards[0]!] }, o(3), 3, WEB);
    expect(items.filter((i) => i.kind === 'somaticCard')).toHaveLength(1);
    expect(items.some((i) => i.kind === 'powerDrop')).toBe(false);
  });

  it('with no cards at all there is nothing to substitute, and still no PowerDrop', () => {
    const { items } = pickHetSuggestions({ ...pools, somaticCard: [] }, o(3), 3, WEB);
    expect(items.map((i) => i.kind)).toEqual(['practice']);
  });
});

describe('pickHetSuggestions reports the condition of each kind', () => {
  it('conditionByKind holds each kind own condition, and condition stays the first item one', () => {
    for (const answer of [1, 2, 3, 4, 5]) {
      const r = pickHetSuggestions(pools, o(answer));
      expect(r.conditionByKind.somaticCard).toBe(
        pickHetRecommendations(cards, o(answer), 1).condition,
      );
      expect(r.conditionByKind.powerDrop).toBe(
        pickHetRecommendations(drops, o(answer), 1).condition,
      );
      expect(r.conditionByKind.practice).toBe(
        pickHetRecommendations(practice, o(answer), 1).condition,
      );
      const first = r.items[0]!.kind;
      expect(r.condition).toBe(r.conditionByKind[first]);
    }
  });

  it('for the website the card condition is available and a left-out kind is absent', () => {
    const r = pickHetSuggestions(pools, o(3), 3, WEB);
    expect(r.conditionByKind.somaticCard).toBe(pickHetRecommendations(cards, o(3), 2).condition);
    expect('powerDrop' in r.conditionByKind).toBe(false);
  });
});
