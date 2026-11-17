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
 * caller (see apps/web/src/lib/sync-stripe-entitlement.ts).
 *
 * ## Events identify; Stripe's current state decides
 * Stripe delivers events at least once and in no guaranteed order, and an
 * event's payload is a snapshot that may already be stale when it arrives. So
 * a webhook event is used ONLY to learn WHICH subscription changed
 * (`refresh-subscription`). The executor then reads that subscription's
 * current state from Stripe (the source of truth) while holding the member's
 * row lock, and `planForSubscriptionEvent` below maps THAT state to the row.
 * Replaying a duplicate, delivering a stale event late, or two events racing
 * all end in the same place: the row reflects what Stripe says now. No event
 * timestamp is used to order anything.
 *
 * ## Lifetime
 * There is no plan that grants Lifetime. It was a one-time purchase and is
 * closed to new purchases; a one-time checkout event is skipped with a reason.
 * Existing Lifetime rows are protected by the executor and never written here.
 */

/**
 * What a subscription update does to the payment-failure grace anchor
 * (`entitlements.payment_failed_at`, which drives the approved 7-day grace
 * period — see `PAYMENT_GRACE_PERIOD_DAYS` in @tnsi/auth):
 *
 * - `start` — the subscription is `past_due`: record `at` as the failure
 *   time, but only if none is recorded yet (the executor keeps an existing
 *   value, so repeated failed retries never restart the clock).
 * - `clear` — the subscription is healthy again (`active`/`trialing`).
 * - `keep` — any other state; leave the column alone.
 */
export type PaymentFailureUpdate =
  { action: 'start'; at: Date } | { action: 'clear' } | { action: 'keep' };

export interface SubscriptionSyncValues {
  tier: PurchasableTier;
  status: EntitlementStatus;
  stripeSubscriptionId: string;
  currentPeriodStart: Date | null;
  currentPeriodEnd: Date | null;
  cancelAtPeriodEnd: boolean;
  canceledAt: Date | null;
  paymentFailure: PaymentFailureUpdate;
}

export type EntitlementSyncPlan =
  /** Read the subscription's CURRENT state from Stripe, then apply `planForSubscriptionEvent` to it. `userId` is the checkout metadata hint used only to link a not-yet-linked customer; `eventTime` is Stripe's own timestamp for the triggering event (the grace anchor if the subscription is past due), or null when there is no triggering event (a read-time refresh). */
  | {
      action: 'refresh-subscription';
      subscriptionId: string;
      stripeCustomerId: string;
      userId: string | null;
      eventTime: Date | null;
    }
  /** Authoritative subscription state mapped onto the row. */
  | { action: 'sync-subscription'; stripeCustomerId: string; values: SubscriptionSyncValues }
  /** Nothing safe to do with this event — never guessed at, always explained. */
  | { action: 'skip'; reason: string };

export interface CheckoutSessionCompletedInput {
  mode: string;
  customerId: string | null;
  /** The subscription the session created (subscription mode only). */
  subscriptionId: string | null;
  /** The internal user id we set as Checkout Session metadata at creation time — never client-writable after that point, since the session was created server-side. */
  userId: string | null;
}

export function planForCheckoutSessionCompleted(
  input: CheckoutSessionCompletedInput,
): EntitlementSyncPlan {
  if (input.mode === 'payment') {
    return {
      action: 'skip',
      reason: 'one-time purchases are not accepted: Lifetime is closed to new purchases',
    };
  }
  if (input.mode !== 'subscription') {
    return { action: 'skip', reason: `unsupported checkout mode: ${input.mode}` };
  }
  if (!input.userId) {
    return { action: 'skip', reason: 'checkout session has no userId in metadata' };
  }
  if (!input.customerId) {
    return { action: 'skip', reason: 'checkout session has no customer id' };
  }
  if (!input.subscriptionId) {
    return { action: 'skip', reason: 'checkout session has no subscription id' };
  }
  return {
    action: 'refresh-subscription',
    subscriptionId: input.subscriptionId,
    stripeCustomerId: input.customerId,
    userId: input.userId,
    eventTime: null,
  };
}

export interface SubscriptionLifecycleEventInput {
  customerId: string | null;
  subscriptionId: string;
  /** Stripe's own timestamp for this event (`event.created`). */
  eventTime: Date;
  /** `metadata.userId` on the subscription, when we set one at checkout. */
  userId: string | null;
}

/** `customer.subscription.created` / `.updated` / `.deleted`: refresh that subscription from Stripe. */
export function planForSubscriptionLifecycleEvent(
  input: SubscriptionLifecycleEventInput,
): EntitlementSyncPlan {
  if (!input.customerId) {
    return { action: 'skip', reason: 'subscription event has no customer id' };
  }
  return {
    action: 'refresh-subscription',
    subscriptionId: input.subscriptionId,
    stripeCustomerId: input.customerId,
    userId: input.userId,
    eventTime: input.eventTime,
  };
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
  /** Stripe's own timestamp for this event (`event.created`) — the grace anchor if this is the first sign of a payment problem. Never `new Date()`, so replays are deterministic. */
  eventTime: Date;
}

function paymentFailureUpdateFor(status: EntitlementStatus, eventTime: Date): PaymentFailureUpdate {
  if (status === 'past_due') return { action: 'start', at: eventTime };
  if (status === 'active' || status === 'trialing') return { action: 'clear' };
  return { action: 'keep' };
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

  const status = mapStripeSubscriptionStatus(input.status);

  return {
    action: 'sync-subscription',
    stripeCustomerId: input.customerId,
    values: {
      tier,
      status,
      stripeSubscriptionId: input.subscriptionId,
      currentPeriodStart: input.currentPeriodStart,
      currentPeriodEnd: input.currentPeriodEnd,
      cancelAtPeriodEnd: input.cancelAtPeriodEnd,
      canceledAt: input.canceledAt,
      paymentFailure: paymentFailureUpdateFor(status, input.eventTime),
    },
  };
}

export interface InvoicePaymentFailedInput {
  customerId: string | null;
  subscriptionId: string | null;
  /** Stripe's own timestamp for this event (`event.created`). */
  eventTime: Date;
}

/** `invoice.payment_failed`: refresh the subscription from Stripe; if it is past due, `eventTime` anchors the 7-day grace. */
export function planForInvoicePaymentFailed(input: InvoicePaymentFailedInput): EntitlementSyncPlan {
  if (!input.customerId) {
    return { action: 'skip', reason: 'invoice has no customer id' };
  }
  if (!input.subscriptionId) {
    return { action: 'skip', reason: 'invoice is not associated with a subscription' };
  }
  return {
    action: 'refresh-subscription',
    subscriptionId: input.subscriptionId,
    stripeCustomerId: input.customerId,
    userId: null,
    eventTime: input.eventTime,
  };
}
