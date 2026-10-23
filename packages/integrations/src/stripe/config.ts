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

/**
 * Whether billing is fully configured for the approved plans: the secret key,
 * the webhook secret, and a Price for BOTH the monthly and annual plan. Reports
 * only yes/no - it never returns or logs a value. A missing piece means no
 * checkout may be offered.
 */
export function isMembershipCheckoutConfigured(): boolean {
  const { secretKey, webhookSecret, priceIds } = getStripeConfig();
  return Boolean(secretKey && webhookSecret && priceIds.monthly && priceIds.annual);
}

/**
 * Whether Regulation Suite membership is open for purchase: deliberately
 * launched (`REGULATION_SUITE_MEMBERSHIP_OPEN` is exactly the string "true" -
 * unset, empty, "TRUE", "1", " true" and anything else are closed) AND billing
 * fully configured. This is the single definition; `createCheckoutSession`
 * enforces it itself, so no caller can start a purchase while it is closed.
 */
export function isMembershipOpen(): boolean {
  return (
    process.env.REGULATION_SUITE_MEMBERSHIP_OPEN === 'true' && isMembershipCheckoutConfigured()
  );
}

/**
 * Optional id of a restricted Stripe Billing Portal configuration (one that
 * allows payment methods, cancellation, invoices and billing history but NOT
 * plan switching or products the app does not sell). When set, every portal
 * session uses it; when unset Stripe uses the account's default configuration,
 * which has not been inspected. Returns undefined, never an empty string.
 */
export function getPortalConfigurationId(): string | undefined {
  return process.env.STRIPE_PORTAL_CONFIGURATION_ID || undefined;
}
