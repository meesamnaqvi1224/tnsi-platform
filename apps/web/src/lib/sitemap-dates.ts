/**
 * Picks the first candidate that is a genuine, usable `lastmod` value.
 *
 * Only real document dates should be passed in (a CMS `_updatedAt` or
 * `publishedAt`) - never a generation/request time, which would misreport every
 * page as freshly modified on each build. A candidate is rejected when it is
 * missing, not strictly ISO 8601, unparseable, or in the future (more than a day ahead of `now`, which
 * allows for clock skew). Returns `undefined` when nothing qualifies, so the
 * sitemap omits `lastmod` instead of guessing.
 */
const FUTURE_TOLERANCE_MS = 24 * 60 * 60 * 1000;

/**
 * Strict ISO 8601 (`2026-09-15` or `2026-09-15T08:30:00Z`, with optional
 * fraction and offset). `new Date()` alone is far too lenient - it happily
 * turns a display label like "June 2026" into 31 May - so the shape is
 * checked first.
 */
const ISO_DATE = /^\d{4}-\d{2}-\d{2}(?:T\d{2}:\d{2}(?::\d{2}(?:\.\d+)?)?(?:Z|[+-]\d{2}:\d{2})?)?$/;

export function reliableLastModified(
  candidates: ReadonlyArray<string | null | undefined>,
  now: Date,
): Date | undefined {
  for (const candidate of candidates) {
    if (!candidate || !ISO_DATE.test(candidate)) continue;
    const date = new Date(candidate);
    if (Number.isNaN(date.getTime())) continue;
    if (date.getTime() > now.getTime() + FUTURE_TOLERANCE_MS) continue;
    return date;
  }
  return undefined;
}
