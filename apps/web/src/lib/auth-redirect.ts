import { MEMBERSHIP_PAGE_PATH, PRESELECTABLE_PLANS } from '@/lib/membership-links';

/**
 * Where sign-up and sign-in may send a visitor afterwards, beyond the default.
 *
 * The public Regulation Suite™ page links to `/sign-up?redirect_url=…` so that a
 * visitor lands on the membership page, optionally with a plan preselected. The
 * embedded Clerk components were not honouring that query value, so the two auth
 * pages read it themselves and hand Clerk an explicit destination.
 *
 * A redirect target taken from a URL is untrusted input, so this accepts exactly
 * the two shapes the site itself produces and nothing else:
 *
 *   /dashboard/billing
 *   /dashboard/billing?plan=monthly | /dashboard/billing?plan=annual
 *
 * Anything else - an absolute or protocol-relative URL, another path, extra or
 * unknown query parameters, a fragment, a different casing, encoded or control
 * characters, a list of values, or an over-long value - is rejected, and the
 * caller falls back to its normal destination. Only the exact match is returned,
 * so no part of the input is ever echoed.
 */
const MAX_LENGTH = 64;

const ALLOWED = new RegExp(
  `^${escapeRegExp(MEMBERSHIP_PAGE_PATH)}(?:\\?plan=(?:${PRESELECTABLE_PLANS.join('|')}))?$`,
);

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** The validated destination, or `undefined` when there is none or it is not allowed. */
export function parseAuthRedirect(raw: string | string[] | undefined): string | undefined {
  if (typeof raw !== 'string' || raw.length === 0 || raw.length > MAX_LENGTH) return undefined;
  return ALLOWED.test(raw) ? raw : undefined;
}

function withDestination(path: string, destination: string | undefined): string {
  return destination ? `${path}?redirect_url=${encodeURIComponent(destination)}` : path;
}

/** The sign-in page, carrying a validated destination (URL-encoded) if there is one. */
export function signInUrlFor(destination: string | undefined): string {
  return withDestination('/sign-in', destination);
}

/** The sign-up page, carrying a validated destination (URL-encoded) if there is one. */
export function signUpUrlFor(destination: string | undefined): string {
  return withDestination('/sign-up', destination);
}
