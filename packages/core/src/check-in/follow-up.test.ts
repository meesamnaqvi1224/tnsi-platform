import { describe, expect, it } from 'vitest';
import { FOLLOW_UP_ROUTING } from './follow-up-routing';
import {
  followUpFitsAnswer,
  hetPreferenceForFollowUp,
  normalizeFollowUp,
  parseFollowUp,
  pickSettleItems,
  type FollowUp,
  type FollowUpCandidate,
} from './follow-up';
import { pickHetRecommendations, pickHetSuggestions } from '../practices/het-recommendation';

const routing = FOLLOW_UP_ROUTING!;

describe('parseFollowUp', () => {
  it('accepts the three shapes', () => {
    expect(parseFollowUp({ v: 1, path: 'pattern', pattern: 'hypervigilance' })).toEqual({
      v: 1,
      path: 'pattern',
      pattern: 'hypervigilance',
    });
    expect(parseFollowUp({ v: 1, path: 'unsure' })).toEqual({ v: 1, path: 'unsure' });
    expect(parseFollowUp({ v: 1, path: 'grow', growArea: 'participation' })).toEqual({
      v: 1,
      path: 'grow',
      growArea: 'participation',
    });
  });

  it('drops anything else, including extra fields', () => {
    for (const bad of [
      null,
      'x',
      [],
      {},
      { v: 2, path: 'unsure' },
      { v: 1, path: 'pattern', pattern: 'stretch' },
      { v: 1, path: 'pattern' },
      { v: 1, path: 'grow', growArea: 'stretch' },
      { v: 1, path: 'other' },
    ]) {
      expect(parseFollowUp(bad)).toBeNull();
    }
    expect(parseFollowUp({ v: 1, path: 'unsure', notes: 'free text' })).toEqual({
      v: 1,
      path: 'unsure',
    });
  });
});

describe('which answers a follow-up can follow', () => {
  const settle: FollowUp = { v: 1, path: 'pattern', pattern: 'functional-overdrive' };
  const unsure: FollowUp = { v: 1, path: 'unsure' };
  const grow: FollowUp = { v: 1, path: 'grow', growArea: 'expansion' };

  it('settle paths for 1 to 3, grow for 3 to 5', () => {
    expect([1, 2, 3, 4, 5].map((n) => followUpFitsAnswer(settle, n))).toEqual([
      true,
      true,
      true,
      false,
      false,
    ]);
    expect([1, 2, 3, 4, 5].map((n) => followUpFitsAnswer(unsure, n))).toEqual([
      true,
      true,
      true,
      false,
      false,
    ]);
    expect([1, 2, 3, 4, 5].map((n) => followUpFitsAnswer(grow, n))).toEqual([
      false,
      false,
      true,
      true,
      true,
    ]);
  });

  it('rejects an out-of-range answer', () => {
    expect(followUpFitsAnswer(grow, 0)).toBe(false);
    expect(followUpFitsAnswer(grow, 6)).toBe(false);
    expect(followUpFitsAnswer(grow, 4.5)).toBe(false);
  });

  it('normalizeFollowUp drops an inconsistent pair', () => {
    expect(normalizeFollowUp(grow, 5)).toEqual(grow);
    expect(normalizeFollowUp(grow, 1)).toBeNull();
    expect(normalizeFollowUp(settle, 5)).toBeNull();
    expect(normalizeFollowUp({ nonsense: true }, 3)).toBeNull();
  });
});

describe('hetPreferenceForFollowUp', () => {
  it('puts the chosen grow condition first and keeps all five', () => {
    const e = hetPreferenceForFollowUp(4, { v: 1, path: 'grow', growArea: 'expansion' })!;
    const p = hetPreferenceForFollowUp(4, { v: 1, path: 'grow', growArea: 'participation' })!;
    expect(e[0]).toBe('Expansion');
    expect(p[0]).toBe('Participation');
    expect([...e].sort()).toEqual([
      'Availability',
      'Capacity',
      'Expansion',
      'Participation',
      'Safety',
    ]);
    expect([...p].sort()).toEqual([
      'Availability',
      'Capacity',
      'Expansion',
      'Participation',
      'Safety',
    ]);
  });

  it('is undefined for the settle paths, which keep the answer order', () => {
    expect(hetPreferenceForFollowUp(2, { v: 1, path: 'unsure' })).toBeUndefined();
    expect(hetPreferenceForFollowUp(2, null)).toBeUndefined();
  });

  it('changes who leads in the real ranking', () => {
    const items = [
      { id: 'e', tags: ['Expansion'] },
      { id: 'p', tags: ['Participation'] },
      { id: 's', tags: ['Safety'] },
    ];
    const base = { capacityScore: 4, userKey: 'u', dayKey: '2026-11-24' };
    expect(
      pickHetRecommendations(items, {
        ...base,
        preference: hetPreferenceForFollowUp(4, { v: 1, path: 'grow', growArea: 'participation' }),
      }).picks[0]!.id,
    ).toBe('p');
    expect(
      pickHetRecommendations(items, {
        ...base,
        preference: hetPreferenceForFollowUp(4, { v: 1, path: 'grow', growArea: 'expansion' }),
      }).picks[0]!.id,
    ).toBe('e');
  });

  it('without an override the existing behaviour is unchanged', () => {
    const items = [
      { id: 'e', tags: ['Expansion'] },
      { id: 'p', tags: ['Participation'] },
    ];
    // Answer 5 still shares the first rank between Expansion and Participation (PR #74).
    const ids = new Set<string>();
    for (let u = 0; u < 40; u++) {
      ids.add(
        pickHetRecommendations(items, { capacityScore: 5, userKey: `u${u}`, dayKey: 'd' }).picks[0]!
          .id,
      );
    }
    expect(ids).toEqual(new Set(['e', 'p']));
    // Answer 4 still never offers Participation first.
    expect(
      pickHetRecommendations(items, { capacityScore: 4, userKey: 'u', dayKey: 'd' }).picks[0]!.id,
    ).toBe('e');
  });

  it('a grow choice leads suggestions of every kind', () => {
    const pools = {
      practice: [
        { id: 'p1', tags: ['Expansion'] },
        { id: 'p2', tags: ['Participation'] },
      ],
      powerDrop: [
        { id: 'd1', tags: ['Safety'] },
        { id: 'd2', tags: ['Participation'] },
      ],
      somaticCard: [{ id: 'c1', tags: ['Expansion'] }],
    };
    const r = pickHetSuggestions(pools, {
      capacityScore: 4,
      userKey: 'u',
      dayKey: 'd',
      preference: hetPreferenceForFollowUp(4, { v: 1, path: 'grow', growArea: 'participation' }),
    });
    expect(r.condition).toBe('Participation');
    expect(r.items.map((i) => i.item.id)).toEqual(['p2', 'd2', 'c1']);
  });
});

describe('pickSettleItems', () => {
  const cand = (
    slug: string,
    kind: 'somaticCard' | 'powerDrop' = 'somaticCard',
    extra: Partial<FollowUpCandidate> = {},
  ): FollowUpCandidate => ({ kind, slug, patterns: [], isFree: true, ...extra });
  const sigh = cand('the-physiological-sigh');
  const horizon = cand('the-horizon-lock');
  const overdrive = routing.patterns.find((p) => p.id === 'functional-overdrive')!;
  const base = { routing, userKey: 'u', dayKey: '2026-11-24' };
  const follow = { v: 1, path: 'pattern', pattern: 'functional-overdrive' } as const;

  it('returns exactly the two named practices, in order', () => {
    expect(overdrive.picks.map((p) => p.slug)).toEqual([
      'the-physiological-sigh',
      'the-horizon-lock',
    ]);
    const out = pickSettleItems({
      ...base,
      followUp: follow,
      candidates: [horizon, cand('other'), sigh],
      fallback: [cand('fallback')],
    });
    expect(out.map((c) => c.slug)).toEqual(['the-physiological-sigh', 'the-horizon-lock']);
  });

  it('offers the fixed pair for "not sure"', () => {
    const out = pickSettleItems({
      ...base,
      followUp: { v: 1, path: 'unsure' },
      candidates: [horizon, sigh],
      fallback: [],
    });
    expect(out.map((c) => c.slug)).toEqual(['the-physiological-sigh', 'the-horizon-lock']);
  });

  it('replaces an unavailable listed item from the same pattern, then from the fallback', () => {
    const tagged = cand('tagged-for-overdrive', 'somaticCard', {
      patterns: ['functional-overdrive'],
    });
    const out = pickSettleItems({
      ...base,
      followUp: follow,
      candidates: [sigh, tagged], // the Horizon Lock is not available
      fallback: [cand('fallback')],
    });
    expect(out.map((c) => c.slug)).toEqual(['the-physiological-sigh', 'tagged-for-overdrive']);

    const out2 = pickSettleItems({
      ...base,
      followUp: follow,
      candidates: [sigh],
      fallback: [cand('fallback')],
    });
    expect(out2.map((c) => c.slug)).toEqual(['the-physiological-sigh', 'fallback']);
  });

  it('never offers a locked item to a free member', () => {
    const lockedDrop = cand('the-physiological-sigh', 'somaticCard', { isFree: false });
    const out = pickSettleItems({
      ...base,
      followUp: follow,
      freeOnly: true,
      candidates: [lockedDrop, horizon],
      fallback: [cand('fallback')],
    });
    expect(out.map((c) => c.slug)).toEqual(['the-horizon-lock', 'fallback']);
  });

  it('returns fewer than two when nothing can fill the gap, never duplicates', () => {
    const out = pickSettleItems({
      ...base,
      followUp: follow,
      candidates: [sigh, sigh],
      fallback: [sigh],
    });
    expect(out.map((c) => c.slug)).toEqual(['the-physiological-sigh']);
    expect(pickSettleItems({ ...base, followUp: follow, candidates: [], fallback: [] })).toEqual(
      [],
    );
  });

  it('a kind mismatch is not a match', () => {
    const wrongKind = cand('the-physiological-sigh', 'powerDrop');
    const out = pickSettleItems({
      ...base,
      followUp: follow,
      candidates: [wrongKind],
      fallback: [],
    });
    expect(out).toEqual([]);
  });
});
