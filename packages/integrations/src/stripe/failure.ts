/**
 * How a failed Stripe API call is understood, using the Stripe SDK's own
 * error model (`error.type`). Pure - no SDK call, no I/O - so it can be unit
 * tested with constructed errors.
 *
 * The distinction matters for membership: access may be HELD while Stripe is
 * genuinely unavailable (see `resolveMembership`'s `stripeUnreachable`), but
 * it must never be held because of any other kind of failure - a bad API key,
 * a missing object, a rejected request - where Stripe DID answer, or where our
 * own configuration is wrong. Those are not outages.
 *
 *  - `unavailable`: Stripe could not be reached or could not serve the
 *    request right now - a network failure or timeout (`StripeConnectionError`),
 *    a Stripe-side error (`StripeAPIError`), or throttling
 *    (`StripeRateLimitError`).
 *  - `other`: everything else (authentication, permission, invalid request such
 *    as `resource_missing`, idempotency conflicts, cards, unknown errors, and
 *    non-Stripe errors). Treated as a failure to confirm, never as an outage.
 */
export type StripeFailureKind = 'unavailable' | 'other';

const UNAVAILABLE_TYPES = new Set([
  'StripeConnectionError',
  'StripeAPIError',
  'StripeRateLimitError',
]);

export function classifyStripeFailure(error: unknown): StripeFailureKind {
  const type = (error as { type?: unknown } | null)?.type;
  return typeof type === 'string' && UNAVAILABLE_TYPES.has(type) ? 'unavailable' : 'other';
}

/**
 * The parts of a failure that are safe to log: the SDK error type, Stripe's
 * error code, the HTTP status and Stripe's request id. Never the message
 * (which can echo request parameters) or the raw error object.
 */
export function describeStripeFailure(error: unknown): {
  name: string;
  type?: string;
  code?: string;
  statusCode?: number;
  requestId?: string;
} {
  if (!(error instanceof Error)) return { name: 'UnknownError' };
  const e = error as { type?: unknown; code?: unknown; statusCode?: unknown; requestId?: unknown };
  return {
    name: error.name,
    ...(typeof e.type === 'string' ? { type: e.type } : {}),
    ...(typeof e.code === 'string' ? { code: e.code } : {}),
    ...(typeof e.statusCode === 'number' ? { statusCode: e.statusCode } : {}),
    ...(typeof e.requestId === 'string' ? { requestId: e.requestId } : {}),
  };
}
