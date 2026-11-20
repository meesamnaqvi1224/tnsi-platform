import { primaryCondition } from './conditions';
import type { CheckIn, HomeSuggestion, HomeSuggestionKind, HomeSuggestions } from '@/api/types';
import type { ConditionName } from '@/content/human-expansion-theory';

import { HET_KIND_LABEL, hetWhyLine } from '@tnsi/core';

export function conditionOf(value: string | null | undefined): ConditionName | null {
  return value ? primaryCondition([value]) : null;
}

/** The approved one-line reason under the first suggestion. The wording lives in `@tnsi/core`, shared with the website. */
export const whyLine = hetWhyLine;

export const KIND_LABEL: Record<HomeSuggestionKind, string> = HET_KIND_LABEL;

export type HomeSuggestionsView = {
  hero: HomeSuggestion;
  more: HomeSuggestion[];
  /** "If you have more time" when the first item is a brief one, otherwise "Or, something shorter". */
  moreHeading: string;
  condition: ConditionName | null;
};

/**
 * What Home shows from the server's `suggestions`: the first item as the hero and the rest, in the
 * server's order, as small rows. A suggestion belongs to a check-in made today (like the single
 * recommendation, see check-in-day.ts), so until the member checks in today there is none. Returns
 * null for "nothing to show", and Home then keeps its existing single-practice card.
 */
export function suggestionsViewForToday(
  checkIn: CheckIn | null | undefined,
  suggestions: HomeSuggestions | null | undefined,
): HomeSuggestionsView | null {
  if (!checkIn || !suggestions || suggestions.items.length === 0) return null;
  const [hero, ...more] = suggestions.items;
  if (!hero) return null;
  return {
    hero,
    more,
    moreHeading: hero.kind === 'practice' ? 'Or, something shorter' : 'If you have more time',
    condition: conditionOf(suggestions.condition),
  };
}

/** The label on the hero's action. A guided practice the plan does not include says "View". */
export function startLabel(kind: HomeSuggestionKind, locked: boolean): string {
  if (kind === 'practice') return locked ? 'View practice' : 'Start practice';
  return kind === 'powerDrop' ? 'Start now' : 'Open card';
}
