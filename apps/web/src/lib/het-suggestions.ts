import { sanityFetch } from '@tnsi/cms/server';
import {
  CHECKIN_FOLLOW_UP_ITEMS_QUERY,
  HET_POWER_DROPS_QUERY,
  HET_SOMATIC_CARDS_QUERY,
} from '@tnsi/cms';
import {
  FOLLOW_UP_ROUTING,
  hetPreferenceForFollowUp,
  isSettleFollowUp,
  pickHetSuggestions,
  pickSettleItems,
  type FollowUpCandidate,
  type HetCondition,
  type HetContentKind,
  type HetPickOptions,
} from '@tnsi/core';
import { getLatestCheckIn } from './check-ins';
import { followUpOfCheckIn } from './check-in-follow-up';
import type { PracticeSummary } from './practices';

type RawItem = {
  id: string;
  title: string;
  slug: string;
  description: string | null;
  tags: string[] | null;
  isFree?: boolean;
};

export type HetSuggestionItem = {
  kind: HetContentKind;
  id: string;
  /** PowerDrops and Somatic Cards are opened by slug; a guided practice by its id. */
  slug: string | null;
  title: string;
  description: string | null;
};

export type HetSuggestions = {
  /** The Developmental Condition the first suggestion answers to, or `null` when there is nothing to suggest. */
  condition: HetCondition | null;
  items: HetSuggestionItem[];
};

type Candidate = { id: string; tags: string[]; out: HetSuggestionItem; isFree: boolean };

type FollowUpRaw = RawItem & {
  kind: 'somaticCard' | 'powerDrop';
  patterns: string[] | null;
};
type SettleCandidate = FollowUpCandidate & { out: HetSuggestionItem };

const NONE: HetSuggestions = { condition: null, items: [] };

/**
 * One short, mixed set of suggestions from the whole content library for the
 * member's latest primary check-in: the guided practice already picked by
 * `getRecommendedPractices`, plus the best-matching PowerDrop and Somatic
 * Card (see `@tnsi/core`'s `pickHetSuggestions`). PowerDrops and Somatic
 * Cards are matched on the `hetConditions` set in Sanity; an item without
 * them is never suggested. A free-tier member (`freeOnly`) is only offered
 * free PowerDrops. Never throws: if the CMS is unreachable this is simply
 * empty, and the guided-practice recommendation is unaffected.
 */
export async function getHetSuggestions(
  userId: string,
  options: {
    freeOnly?: boolean;
    practice: PracticeSummary | null;
    /** The website cannot open PowerDrops, so it asks for a card in their place. Defaults to the app. */
    surface?: 'web' | 'app';
  },
): Promise<HetSuggestions> {
  try {
    const latest = await getLatestCheckIn(userId);
    if (!latest) return NONE;

    const [drops, cards] = await Promise.all([
      sanityFetch<RawItem[]>(HET_POWER_DROPS_QUERY),
      sanityFetch<RawItem[]>(HET_SOMATIC_CARDS_QUERY),
    ]);

    const toItem = (kind: HetContentKind, raw: RawItem): Candidate => ({
      id: raw.id,
      tags: raw.tags ?? [],
      out: {
        kind,
        id: raw.id,
        slug: raw.slug,
        title: raw.title,
        description: raw.description ?? null,
      } satisfies HetSuggestionItem,
      isFree: raw.isFree ?? true,
    });

    const pools: Record<HetContentKind, Candidate[]> = {
      practice: options.practice
        ? [
            {
              id: options.practice.id,
              tags: options.practice.tags,
              out: {
                kind: 'practice',
                id: options.practice.id,
                slug: null,
                title: options.practice.title,
                description: options.practice.description,
              } satisfies HetSuggestionItem,
              isFree: options.practice.isFree,
            },
          ]
        : [],
      powerDrop: (drops ?? [])
        .map((d) => toItem('powerDrop', d))
        .filter((d) => !options.freeOnly || d.isFree),
      somaticCard: (cards ?? []).map((c) => toItem('somaticCard', c)),
    };

    // The check-in follow-up (when the feature is on and the member answered it). A grow choice reorders
    // the conditions for every kind; a settle choice replaces the list below with Caroline's two.
    const followUp = followUpOfCheckIn(latest);
    const pick: HetPickOptions = {
      capacityScore: latest.capacityScore,
      userKey: userId,
      dayKey: latest.completedDate.toISOString().slice(0, 10),
      preference: hetPreferenceForFollowUp(latest.capacityScore, followUp),
    };
    // The website cannot open PowerDrops, so there the PowerDrop's place goes to a second Somatic Card
    // (same ranking, never the same card twice). The app keeps the usual one of each kind.
    const { items, condition } = pickHetSuggestions(
      pools,
      pick,
      3,
      options.surface === 'web' ? { powerDrop: 0, somaticCard: 2 } : {},
    );

    if (isSettleFollowUp(followUp) && FOLLOW_UP_ROUTING) {
      const rows = (await sanityFetch<FollowUpRaw[]>(CHECKIN_FOLLOW_UP_ITEMS_QUERY)) ?? [];
      const candidates: SettleCandidate[] = rows.map((r) => ({
        kind: r.kind,
        slug: r.slug,
        patterns: r.patterns ?? [],
        isFree: r.isFree ?? true,
        out: {
          kind: r.kind,
          id: r.id,
          slug: r.slug,
          title: r.title,
          description: r.description ?? null,
        },
      }));
      // The answer-only brief items, used only to fill a gap behind the named practices.
      const fallback: SettleCandidate[] = items
        .filter((s) => s.kind !== 'practice')
        .map((s) => ({
          kind: s.kind as 'somaticCard' | 'powerDrop',
          slug: s.item.out.slug ?? s.item.id,
          patterns: [],
          isFree: true,
          out: s.item.out,
        }));
      const settle = pickSettleItems({
        routing: FOLLOW_UP_ROUTING,
        followUp,
        candidates,
        fallback,
        freeOnly: options.freeOnly,
        surface: options.surface,
        userKey: pick.userKey,
        dayKey: pick.dayKey,
      });
      // No named practice is shown as "answering to" a condition: a feeling is not one.
      if (settle.length > 0) return { condition: null, items: settle.map((c) => c.out) };
    }
    return { condition, items: items.map((s) => s.item.out) };
  } catch (error) {
    console.error('[het-suggestions] failed:', error);
    return NONE;
  }
}
