import { CONDITION_NAMES, type ConditionName } from '@/content/human-expansion-theory';

/**
 * A practice belongs to a Developmental Condition through its tags, exactly as on the website
 * (apps/web/src/lib/practice-conditions.ts): any tag matching a condition name, ignoring case and
 * spacing, is that condition, and the first one is the practice's primary condition. This is a
 * different taxonomy from the capacity-routing `category` that drives the daily recommendation, and
 * it is never used for it. New practices join a condition by being tagged in the CMS - nothing here
 * depends on how many practices exist.
 */
export function conditionsOf(tags: readonly string[]): ConditionName[] {
  const found: ConditionName[] = [];
  for (const tag of tags) {
    const match = CONDITION_NAMES.find((name) => name.toLowerCase() === tag.trim().toLowerCase());
    if (match && !found.includes(match)) found.push(match);
  }
  return found;
}

export function primaryCondition(tags: readonly string[]): ConditionName | null {
  return conditionsOf(tags)[0] ?? null;
}

/** A route value that is exactly one of the five conditions, else `null` (a stale link is not a condition). */
export function parseCondition(value: string | undefined): ConditionName | null {
  return CONDITION_NAMES.find((name) => name === value) ?? null;
}

/** The practices tagged with a condition, in the order given (the server's order). */
export function practicesForCondition<T extends { tags: readonly string[] }>(
  practices: readonly T[],
  condition: ConditionName,
): T[] {
  return practices.filter((practice) => conditionsOf(practice.tags).includes(condition));
}
