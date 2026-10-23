import 'server-only';
import { getStripeClient } from './client';
import { getStripeConfig, isMembershipOpen } from './config';
import {
  checkoutModeForTier,
  isCheckoutTier,
  resolvePriceId,
  type CheckoutTier,
} from './tier-mapping';

/** Thrown when a purchase is attempted while membership is closed or billing is not fully configured. */
export class MembershipClosedError extends Error {}

/** Thrown when the requested tier has no Stripe Price configured yet - never a fabricated fallback price. */
export class UnpurchasableTierError extends Error {}

/** Thrown when Stripe already holds a live subscription for this customer. */
export class AlreadySubscribedError extends Error {}

/** Thrown when an identical checkout request is already being processed. */
export class CheckoutInProgressError extends Error {}

/** Subscription states that count as "already a member": a second subscription must not be started. */
const LIVE_SUBSCRIPTION_STATUSES: ReadonlySet<string> = new Set([
  'active',
  'trialing',
  'past_due',
  'unpaid',
  'incomplete',
  'paused',
]);

/** Abandoned checkouts expire after 30 minutes (Stripe's minimum) rather than lingering for 24 hours. */
const SESSION_LIFETIME_SECONDS = 30 * 60;
/** Identical requests inside this window share one idempotency key. */
const IDEMPOTENCY_WINDOW_MS = 5 * 60 * 1000;

export interface CreateCheckoutSessionInput {
  tier: CheckoutTier;
  /** Our internal user id - stamped into Checkout Session metadata so the webhook can link the resulting customer/subscription back to this user without ever trusting anything the browser sends. */
  userId: string;
  /** The user's Stripe customer (see `ensureStripeCustomer`). Always supplied so duplicate-subscription checks can be made against Stripe itself. */
  stripeCustomerId: string;
  successUrl: string;
  cancelUrl: string;
}

/**
 * Creates (or finds) the one Stripe customer for a user. The idempotency key
 * is derived from the user id, so concurrent first requests resolve to the same
 * customer instead of creating two.
 */
export async function ensureStripeCustomer(input: {
  userId: string;
  email: string;
}): Promise<string> {
  if (!isMembershipOpen()) {
    throw new MembershipClosedError('Membership is not open.');
  }
  const customer = await getStripeClient().customers.create(
    { email: input.email, metadata: { userId: input.userId } },
    { idempotencyKey: `customer:${input.userId}` },
  );
  return customer.id;
}

function isIdempotencyError(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    (error as { type?: unknown }).type === 'StripeIdempotencyError'
  );
}

/**
 * Creates a Stripe Checkout Session for one of the approved plans. The price
 * is resolved entirely server-side from `tier` (a closed enum).
 *
 * Duplicate-subscription protection, all server-side:
 * - the launch gate and the tier allow-list are enforced here, not just in the route;
 * - Stripe itself is asked whether this customer already has a live subscription
 *   (not just our database), and the call fails closed if Stripe cannot be read;
 * - this member's own unpaid open session for the same plan is reused, and for a
 *   different plan it is expired first (paid sessions are never touched);
 * - the new session expires after 30 minutes and is created with an
 *   idempotency key, so a repeated or concurrent identical request cannot
 *   create a second session.
 */
export async function createCheckoutSession(
  input: CreateCheckoutSessionInput,
): Promise<{ url: string }> {
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

  const stripe = getStripeClient();

  const subscriptions = await stripe.subscriptions.list({
    customer: input.stripeCustomerId,
    status: 'all',
    limit: 20,
  });
  if (
    subscriptions.data.some((subscription) => LIVE_SUBSCRIPTION_STATUSES.has(subscription.status))
  ) {
    throw new AlreadySubscribedError('This account already has a subscription.');
  }

  const open = await stripe.checkout.sessions.list({
    customer: input.stripeCustomerId,
    status: 'open',
    limit: 10,
    expand: ['data.line_items'],
  });
  for (const session of open.data) {
    if (session.metadata?.userId !== input.userId) continue; // not ours: never touched
    if (session.line_items?.data[0]?.price?.id === priceId && session.url) {
      return { url: session.url }; // repeat of the same request: reuse the open session
    }
    await stripe.checkout.sessions.expire(session.id); // unpaid and open: safe to expire
  }

  const mode = checkoutModeForTier(input.tier);
  const window = Math.floor(Date.now() / IDEMPOTENCY_WINDOW_MS);

  let session;
  try {
    session = await stripe.checkout.sessions.create(
      {
        mode,
        customer: input.stripeCustomerId,
        line_items: [{ price: priceId, quantity: 1 }],
        success_url: input.successUrl,
        cancel_url: input.cancelUrl,
        expires_at: Math.floor(Date.now() / 1000) + SESSION_LIFETIME_SECONDS,
        metadata: { userId: input.userId },
        // Stamped on the subscription too so later subscription events can be traced to a user.
        ...(mode === 'subscription'
          ? { subscription_data: { metadata: { userId: input.userId } } }
          : {}),
      },
      { idempotencyKey: `checkout:${input.userId}:${input.tier}:${window}` },
    );
  } catch (error) {
    if (isIdempotencyError(error)) {
      throw new CheckoutInProgressError('A checkout is already in progress.');
    }
    throw error;
  }

  if (!session.url) {
    throw new Error('Stripe did not return a Checkout Session URL.');
  }

  return { url: session.url };
}
