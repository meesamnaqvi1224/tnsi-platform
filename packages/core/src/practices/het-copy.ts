import { HET_CONDITIONS, type HetCondition, type HetContentKind } from './het-recommendation';

/**
 * The one-line reason shown with the first suggestion, in the app and on the website. Wording
 * approved by Caroline (18 Nov 2026): plain, no diagnosis and no promised outcome. Participation has
 * no line - a single feelings answer does not point at it - so it, and a condition we do not
 * recognise, fall back to the neutral line.
 */
const WHY_BY_CONDITION: Partial<Record<HetCondition, string>> = {
  Safety: 'Chosen to help you find steadiness and support in this moment.',
  Capacity: 'Chosen to help you pace yourself and recover.',
  Availability: "Chosen to help you notice and reconnect with what's here.",
  Expansion: 'Chosen to help you take a small, supported step beyond the familiar.',
};

export const HET_WHY_FALLBACK = 'Chosen to match how you described your capacity today.';

export function hetWhyLine(condition: string | null | undefined): string {
  const known = HET_CONDITIONS.find((c) => c.toLowerCase() === condition?.trim().toLowerCase());
  return (known && WHY_BY_CONDITION[known]) || HET_WHY_FALLBACK;
}

/** What each kind of suggestion is called to a member. */
export const HET_KIND_LABEL: Record<HetContentKind, string> = {
  practice: 'Guided practice',
  powerDrop: 'PowerDrop',
  somaticCard: 'Somatic card',
};
