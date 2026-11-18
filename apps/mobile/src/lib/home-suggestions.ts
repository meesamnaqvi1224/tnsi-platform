import { primaryCondition } from './conditions';
import type { CheckIn, HomeSuggestion, HomeSuggestionKind, HomeSuggestions } from '@/api/types';
import type { ConditionName } from '@/content/human-expansion-theory';

/**
 * The one-line reason shown under the first suggestion. Wording approved by Caroline (18 Nov 2026):
 * plain, no diagnosis and no promised outcome. Participation has no line - a single feelings answer
 * does not point at it - so it, and a condition we do not recognise, fall back to the neutral line.
 */
const WHY_BY_CONDITION: Partial<Record<ConditionName, string>> = {
  Safety: 'Chosen to help you find steadiness and support in this moment.',
  Capacity: 'Chosen to help you pace yourself and recover.',
  Availability: "Chosen to help you notice and reconnect with what's here.",
  Expansion: 'Chosen to help you take a small, supported step beyond the familiar.',
};
const WHY_FALLBACK = 'Chosen to match how you described your capacity today.';

export function conditionOf(value: string | null | undefined): ConditionName | null {
  return value ? primaryCondition([value]) : null;
}

export function whyLine(condition: string | null | undefined): string {
  const known = conditionOf(condition);
  return (known && WHY_BY_CONDITION[known]) || WHY_FALLBACK;
}

export const KIND_LABEL: Record<HomeSuggestionKind, string> = {
  practice: 'Guided practice',
  powerDrop: 'PowerDrop',
  somaticCard: 'Somatic card',
};

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
