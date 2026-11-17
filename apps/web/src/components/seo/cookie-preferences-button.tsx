'use client';

import { GA_MEASUREMENT_ID } from '@/lib/analytics-config';
import { getAnalyticsController } from '@/lib/analytics-controller';
import { rememberPreferencesTrigger } from '@/components/seo/cookie-consent';

/**
 * Footer control that reopens the analytics choice, so a visitor can review it
 * or withdraw consent at any time. Rendered only when analytics is configured:
 * with no measurement ID there is nothing to choose, so no control is shown
 * (the value is inlined at build time, so server and client always agree).
 */
export function CookiePreferencesButton({ className }: { className?: string }) {
  if (!GA_MEASUREMENT_ID) return null;
  return (
    <button
      type="button"
      data-cookie-preferences=""
      className={className}
      onClick={(event) => {
        rememberPreferencesTrigger(event.currentTarget);
        getAnalyticsController().openPreferences();
      }}
    >
      Cookie preferences
    </button>
  );
}
