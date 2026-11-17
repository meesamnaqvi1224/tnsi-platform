/**
 * The Google Analytics 4 measurement ID, read from public configuration.
 *
 * A GA4 measurement ID is a public identifier (it is visible in the page source
 * of any site that uses it), not a secret - which is why it may live in a
 * `NEXT_PUBLIC_*` variable. It must still be configuration, not a literal in
 * the component, so the property can change without a code change.
 *
 * FAIL CLOSED: when the variable is missing or is not a well-formed GA4 ID,
 * analytics is simply off - no script, no consent banner, no cookies. A typo
 * must never be able to break the site or silently start tracking.
 */
const GA_MEASUREMENT_ID_PATTERN = /^G-[A-Z0-9]{4,20}$/;

export function parseMeasurementId(raw: string | null | undefined): string | undefined {
  const value = raw?.trim();
  return value && GA_MEASUREMENT_ID_PATTERN.test(value) ? value : undefined;
}

/**
 * Next only inlines `NEXT_PUBLIC_*` variables written as a literal
 * `process.env.NEXT_PUBLIC_...` expression, so this must not be indirected.
 */
export const GA_MEASUREMENT_ID = parseMeasurementId(process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID);
