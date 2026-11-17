/**
 * Technical defaults for Checkout Session handling. These are ENGINEERING
 * settings, approved by the owner as defaults - they are not commercial policy
 * and not a promise to members. They are kept here, in one place, so they
 * cannot drift apart between the code that creates sessions and the code that
 * reasons about them.
 */

/**
 * How far back a COMPLETED Checkout Session is looked for when a member starts a
 * new checkout, to apply a purchase the webhook has not recorded yet. It is a
 * reconciliation lookback only: it is not an entitlement window, and it does not
 * say how long a session stays valid.
 */
export const CHECKOUT_RECONCILIATION_LOOKBACK_MS = 24 * 60 * 60 * 1000;

/**
 * How long an UNPAID session stays payable before Stripe expires it by itself
 * (abandoned checkouts). Stripe requires at least 30 minutes; one extra minute
 * keeps clear of that bound. TO CONFIRM against real Stripe test-mode behaviour
 * before release - until then this is an unverified assumption.
 */
export const CHECKOUT_ABANDONED_SESSION_TTL_MINUTES = 31;
