import 'server-only';
import type Stripe from 'stripe';
import { getStripeClient } from './client';

/**
 * Read/expire access to Stripe Checkout Sessions, reduced to the few fields the
 * checkout and success-return logic needs. Nothing here creates a session or a
 * subscription; creation stays in `createCheckoutSession`.
 */
export interface CheckoutSessionInfo {
  id: string;
  status: 'open' | 'complete' | 'expired';
  /** `unpaid` means payment is still pending (e.g. an asynchronous payment method). */
  paymentStatus: 'paid' | 'unpaid' | 'no_payment_required';
  mode: 'subscription' | 'payment' | 'setup';
  customerId: string | null;
  subscriptionId: string | null;
  /** Our user id, stamped server-side at creation (`metadata.userId`). */
  userId: string | null;
  clientReferenceId: string | null;
  /** The plan the session was created for (`metadata.tier`), if recorded. */
  tier: string | null;
  /** Only present while the session is open. */
  url: string | null;
  createdAt: Date;
}

export interface CheckoutSessionGateway {
  /** Open (unpaid, unexpired) sessions for a customer, newest first. */
  listOpen(customerId: string): Promise<CheckoutSessionInfo[]>;
  /** Completed sessions for a customer, newest first. */
  listComplete(customerId: string): Promise<CheckoutSessionInfo[]>;
  retrieve(sessionId: string): Promise<CheckoutSessionInfo>;
  /** Expires an open session so it can no longer be paid. Rejects if it is not open. */
  expire(sessionId: string): Promise<void>;
}

function idOf(value: string | { id: string } | null | undefined): string | null {
  if (typeof value === 'string') return value;
  return value?.id ?? null;
}

export function toCheckoutSessionInfo(session: Stripe.Checkout.Session): CheckoutSessionInfo {
  return {
    id: session.id,
    status: (session.status ?? 'open') as CheckoutSessionInfo['status'],
    paymentStatus: session.payment_status,
    mode: session.mode,
    customerId: idOf(session.customer),
    subscriptionId: idOf(session.subscription),
    userId: session.metadata?.userId ?? null,
    clientReferenceId: session.client_reference_id ?? null,
    tier: session.metadata?.tier ?? null,
    url: session.url ?? null,
    createdAt: new Date(session.created * 1000),
  };
}

const TIMEOUT = { timeout: 8000, maxNetworkRetries: 1 } as const;

export const liveCheckoutSessionGateway: CheckoutSessionGateway = {
  async listOpen(customerId) {
    const page = await getStripeClient().checkout.sessions.list(
      { customer: customerId, status: 'open', limit: 10 },
      TIMEOUT,
    );
    return page.data.map(toCheckoutSessionInfo);
  },
  async listComplete(customerId) {
    const page = await getStripeClient().checkout.sessions.list(
      { customer: customerId, status: 'complete', limit: 10 },
      TIMEOUT,
    );
    return page.data.map(toCheckoutSessionInfo);
  },
  async retrieve(sessionId) {
    return toCheckoutSessionInfo(
      await getStripeClient().checkout.sessions.retrieve(sessionId, undefined, TIMEOUT),
    );
  },
  async expire(sessionId) {
    await getStripeClient().checkout.sessions.expire(sessionId, undefined, TIMEOUT);
  },
};
