import {
  mapPriceIdToTier,
  mapStripeSubscriptionStatus,
  type EntitlementStatus,
  type PurchasableTier,
} from './tier-mapping';

/**
 * Pure decision logic for what a verified Stripe webhook event should do to
 * the `entitlements` table — no database access, no Stripe SDK calls. Every
 * input here is a plain value extracted from the real Stripe event by the
 * caller (see apps/web/src/lib/sync-stripe-entitlement.ts), which mirrors
 * the pattern already established for the Sanity practice webhook
 * (packages/cms/src/webhook/sync-plan.ts): parse/validate → pure decision
 * → thin DB executor → thin route handler.
 *
 * Every plan is a deterministic function of its input, and every DB write
 * the executor performs from a plan is a plain `UPDATE ... WHERE`, never an
 * insert or an increment — replaying the same event twice therefore always
 * produces the same resulting row, which is what makes this safe against
 * Stripe's at-least-once webhook delivery without any separate "have I seen
 * this event id before" bookkeeping.
 */

export interface SubscriptionSyncValues {
  tier: PurchasableTier;
  status: EntitlementStatus;
  stripeSubscriptionId: string;
  currentPeriodStart: Date | null;
  currentPeriodEnd: Date | null;
  cancelAtPeriodEnd: boolean;
  canceledAt: Date | null;
}

export type EntitlementSyncPlan =
  /** First contact from a subscription checkout — links the customer id to our user. The subscription's own status/price/period arrive moments later via `customer.subscription.created`, which is what actually grants access. */
  | { action: 'link-customer'; userId: string; stripeCustomerId: string }
  /** A one-time (lifetime) checkout completed and was paid — grants immediately; there is no ongoing subscription object for a one-time purchase. */
  | { action: 'grant-lifetime'; userId: string; stripeCustomerId: string }
  /** Authoritative subscription state from `customer.subscription.created` / `.updated` / `.deleted` — all three carry a full subscription object, so one plan builder handles all three. */
  | { action: 'sync-subscription'; stripeCustomerId: string; values: SubscriptionSyncValues }
  /** A renewal payment failed — defensive, minimal update (status only); `customer.subscription.updated` normally also fires with the same status change. */
  | { action: 'mark-past-due'; stripeCustomerId: string }
  /** Nothing safe to do with this event — never guessed at, always explained. */
  | { action: 'skip'; reason: string };

export interface CheckoutSessionCompletedInput {
  mode: string;
  customerId: string | null;
  /** The internal user id we set as Checkout Session metadata at creation time — never client-writable after that point, since the session was created server-side. */
  userId: string | null;
  paymentStatus: string;
  /** The price actually purchased, when the webhook payload includes line items. */
  priceId: string | null;
}

export function planForCheckoutSessionCompleted(
  input: CheckoutSessionCompletedInput,
  priceIds: Record<PurchasableTier, string | undefined>,
): EntitlementSyncPlan {
  if (!input.userId) {
    return { action: 'skip', reason: 'checkout session has no userId in metadata' };
  }
  if (!input.customerId) {
    return { action: 'skip', reason: 'checkout session has no customer id' };
  }

  if (input.mode === 'payment') {
    if (input.paymentStatus !== 'paid') {
      return {
        action: 'skip',
        reason: `one-time checkout payment not completed (status: ${input.paymentStatus})`,
      };
    }
    const tier = input.priceId ? mapPriceIdToTier(input.priceId, priceIds) : null;
    if (tier !== 'lifetime') {
      return {
        action: 'skip',
        reason: 'one-time checkout price did not resolve to the lifetime tier',
      };
    }
    return { action: 'grant-lifetime', userId: input.userId, stripeCustomerId: input.customerId };
  }

  if (input.mode === 'subscription') {
    return { action: 'link-customer', userId: input.userId, stripeCustomerId: input.customerId };
  }

  return { action: 'skip', reason: `unsupported checkout mode: ${input.mode}` };
}

export interface SubscriptionEventInput {
  customerId: string | null;
  subscriptionId: string;
  status: string;
  priceId: string | null;
  currentPeriodStart: Date | null;
  currentPeriodEnd: Date | null;
  cancelAtPeriodEnd: boolean;
  canceledAt: Date | null;
}

/**
 * Handles `customer.subscription.created`, `.updated`, and `.deleted`
 * uniformly — all three deliver a full subscription object (a deleted
 * subscription's own `status` is `canceled`), so there's exactly one
 * mapping from "subscription object" to "entitlement row state."
 */
export function planForSubscriptionEvent(
  input: SubscriptionEventInput,
  priceIds: Record<PurchasableTier, string | undefined>,
): EntitlementSyncPlan {
  if (!input.customerId) {
    return { action: 'skip', reason: 'subscription event has no customer id' };
  }

  const tier = input.priceId ? mapPriceIdToTier(input.priceId, priceIds) : null;
  if (!tier) {
    return {
      action: 'skip',
      reason: 'subscription price did not resolve to a known tier — refusing to guess',
    };
  }

  return {
    action: 'sync-subscription',
    stripeCustomerId: input.customerId,
    values: {
      tier,
      status: mapStripeSubscriptionStatus(input.status),
      stripeSubscriptionId: input.subscriptionId,
      currentPeriodStart: input.currentPeriodStart,
      currentPeriodEnd: input.currentPeriodEnd,
      cancelAtPeriodEnd: input.cancelAtPeriodEnd,
      canceledAt: input.canceledAt,
    },
  };
}

export interface InvoicePaymentFailedInput {
  customerId: string | null;
  subscriptionId: string | null;
}

export function planForInvoicePaymentFailed(input: InvoicePaymentFailedInput): EntitlementSyncPlan {
  if (!input.customerId) {
    return { action: 'skip', reason: 'invoice has no customer id' };
  }
  if (!input.subscriptionId) {
    return { action: 'skip', reason: 'invoice is not associated with a subscription' };
  }
  return { action: 'mark-past-due', stripeCustomerId: input.customerId };
}
