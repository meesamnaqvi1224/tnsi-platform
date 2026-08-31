import 'server-only';
import type Stripe from 'stripe';
import { getStripeClient } from './client';
import { getStripeConfig, StripeConfigError } from './config';

/** Thrown when a webhook request's signature doesn't verify against `STRIPE_WEBHOOK_SECRET`. */
export class StripeWebhookVerificationError extends Error {}

/**
 * Verifies a Stripe webhook request's signature and returns the parsed,
 * typed event. Uses Stripe's own `constructEvent` (HMAC-based, timestamp-
 * tolerant) rather than a hand-rolled check — unlike the Sanity webhook,
 * Stripe's SDK already provides a correct, well-tested verifier, so
 * there's no reason to reimplement one.
 *
 * Must be called with the *raw* request body string — Stripe signs the
 * exact bytes sent, so anything that re-serializes JSON first (even
 * losslessly) will fail verification.
 */
export function verifyStripeWebhookEvent(
  rawBody: string,
  signatureHeader: string | null,
): Stripe.Event {
  const { webhookSecret } = getStripeConfig();
  if (!webhookSecret) {
    throw new StripeConfigError('Stripe webhooks are not configured — set STRIPE_WEBHOOK_SECRET.');
  }
  if (!signatureHeader) {
    throw new StripeWebhookVerificationError('Missing Stripe-Signature header.');
  }

  try {
    return getStripeClient().webhooks.constructEvent(rawBody, signatureHeader, webhookSecret);
  } catch (error) {
    throw new StripeWebhookVerificationError(
      error instanceof Error ? error.message : 'Invalid Stripe webhook signature.',
    );
  }
}
