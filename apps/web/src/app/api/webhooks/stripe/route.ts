/**
 * Stripe webhook endpoint for subscription/entitlement synchronization.
 * Verifies the signature against the raw request body, then hands the
 * verified event to `syncStripeEvent` (apps/web/src/lib/sync-stripe-entitlement.ts).
 *
 * See ./README.md for the exact Stripe dashboard webhook configuration
 * this endpoint expects (URL, events to send, signing secret).
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  StripeConfigError,
  StripeWebhookVerificationError,
  verifyStripeWebhookEvent,
} from '@tnsi/integrations';
import { syncStripeEvent } from '@/lib/sync-stripe-entitlement';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  const rawBody = await request.text();
  const signature = request.headers.get('stripe-signature');

  let event;
  try {
    event = verifyStripeWebhookEvent(rawBody, signature);
  } catch (error) {
    if (error instanceof StripeConfigError) {
      console.error('[Stripe Webhook] Not configured:', error.message);
      return NextResponse.json({ error: 'Webhook not configured' }, { status: 500 });
    }
    if (error instanceof StripeWebhookVerificationError) {
      console.error('[Stripe Webhook] Signature verification failed:', error.message);
      return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
    }
    throw error;
  }

  try {
    const result = await syncStripeEvent(event);
    console.info('[Stripe Webhook]', { type: event.type, ...result });
    return NextResponse.json({ received: true, ...result });
  } catch (error) {
    console.error('[Stripe Webhook] Sync failed:', event.type, error);
    return NextResponse.json({ error: 'Sync failed' }, { status: 500 });
  }
}
