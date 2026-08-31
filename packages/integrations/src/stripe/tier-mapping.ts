/**
 * Pure mapping functions between Stripe's vocabulary and this repo's own
 * `entitlements` schema (packages/db/src/schema/enums.ts). No Stripe SDK
 * calls, no env access, no I/O — every value comes in as a parameter, so
 * these are fully unit-testable and safe to call from either the checkout
 * path or the webhook path without duplicating the mapping logic between
 * them.
 */

/** The exact same 4 values as `entitlement_tier` in Postgres. Deliberately duplicated rather than imported from `@tnsi/db` — this package has no dependency on the database package, matching the pattern already used for `packages/cms`'s webhook schema. */
export const ENTITLEMENT_TIERS = ['free', 'monthly', 'annual', 'lifetime'] as const;
export type EntitlementTier = (typeof ENTITLEMENT_TIERS)[number];

/** The purchasable tiers — `free` has no Stripe Price and is never a checkout target. */
export const PURCHASABLE_TIERS = ['monthly', 'annual', 'lifetime'] as const;
export type PurchasableTier = (typeof PURCHASABLE_TIERS)[number];

export function isPurchasableTier(value: string): value is PurchasableTier {
  return (PURCHASABLE_TIERS as readonly string[]).includes(value);
}

/** The exact same 5 values as `entitlement_status` in Postgres. */
export const ENTITLEMENT_STATUSES = [
  'active',
  'past_due',
  'canceled',
  'trialing',
  'expired',
] as const;
export type EntitlementStatus = (typeof ENTITLEMENT_STATUSES)[number];

/**
 * `monthly`/`annual` are recurring — Stripe Checkout needs `mode: 'subscription'`.
 * `lifetime` is a one-time purchase (no recurring interval exists for it
 * anywhere in this repo) — Checkout needs `mode: 'payment'`. This is a
 * technical consequence of `lifetime` already existing in the tier enum,
 * not a new business rule: a "lifetime" tier can only sensibly be sold as
 * a one-time charge.
 */
export function checkoutModeForTier(tier: PurchasableTier): 'subscription' | 'payment' {
  return tier === 'lifetime' ? 'payment' : 'subscription';
}

/**
 * Resolves a purchasable tier to its configured Stripe Price ID. Returns
 * `null` (never an invented ID) when that tier's env var isn't set — the
 * caller must treat that as "not currently purchasable," not fall back to
 * guessing a price. This is the one function a checkout request's
 * client-supplied `tier` string passes through before anything is sent to
 * Stripe, so a client can never cause an arbitrary/unconfigured price to
 * be charged.
 */
export function resolvePriceId(
  tier: PurchasableTier,
  priceIds: Record<PurchasableTier, string | undefined>,
): string | null {
  return priceIds[tier] || null;
}

/**
 * The inverse lookup, used by the webhook path: given the Price ID Stripe
 * actually charged (never trusted from the client — this comes from the
 * verified webhook event itself), find which of our tiers it corresponds
 * to. Returns `null` for a price ID that doesn't match any configured
 * tier (e.g. a Price created directly in the Stripe dashboard for
 * something this app doesn't know about) — the caller must not guess a
 * tier in that case.
 */
export function mapPriceIdToTier(
  priceId: string,
  priceIds: Record<PurchasableTier, string | undefined>,
): PurchasableTier | null {
  for (const tier of PURCHASABLE_TIERS) {
    if (priceIds[tier] && priceIds[tier] === priceId) return tier;
  }
  return null;
}

/**
 * Maps a Stripe Subscription `status` to our `entitlement_status` enum.
 * Every Stripe status is accounted for explicitly rather than falling
 * through a default, so a future Stripe status this repo doesn't know
 * about yet is a visible decision (`expired`, the safe/non-eligible
 * choice — see `authorizeEntitlement`'s `past_due`/`canceled` reasoning in
 * packages/auth) rather than a silent one:
 *
 * - `active`, `trialing` map 1:1.
 * - `past_due` maps 1:1.
 * - `canceled` maps 1:1.
 * - `unpaid` (Stripe's dunning has exhausted retries but the subscription
 *   object still exists) is treated the same as `past_due` — a payment
 *   problem, not yet a confirmed cancellation.
 * - `incomplete`/`incomplete_expired` (the first invoice was never paid —
 *   the subscription never actually became active) and `paused` all map
 *   to `expired`: none of them represent a state that should grant
 *   access, and `expired` is the existing enum value closest to "this
 *   subscription does not currently entitle anything."
 */
export function mapStripeSubscriptionStatus(stripeStatus: string): EntitlementStatus {
  switch (stripeStatus) {
    case 'active':
      return 'active';
    case 'trialing':
      return 'trialing';
    case 'past_due':
    case 'unpaid':
      return 'past_due';
    case 'canceled':
      return 'canceled';
    case 'incomplete':
    case 'incomplete_expired':
    case 'paused':
    default:
      return 'expired';
  }
}
