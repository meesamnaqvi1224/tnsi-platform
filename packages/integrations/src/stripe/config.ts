/**
 * Stripe environment configuration. Every value is read once, here, and
 * nowhere else in this package — no other module reaches into
 * `process.env` directly, so the actual Price IDs a checkout can purchase
 * are entirely a server-side deployment detail, never something a client
 * can influence or a value hardcoded in source.
 *
 * Mirrors packages/cms/src/env.ts's shape: everything optional at the type
 * level, with the caller (getStripeConfig) responsible for failing loudly
 * when a required value is actually missing at the point of use, rather
 * than this module throwing at import time and breaking every route that
 * merely imports it (most of this app's pages don't touch billing at all).
 */

import type { PurchasableTier } from './tier-mapping';

export interface StripeConfig {
  secretKey: string;
  webhookSecret: string;
  priceIds: Record<PurchasableTier, string | undefined>;
}

/** Thrown by `getStripeConfig` when a value required for the caller's specific operation is missing. */
export class StripeConfigError extends Error {}

function readPriceIds(): Record<PurchasableTier, string | undefined> {
  return {
    monthly: process.env.STRIPE_PRICE_ID_MONTHLY || undefined,
    annual: process.env.STRIPE_PRICE_ID_ANNUAL || undefined,
    lifetime: process.env.STRIPE_PRICE_ID_LIFETIME || undefined,
  };
}

/**
 * Reads Stripe config from the environment. Never throws itself — a
 * missing `secretKey`/`webhookSecret` becomes an empty string, and a
 * missing price id becomes `undefined` in `priceIds`. Callers that
 * actually need a specific value (creating a client, verifying a webhook,
 * resolving a tier to a price) are responsible for checking it and raising
 * `StripeConfigError` themselves — see `getStripeClient` and
 * `resolvePriceId` for the two real enforcement points.
 */
export function getStripeConfig(): StripeConfig {
  return {
    secretKey: process.env.STRIPE_SECRET_KEY || '',
    webhookSecret: process.env.STRIPE_WEBHOOK_SECRET || '',
    priceIds: readPriceIds(),
  };
}
