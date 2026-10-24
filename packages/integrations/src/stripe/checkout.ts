import 'server-only';
import { getStripeClient } from './client';
import { getStripeConfig, isMembershipOpen } from './config';
import { CHECKOUT_ABANDONED_SESSION_TTL_MINUTES } from './checkout-windows';
import {
  checkoutModeForTier,
  isCheckoutTier,
  resolvePriceId,
  type CheckoutTier,
} from './tier-mapping';

/** Thrown when a purchase is attempted while membership is closed or billing is not fully configured. */
export class MembershipClosedError extends Error {}

/** Thrown when the requested tier has no Stripe Price configured yet — never a fabricated fallback price. */
export class UnpurchasableTierError extends Error {}

/**
 * Creates the Stripe customer for a member, exactly once. Called while the
 * caller holds the member's entitlement row lock and persists the returned id
 * before releasing it, so two simultaneous first checkouts cannot create two
 * customers for one person. The idempotency key is a second layer: if the
 * caller crashes after Stripe created the customer but before the id was saved,
 * a retry within Stripe's key window returns the same customer.
 */
export async function ensureStripeCustomer(input: {
  userId: string;
  userEmail: string;
}): Promise<string> {
  // The launch gate lives here too, so no caller can create Stripe objects while closed.
  if (!isMembershipOpen()) {
    throw new MembershipClosedError('Membership is not open.');
  }
  const customer = await getStripeClient().customers.create(
    { email: input.userEmail, metadata: { userId: input.userId } },
    { idempotencyKey: `tnsi-customer:${input.userId}` },
  );
  return customer.id;
}

export interface CreateCheckoutSessionInput {
  tier: CheckoutTier;
  /** Our internal user id — stamped into Checkout Session metadata so the webhook can link the resulting customer/subscription back to this user without ever trusting anything the browser sends. */
  userId: string;
  /** The member's Stripe customer (see `ensureStripeCustomer`). Always supplied, so Checkout never creates a second customer for the same person. */
  stripeCustomerId: string;
  /**
   * Stripe idempotency key for the session. The route derives it from the user,
   * plan and a short time window, so a double-click or a retried request gets the
   * SAME session instead of a second one.
   */
  idempotencyKey: string;
  successUrl: string;
  cancelUrl: string;
}

/**
 * Creates a Stripe Checkout Session for one of the two recurring plans. The
 * price actually charged is resolved entirely server-side from `tier` (a closed
 * enum) — nothing about which product/price gets purchased is ever read from
 * client input beyond which of the two configured plan names was requested.
 *
 * There is deliberately NO trial and no one-time mode: the free trial is
 * app-managed (POST /api/v1/billing/trial) and never involves Stripe, Lifetime
 * is closed to new purchases, so the only thing this can ever start is an
 * explicitly chosen paid subscription, charged from the start.
 */
export async function createCheckoutSession(
  input: CreateCheckoutSessionInput,
): Promise<{ url: string; sessionId: string }> {
  // The launch gate and the plan allow-list are enforced here, not only in the
  // route, so no caller can reach Stripe while closed or ask for Lifetime.
  if (!isMembershipOpen()) {
    throw new MembershipClosedError('Membership is not open.');
  }
  if (!isCheckoutTier(input.tier)) {
    throw new UnpurchasableTierError(`The "${String(input.tier)}" tier cannot be purchased.`);
  }
  const { priceIds } = getStripeConfig();
  const priceId = resolvePriceId(input.tier, priceIds);
  if (!priceId) {
    throw new UnpurchasableTierError(
      `No Stripe price is configured for the "${input.tier}" tier yet.`,
    );
  }

  const session = await getStripeClient().checkout.sessions.create(
    {
      mode: checkoutModeForTier(input.tier),
      customer: input.stripeCustomerId,
      client_reference_id: input.userId,
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: input.successUrl,
      cancel_url: input.cancelUrl,
      // `tier` lets a later request recognise an open session for the same plan and reuse it.
      metadata: { userId: input.userId, tier: input.tier },
      // An abandoned session stops being payable after a short time (see
      // checkout-windows.ts - an engineering default, not member-facing policy).
      expires_at: Math.floor(Date.now() / 1000) + CHECKOUT_ABANDONED_SESSION_TTL_MINUTES * 60,
      // Stamped on the subscription itself too (not just the session) so later
      // `customer.subscription.*` events — which don't carry the checkout
      // session's own metadata — can still be traced back to a user.
      subscription_data: { metadata: { userId: input.userId } },
    },
    { idempotencyKey: input.idempotencyKey },
  );

  if (!session.url) {
    throw new Error('Stripe did not return a Checkout Session URL.');
  }

  return { url: session.url, sessionId: session.id };
}
