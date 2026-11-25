/**
 * Human Expansion Theory™ recommendation routing. Pure and deterministic: no
 * database, no LLM, no clinical judgment. A self-reported check-in answer
 * (`capacityScore` 1-5) selects an ORDER OF PREFERENCE over the five
 * Developmental Conditions, and content that carries those conditions as tags
 * is ranked against it.
 *
 * Product decisions this encodes (approved 18 Nov 2026):
 * - The five conditions are interdependent, not stages. The table below is a
 *   preference order for what to OFFER first, never a label for the person
 *   and never a progression: completing a practice does not unlock or advance
 *   anything.
 * - It replaces the legacy GROUNDING/REGULATION/... routing. The old
 *   `category` column is left alone (and `recommendation.ts` is kept) but no
 *   longer drives the daily recommendation.
 * - The answer → condition table is a content decision for Caroline. Change
 *   the table, not the ranking code.
 * - Participation sits last for every answer except the highest: a single
 *   feelings question cannot responsibly indicate it. Only when the member says
 *   they feel really well (5) does it share a rank with the leading condition
 *   (see `HET_EQUAL_RANK_BY_CAPACITY_STATE`), so Participation practices are
 *   offered alongside Expansion ones instead of never. Changed 23 Nov 2026 at
 *   the owner's request; still a content decision for Caroline.
 */
import { normalizeCapacityScore, type CapacityState } from './recommendation';

export const HET_CONDITIONS = [
  'Safety',
  'Capacity',
  'Availability',
  'Expansion',
  'Participation',
] as const;

export type HetCondition = (typeof HET_CONDITIONS)[number];

/**
 * Per check-in answer, the conditions in the order content should be offered.
 * Index 0 is the primary condition, index 1 the secondary the approved table
 * names; the rest is the fallback order, so a recommendation is never empty
 * just because one condition has little content yet.
 */
export const HET_PREFERENCE_BY_CAPACITY_STATE: Record<CapacityState, readonly HetCondition[]> = {
  LOW: ['Safety', 'Capacity', 'Availability', 'Expansion', 'Participation'],
  LOW_MODERATE: ['Safety', 'Capacity', 'Availability', 'Expansion', 'Participation'],
  MODERATE: ['Capacity', 'Safety', 'Availability', 'Expansion', 'Participation'],
  MODERATE_HIGH: ['Availability', 'Expansion', 'Safety', 'Capacity', 'Participation'],
  HIGH: ['Expansion', 'Capacity', 'Availability', 'Safety', 'Participation'],
};

/**
 * Conditions that take the SAME rank as another condition for a given answer. Ranking is otherwise
 * strict (an item whose condition ranks lower is only ever offered when nothing ranked higher exists),
 * so a condition at the end of the list would never be recommended. Here Participation shares the first
 * rank with Expansion for the highest answer only, so its practices rotate in with Expansion's. Left
 * out for answers 1-4 on purpose: someone who is overwhelmed, unsettled, just okay or simply feeling
 * good is not steered toward participation by one feelings question. Widening this to answer 4 is one
 * line (`MODERATE_HIGH: { Participation: 'Availability' }`).
 */
export const HET_EQUAL_RANK_BY_CAPACITY_STATE: Partial<
  Record<CapacityState, Partial<Record<HetCondition, HetCondition>>>
> = {
  HIGH: { Participation: 'Expansion' },
};

export function hetPreferenceForCapacityScore(capacityScore: number): readonly HetCondition[] {
  return HET_PREFERENCE_BY_CAPACITY_STATE[normalizeCapacityScore(capacityScore)];
}

/** The conditions among a content item's tags, in tag order, matched case-insensitively and without repeats. The first is its primary condition. */
export function hetConditionsOf(tags: readonly string[]): HetCondition[] {
  const found: HetCondition[] = [];
  for (const tag of tags) {
    const match = HET_CONDITIONS.find((c) => c.toLowerCase() === tag.trim().toLowerCase());
    if (match && !found.includes(match)) found.push(match);
  }
  return found;
}

/** FNV-1a, 32 bit: a small stable hash so rotation never depends on Math.random or on row order. */
function hash(text: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i += 1) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h;
}

export type HetCandidate = { id: string; tags: readonly string[] };

export type HetPickOptions = {
  capacityScore: number;
  /** Keeps the rotation per member, so two members with the same answer do not all get the same item. */
  userKey: string;
  /** Pins the rotation to one calendar day of the check-in, so the pick is stable all day and moves on tomorrow. */
  dayKey: string;
  /** Items the member completed recently; they are offered after unseen ones of the same relevance. */
  recentlyCompletedIds?: ReadonlySet<string>;
  /**
   * Replaces the answer's own order of conditions (the check-in follow-up uses it when the member
   * chooses to grow). Must list all five conditions, best first, so every item has a rank. The answer's
   * equal-rank pairs do not apply to an override: the order given is the order used.
   */
  preference?: readonly HetCondition[];
};

export type HetPick<T> = {
  /** Best match first. At most `count` items. */
  picks: T[];
  /** The condition the first pick answers to (its best-ranked condition), or `null` when nothing is tagged. */
  condition: HetCondition | null;
};

/**
 * Ranks tagged items against the answer's preference order and returns the
 * first `count`. Relevance, best first:
 *   1. a preferred condition is the item's PRIMARY (first) condition - ranked by that condition's position;
 *   2. it appears only as a secondary condition - ranked just behind the same position.
 * Within equal relevance: not-recently-completed first, then a stable
 * per-member, per-day rotation. Items with no HET tag are never recommended.
 */
export function pickHetRecommendations<T extends HetCandidate>(
  candidates: readonly T[],
  options: HetPickOptions,
  count = 2,
): HetPick<T> {
  const state = normalizeCapacityScore(options.capacityScore);
  const preference = options.preference ?? HET_PREFERENCE_BY_CAPACITY_STATE[state];
  const sharesRankWith = options.preference ? {} : (HET_EQUAL_RANK_BY_CAPACITY_STATE[state] ?? {});
  const position = (c: HetCondition) => preference.indexOf(sharesRankWith[c] ?? c);
  const recent = options.recentlyCompletedIds ?? new Set<string>();

  const ranked = candidates
    .map((item) => {
      const conditions = hetConditionsOf(item.tags);
      if (conditions.length === 0) return null;
      const primaryRank = position(conditions[0]!);
      const secondaryRank = conditions
        .slice(1)
        .reduce((best, c) => Math.min(best, position(c)), 99);
      // A condition held as secondary counts just behind the same condition held as primary.
      const relevance = Math.min(primaryRank, secondaryRank + 0.5);
      // The condition that earned the rank: the item's own primary condition, or the secondary one that
      // scored. Not read back from the preference list, because two conditions can share a rank.
      const bestCondition = Number.isInteger(relevance)
        ? conditions[0]!
        : (conditions.slice(1).find((c) => position(c) === relevance - 0.5) ?? conditions[0]!);
      return {
        item,
        relevance,
        primaryRank,
        seen: recent.has(item.id) ? 1 : 0,
        tie: hash(`${options.userKey}|${options.dayKey}|${item.id}`),
        bestCondition,
      };
    })
    .filter((r): r is NonNullable<typeof r> => r !== null)
    .sort(
      (a, b) =>
        a.relevance - b.relevance ||
        a.seen - b.seen ||
        a.primaryRank - b.primaryRank ||
        a.tie - b.tie ||
        (a.item.id < b.item.id ? -1 : a.item.id > b.item.id ? 1 : 0),
    );

  const top = ranked.slice(0, Math.max(0, count));
  return { picks: top.map((r) => r.item), condition: top[0]?.bestCondition ?? null };
}

/**
 * The primary recommendation plus one alternative.
 *
 * Without `alternativeFromCondition` this is exactly `pickHetRecommendations(candidates, options, 2)`.
 *
 * With it (the check-in follow-up's "Show up more fully in my life" passes `Participation`), the
 * PRIMARY is still chosen by the strict ranking, so it can only be an item that has the condition
 * FIRST. The ALTERNATIVE, though, may be any other item that carries the condition at all, first or
 * second, so items that only hold it as a secondary tag can still appear. Among those candidates the
 * alternative is chosen the usual way: not recently completed first, then the stable per-member,
 * per-day rotation. If no other item carries the condition, the alternative falls back to the strict
 * ranking, so a thin library never leaves it empty.
 */
export function pickHetPrimaryAndAlternative<T extends HetCandidate>(
  candidates: readonly T[],
  options: HetPickOptions,
  settings: { alternativeFromCondition?: HetCondition } = {},
): HetPick<T> {
  const { alternativeFromCondition } = settings;
  if (!alternativeFromCondition) return pickHetRecommendations(candidates, options, 2);

  const first = pickHetRecommendations(candidates, options, 1);
  const primary = first.picks[0];
  if (!primary) return first;

  const others = candidates.filter((c) => c.id !== primary.id);
  const recent = options.recentlyCompletedIds ?? new Set<string>();
  const carrying = others
    .filter((c) => hetConditionsOf(c.tags).includes(alternativeFromCondition))
    .map((item) => ({
      item,
      seen: recent.has(item.id) ? 1 : 0,
      // Its own rotation (a different salt from the primary's), so the alternative is not tied to which
      // item the primary rotation happened to put first.
      tie: hash(`${options.userKey}|${options.dayKey}|alternative|${item.id}`),
    }))
    .sort(
      (a, b) =>
        a.seen - b.seen ||
        a.tie - b.tie ||
        (a.item.id < b.item.id ? -1 : a.item.id > b.item.id ? 1 : 0),
    );
  const alternative =
    carrying[0]?.item ?? pickHetRecommendations(others, options, 1).picks[0] ?? null;

  return { picks: alternative ? [primary, alternative] : [primary], condition: first.condition };
}

export const HET_CONTENT_KINDS = ['practice', 'powerDrop', 'somaticCard'] as const;
export type HetContentKind = (typeof HET_CONTENT_KINDS)[number];

export type HetSuggestion<T> = { kind: HetContentKind; item: T };

/**
 * A short, mixed set of suggestions across the content library: at most one
 * item of each kind (guided practice, PowerDrop, Somatic Card), each chosen
 * by `pickHetRecommendations` from its own pool. Kinds are ordered by what a
 * member can take on: someone who answered that a lot is going on (1) or that
 * they feel unsettled (2) is offered the brief items - a PowerDrop, then a
 * card - before a longer guided practice; everyone else sees the guided
 * practice first. A kind with no relevant item is simply absent.
 *
 * `slots` changes how many of a kind are picked (default one each; zero leaves a kind out). The
 * website cannot open PowerDrops, so it asks for `{ powerDrop: 0, somaticCard: 2 }`: the PowerDrop's
 * place goes to the next-best Somatic Card by the same ranking, never the same card twice.
 */
export function pickHetSuggestions<T extends HetCandidate>(
  pools: Partial<Record<HetContentKind, readonly T[]>>,
  options: HetPickOptions,
  maxItems = 3,
  slots: Partial<Record<HetContentKind, number>> = {},
): { items: HetSuggestion<T>[]; condition: HetCondition | null } {
  const briefFirst =
    normalizeCapacityScore(options.capacityScore) === 'LOW' ||
    normalizeCapacityScore(options.capacityScore) === 'LOW_MODERATE';
  const order: readonly HetContentKind[] = briefFirst
    ? ['powerDrop', 'somaticCard', 'practice']
    : ['practice', 'powerDrop', 'somaticCard'];

  const items: HetSuggestion<T>[] = [];
  let condition: HetCondition | null = null;
  for (const kind of order) {
    const wanted = slots[kind] ?? 1;
    if (wanted <= 0) continue;
    const best = pickHetRecommendations(pools[kind] ?? [], options, wanted);
    if (best.picks.length === 0) continue;
    if (items.length === 0) condition = best.condition;
    for (const item of best.picks) items.push({ kind, item });
  }
  return { items: items.slice(0, Math.max(0, maxItems)), condition };
}
