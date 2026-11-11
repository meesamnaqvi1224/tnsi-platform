import { getAnalyticsController } from '@/lib/analytics-controller';
import type { UtmParams } from '@/lib/utm';

/**
 * Client-side GA4 custom events, sent through the consent controller
 * (lib/analytics-controller.ts). A no-op unless the visitor has accepted
 * analytics and Google Analytics is running (rejected, not yet chosen,
 * withdrawn, blocked, or server-side) - analytics must never break the page
 * that calls it, and an event must never be sent without consent.
 */
export type AnalyticsParams = Record<string, string | number | boolean | undefined>;

export function trackEvent(name: string, params: AnalyticsParams = {}): void {
  if (typeof window === 'undefined') return;
  try {
    getAnalyticsController().track(name, params);
  } catch {
    // Never let analytics surface an error to the user.
  }
}

export type { UtmParams } from '@/lib/utm';

/**
 * Campaign (UTM) parameters for this visit, for attributing a campaign through
 * to an email sign-up.
 *
 * CONSENT-GATED: the parameters are read from the landing URL into memory only.
 * Until the visitor accepts analytics this returns `{}` and nothing is written
 * to storage; once they accept, the parameters are kept in `sessionStorage` for
 * the tab session so attribution survives in-app navigation. Rejecting or
 * withdrawing clears them. See lib/analytics-controller.ts.
 */
export function getUtmParams(): UtmParams {
  if (typeof window === 'undefined') return {};
  try {
    return getAnalyticsController().getCampaignParams();
  } catch {
    return {};
  }
}
