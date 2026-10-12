/**
 * Client-side GA4 custom events through the site's existing `gtag`
 * install (components/seo/google-analytics.tsx). A no-op when gtag hasn't
 * loaded (blocked, not yet ready, or server-side) - analytics must never
 * break the page that calls it.
 */
export type AnalyticsParams = Record<string, string | number | boolean | undefined>;

export function trackEvent(name: string, params: AnalyticsParams = {}): void {
  if (typeof window === 'undefined' || typeof window.gtag !== 'function') return;
  try {
    window.gtag('event', name, params);
  } catch {
    // Never let analytics surface an error to the user.
  }
}

const UTM_KEYS = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content'] as const;
const UTM_STORAGE_KEY = 'tnsi-utm';

export type UtmParams = Partial<Record<(typeof UTM_KEYS)[number], string>>;

/**
 * UTM parameters for this visit: read from the landing URL and kept in
 * sessionStorage, so an ad click is still attributed after the URL loses
 * its query string (in-app navigation, "Practise again"). Lets campaigns
 * be measured through to email sign-up.
 */
export function getUtmParams(): UtmParams {
  if (typeof window === 'undefined') return {};
  const fromUrl: UtmParams = {};
  const search = new URLSearchParams(window.location.search);
  for (const key of UTM_KEYS) {
    const value = search.get(key);
    if (value) fromUrl[key] = value.slice(0, 200);
  }
  try {
    if (Object.keys(fromUrl).length > 0) {
      sessionStorage.setItem(UTM_STORAGE_KEY, JSON.stringify(fromUrl));
      return fromUrl;
    }
    const stored = sessionStorage.getItem(UTM_STORAGE_KEY);
    return stored ? (JSON.parse(stored) as UtmParams) : {};
  } catch {
    return fromUrl;
  }
}
