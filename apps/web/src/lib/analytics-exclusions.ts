/**
 * Pages that must never be reported to analytics, because what is on them (or in their address) is a
 * member's private writing. A pageview records the page path and URL; a journal screen must not appear
 * there at all, even as an anonymous path. Matching is on a path prefix, so every page under it is covered.
 *
 * The web journal screens arrive in a later PR under /dashboard/reflections; the exclusion lives here
 * first so the protection is in place before the first such page exists. Journal text must also never
 * be placed in a URL or query string - ids only - which is the other half of the same rule.
 */
export const ANALYTICS_EXCLUDED_PATH_PREFIXES = ['/dashboard/reflections'] as const;

/** True for a path that is, or is under, an excluded prefix. `/dashboard/reflections-x` is NOT excluded. */
export function isAnalyticsExcludedPath(pathname: string | null | undefined): boolean {
  if (!pathname) return false;
  return ANALYTICS_EXCLUDED_PATH_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}
