import 'server-only';
import { getStripeClient } from './client';
import { getStripeConfig } from './config';
import { MEMBERSHIP_TRIAL_DAYS } from './plans';
import { checkoutModeForTier, resolvePriceId, type PurchasableTier } from './tier-mapping';

/** Thrown when the requested tier has no Stripe Price configured yet — never a fabricated fallback price. */
export class UnpurchasableTierError extends Error {}

export interface CreateCheckoutSessionInput {
  tier: PurchasableTier;
  /** Our internal user id — stamped into Checkout Session metadata so the webhook can link the resulting customer/subscription back to this user without ever trusting anything the browser sends. */
  userId: string;
  userEmail: string;
  /** Reuse the caller's existing Stripe customer, if they have one, instead of letting Stripe create a second one for the same person. */
  existingStripeCustomerId: string | null;
  /**
   * Start the subscription with Stripe's native 30-day free trial. Decided
   * server-side by the caller (trial is for a member's first subscription
   * only) — never taken from client input. Ignored for one-time purchases,
   * which cannot have a trial.
   */
  offerTrial: boolean;
  successUrl: string;
  cancelUrl: string;
}

/**
 * Creates a Stripe Checkout Session for one of the tiers this app already
 * knows about. The price actually charged is resolved entirely server-side
 * from `tier` (a closed enum) — nothing about which product/price gets
 * purchased is ever read from client input beyond which of the three
 * already-configured tier names was requested.
 */
export async function createCheckoutSession(
  input: CreateCheckoutSessionInput,
): Promise<{ url: string }> {
  const { priceIds } = getStripeConfig();
  const priceId = resolvePriceId(input.tier, priceIds);
  if (!priceId) {
    throw new UnpurchasableTierError(
      `No Stripe price is configured for the "${input.tier}" tier yet.`,
    );
  }

  const mode = checkoutModeForTier(input.tier);

  const session = await getStripeClient().checkout.sessions.create({
    mode,
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: input.successUrl,
    cancel_url: input.cancelUrl,
    metadata: { userId: input.userId },
    // Stamped on the subscription itself too (not just the session) so
    // later `customer.subscription.*` events — which don't carry the
    // checkout session's own metadata — could still be traced back to a
    // user by subscription metadata if ever needed; the webhook's primary
    // lookup path is by Stripe customer id, established at link time.
    ...(mode === 'subscription'
      ? {
          subscription_data: {
            metadata: { userId: input.userId },
            // Stripe's own trial mechanism — no custom timer. The first
            // charge happens when it ends, on the selected plan.
            ...(input.offerTrial ? { trial_period_days: MEMBERSHIP_TRIAL_DAYS } : {}),
          },
          // A trial converts to a paid plan automatically, so the payment
          // method must be on file before it starts.
          ...(input.offerTrial ? { payment_method_collection: 'always' as const } : {}),
        }
      : {}),
    ...(input.existingStripeCustomerId
      ? { customer: input.existingStripeCustomerId }
      : { customer_email: input.userEmail }),
  });

  if (!session.url) {
    throw new Error('Stripe did not return a Checkout Session URL.');
  }

  return { url: session.url };
}
