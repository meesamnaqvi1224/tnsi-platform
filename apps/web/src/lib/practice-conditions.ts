import type { Tint } from '@/components/dashboard/membership/membership-visuals';

/**
 * Caroline Reed's Five Developmental Conditions (Human Expansion Theory™),
 * stored on a practice as plain tags: any tag matching one of these names is a
 * condition, and the first one is the practice's primary condition. They are a
 * different taxonomy from the capacity-routing `category` that drives the daily
 * recommendation, and are never used for it.
 */
export const CONDITIONS = [
  'Safety',
  'Capacity',
  'Availability',
  'Expansion',
  'Participation',
] as const;

export type Condition = (typeof CONDITIONS)[number];

/** One soft colour per condition, used the same way on every card, chip and filter. */
export const CONDITION_TINT: Record<Condition, Tint> = {
  Safety: 'sage',
  Capacity: 'dusk',
  Availability: 'sand',
  Expansion: 'clay',
  Participation: 'mist',
};

/** The conditions among a practice's tags, in tag order, matched case-insensitively and without repeats. */
export function conditionsOf(tags: readonly string[]): Condition[] {
  const found: Condition[] = [];
  for (const tag of tags) {
    const match = CONDITIONS.find(
      (condition) => condition.toLowerCase() === tag.trim().toLowerCase(),
    );
    if (match && !found.includes(match)) found.push(match);
  }
  return found;
}

/** The first condition tag, or `null` when the practice carries none. */
export function primaryCondition(tags: readonly string[]): Condition | null {
  return conditionsOf(tags)[0] ?? null;
}

/** A request value that is exactly one of the five conditions, else `undefined` (a stale or mistyped link is no filter). */
export function parseCondition(value: string | undefined): Condition | undefined {
  return CONDITIONS.find((condition) => condition === value);
}

/** Thumbnails next/image is configured to serve (see next.config.ts); anything else is skipped rather than shown broken. */
export function displayableThumbnail(url: string | null | undefined): string | null {
  return url && url.startsWith('https://cdn.sanity.io/images/') ? url : null;
}
