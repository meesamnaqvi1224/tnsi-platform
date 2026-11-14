'use client';

import { useEffect, useRef } from 'react';
import Script from 'next/script';
import { usePathname } from 'next/navigation';
import {
  ANALYTICS_EXCLUDED_PATH_PREFIXES,
  isAnalyticsExcludedPath,
} from '@/lib/analytics-exclusions';

const GA_MEASUREMENT_ID = 'G-233HWVPKCK';

/** GA's documented per-property opt-out switch: while `window['ga-disable-<id>']` is true, gtag sends nothing. */
const GA_DISABLE_KEY = `ga-disable-${GA_MEASUREMENT_ID}`;

declare global {
  interface Window {
    dataLayer: unknown[];
    gtag: (...args: unknown[]) => void;
    [key: `ga-disable-${string}`]: boolean | undefined;
  }
}

/**
 * Base GA4 installation - gtag.js loads once (afterInteractive, so it never
 * blocks first paint) and configures the property once, both in this one
 * component mounted from the root layout. App Router client-side navigation
 * doesn't trigger a new page load, so gtag's own automatic pageview never
 * fires again after the first - this effect re-sends `config` with the new
 * page_path on every route change instead, skipping the initial mount so
 * the first pageview isn't counted twice.
 */
export function GoogleAnalytics() {
  const pathname = usePathname();
  const isFirstRender = useRef(true);

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    // Journal / reflection pages are never reported: switch GA off for them, and back on when the
    // member moves to any other page (whose pageview is then sent as before).
    const excluded = isAnalyticsExcludedPath(pathname);
    window[GA_DISABLE_KEY] = excluded;
    if (excluded) return;
    if (typeof window.gtag !== 'function') return;
    window.gtag('config', GA_MEASUREMENT_ID, { page_path: pathname });
  }, [pathname]);

  return (
    <>
      <Script
        src={`https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`}
        strategy="afterInteractive"
      />
      <Script id="ga4-init" strategy="afterInteractive">
        {`
          // Decided BEFORE the first config call: if the page this visit starts on is a private
          // journal page, GA is switched off first so not even the automatic first pageview is sent.
          var gaPath = window.location.pathname;
          window['${GA_DISABLE_KEY}'] = ${JSON.stringify(ANALYTICS_EXCLUDED_PATH_PREFIXES)}.some(function (prefix) {
            return gaPath === prefix || gaPath.indexOf(prefix + '/') === 0;
          });
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          window.gtag = gtag;
          gtag('js', new Date());
          gtag('config', '${GA_MEASUREMENT_ID}');
        `}
      </Script>
    </>
  );
}
