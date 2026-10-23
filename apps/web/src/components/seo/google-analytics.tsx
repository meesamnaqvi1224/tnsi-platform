'use client';

import { useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';
import { getAnalyticsController } from '@/lib/analytics-controller';

/**
 * Connects the app to the analytics consent controller; renders nothing itself.
 *
 * Google Analytics is NOT installed here any more. This component only
 *  - reads the visitor's saved choice once, after hydration, and
 *  - reports App Router route changes (client-side navigation does not reload
 *    the page, so GA's own automatic page view fires only for the first load).
 *
 * The controller decides what, if anything, reaches Google: with no saved
 * "accept", no script is loaded and no event is sent. Mounted once, from the
 * root layout.
 */
export function GoogleAnalytics() {
  const pathname = usePathname();
  const firstPath = useRef(pathname);

  // Read the saved choice once. The controller ignores a second call, which
  // matters because React strict mode runs effects twice in development.
  useEffect(() => {
    getAnalyticsController().hydrate(firstPath.current);
  }, []);

  // Every path change, including the first. The controller sends a page view
  // only when analytics is active and the path differs from the last one sent,
  // so the initial mount and an unchanged path never produce a duplicate.
  useEffect(() => {
    getAnalyticsController().routeChanged(pathname);
  }, [pathname]);

  return null;
}
