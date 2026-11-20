import { sanityFetch } from '@tnsi/cms/server';
import { HET_POWER_DROPS_QUERY, HET_SOMATIC_CARDS_QUERY } from '@tnsi/cms';
import {
  pickHetSuggestions,
  type HetCondition,
  type HetContentKind,
  type HetPickOptions,
} from '@tnsi/core';
import { getLatestCheckIn } from './check-ins';
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
  options: { freeOnly?: boolean; practice: PracticeSummary | null },
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

    const pick: HetPickOptions = {
      capacityScore: latest.capacityScore,
      userKey: userId,
      dayKey: latest.completedDate.toISOString().slice(0, 10),
    };
    const { items, condition } = pickHetSuggestions(pools, pick);
    return { condition, items: items.map((s) => s.item.out) };
  } catch (error) {
    console.error('[het-suggestions] failed:', error);
    return NONE;
  }
}
