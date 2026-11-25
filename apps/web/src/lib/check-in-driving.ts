/**
 * Pure rules for "every check-in drives the suggestions" (active only with the check-in follow-up switch
 * on; see `isCheckInFollowUpEnabled`). No database access here, so each rule is easy to test.
 */

/**
 * The seed day for the rotation. The first check-in of a day keeps its plain date, so a member's pick
 * is exactly what it was before this existed. A later check-in the same day adds its own id, so it
 * rotates to something different instead of repeating the first one's order.
 */
export function drivingDayKey(
  checkIn: { id: string; completedDate: Date; isPrimary: boolean },
  everyCheckInDrives: boolean,
): string {
  const date = checkIn.completedDate.toISOString().slice(0, 10);
  return everyCheckInDrives && !checkIn.isPrimary ? `${date}|${checkIn.id}` : date;
}

/** The ids of what a check-in's suggestions showed, as stored in its metadata. Anything unusable is empty. */
export function suggestedIdsOf(metadata: unknown): string[] {
  if (metadata === null || typeof metadata !== 'object' || Array.isArray(metadata)) return [];
  const suggested = (metadata as Record<string, unknown>).suggested;
  if (suggested === null || typeof suggested !== 'object' || Array.isArray(suggested)) return [];
  const ids = (suggested as Record<string, unknown>).ids;
  return Array.isArray(ids) ? ids.filter((id): id is string => typeof id === 'string') : [];
}

/** The metadata fragment that records what was suggested (merged into the check-in's metadata). */
export function suggestedMetadata(ids: Iterable<string>): { suggested: { ids: string[] } } {
  return { suggested: { ids: [...new Set(ids)] } };
}

/**
 * Prefer content the member has not already been shown today, but never end up with less than the
 * unrestricted result: where nothing new is left for a slot, the earlier item is allowed to repeat.
 *
 * `all` is the pick from the whole pool, `fresh` the pick from what was not shown. Each slot of `all`
 * takes the next unused `fresh` item of the same kind, and keeps its own where there is none.
 */
export function preferFresh<T extends { kind: string; item: { id: string } }>(
  all: readonly T[],
  fresh: readonly T[],
): T[] {
  const queue = new Map<string, T[]>();
  for (const f of fresh) queue.set(f.kind, [...(queue.get(f.kind) ?? []), f]);
  return all.map((a) => queue.get(a.kind)?.shift() ?? a);
}
