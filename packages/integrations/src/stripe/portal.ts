import 'server-only';
import { getStripeClient } from './client';

/** Thrown when the caller has never completed a checkout — there is no Stripe customer to open a portal session for. */
export class NoStripeCustomerError extends Error {}

/**
 * Creates a Stripe Billing Portal session for self-service plan management
 * (update payment method, cancel, view invoices) — the customer-portal
 * capability ARCHITECTURE.md's Payments section names explicitly, rather
 * than this app building its own cancel/update-card UI.
 */
export async function createBillingPortalSession(input: {
  stripeCustomerId: string | null;
  returnUrl: string;
}): Promise<{ url: string }> {
  if (!input.stripeCustomerId) {
    throw new NoStripeCustomerError('This account has no billing history yet.');
  }

  const session = await getStripeClient().billingPortal.sessions.create({
    customer: input.stripeCustomerId,
    return_url: input.returnUrl,
  });

  return { url: session.url };
}
