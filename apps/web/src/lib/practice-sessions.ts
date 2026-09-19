/**
 * Pure helpers backing Practice History's session logic (see
 * packages/db/src/schema/practice-completions.ts's own comment on the
 * event/session model this supports). Kept free of any DB access
 * specifically so the actual decision rules can be tested directly
 * against plain data, not only indirectly through a live database.
 */

export interface CompletionRowLike {
  completed: boolean;
  updatedAt: Date;
}

/**
 * Whether a completion POST should update `mostRecent` (the
 * most-recently-touched row for this member+practice) rather than start a
 * brand-new session row. See POST /api/v1/practices/[id]/complete's own
 * comment for the full reasoning; in short:
 *
 * - No prior row at all -> false (nothing to reuse).
 * - The prior row is still in progress (`completed: false`) -> true (this
 *   request continues that same session, whether it's another progress
 *   save or the completion that finishes it).
 * - The prior row is already completed, and this request is ALSO a
 *   completion, submitted within `duplicateWindowMs` of the prior one ->
 *   true (an accidental repeat of the same submission, not a new
 *   session).
 * - Anything else (a completed prior row, and either this request isn't
 *   a completion, or enough time has passed) -> false. A genuinely new
 *   session should never silently overwrite a past one.
 */
export function shouldReuseCompletionRow(
  mostRecent: CompletionRowLike | undefined,
  isCompletingNow: boolean,
  now: Date,
  duplicateWindowMs: number,
): boolean {
  if (!mostRecent) return false;
  if (mostRecent.completed === false) return true;
  return isCompletingNow && now.getTime() - mostRecent.updatedAt.getTime() < duplicateWindowMs;
}

/**
 * Splits a "fetched `limit + 1` rows" result (the existing
 * getCheckInHistory/getPracticeHistory convention) into the page to
 * return and whether there's another page after it - without an extra
 * `COUNT(*)` query. Pure so the exact boundary (does the page ever
 * duplicate or drop a row?) can be tested directly against plain arrays.
 */
export function paginateRows<T>(rows: T[], limit: number): { page: T[]; hasMore: boolean } {
  return {
    page: rows.slice(0, limit),
    hasMore: rows.length > limit,
  };
}
