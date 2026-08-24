'use client';

import * as React from 'react';
import { FlowiBookingFallback } from '@/components/discovery-call/flowi-booking-fallback';

/**
 * The existing, already-live TNSI booking widget, hosted by Flowi. Public
 * URL, not a secret — safe to inline directly rather than an env var (no
 * architectural reason exists to make this configurable).
 */
const FLOWI_BOOKING_URL = 'https://link.flowi.io/widget/booking/BzelZstBijzA9lnwjIV2';

/**
 * Plain iframe embed — no third-party embed script. `onError` only catches
 * genuine network-level load failures (blocked request, DNS/connection
 * failure), not "loaded successfully but Flowi itself returned an error
 * page" — full failure detection would need Flowi's own embed script or a
 * cross-origin postMessage contract, neither of which exists here; this is
 * the honest floor of what a same-page iframe can detect on its own.
 */
export function FlowiBookingEmbed() {
  const [hasError, setHasError] = React.useState(false);

  if (hasError) {
    return <FlowiBookingFallback />;
  }

  return (
    <iframe
      title="Book a Discovery Call"
      src={FLOWI_BOOKING_URL}
      onError={() => setHasError(true)}
      loading="lazy"
      className="border-border/60 h-[44rem] w-full min-w-0 rounded-lg border lg:h-[50rem]"
    />
  );
}
