/**
 * Campaign (UTM) parameters: parsing and sanitising only. Whether they may be
 * kept or sent anywhere is decided by the analytics consent controller
 * (lib/analytics-controller.ts), never here.
 */
export const UTM_KEYS = [
  'utm_source',
  'utm_medium',
  'utm_campaign',
  'utm_term',
  'utm_content',
] as const;

/** `sessionStorage` key. Written only after the visitor has accepted analytics. */
export const UTM_STORAGE_KEY = 'tnsi-utm';

export const UTM_MAX_LENGTH = 200;

export type UtmParams = Partial<Record<(typeof UTM_KEYS)[number], string>>;

/** The five known campaign parameters from a query string; everything else is ignored. */
export function parseUtmFromSearch(search: string): UtmParams {
  const params = new URLSearchParams(search);
  const found: UtmParams = {};
  for (const key of UTM_KEYS) {
    const value = params.get(key);
    if (value) found[key] = value.slice(0, UTM_MAX_LENGTH);
  }
  return found;
}

/**
 * Keeps only known keys with non-empty string values, cut to the maximum
 * length. Used on anything read back from storage, which a visitor (or an
 * extension) can edit.
 */
export function sanitiseUtm(value: unknown): UtmParams {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return {};
  const record = value as Record<string, unknown>;
  const clean: UtmParams = {};
  for (const key of UTM_KEYS) {
    const entry = record[key];
    if (typeof entry === 'string' && entry) clean[key] = entry.slice(0, UTM_MAX_LENGTH);
  }
  return clean;
}

export function hasUtm(params: UtmParams): boolean {
  return Object.keys(params).length > 0;
}
