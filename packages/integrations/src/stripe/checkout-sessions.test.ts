import { describe, expect, it, vi } from 'vitest';
import type Stripe from 'stripe';

vi.mock('server-only', () => ({}));

import { toCheckoutSessionInfo } from './checkout-sessions';

describe('toCheckoutSessionInfo', () => {
  it('reduces a session to the fields the checkout logic uses', () => {
    const info = toCheckoutSessionInfo({
      id: 'cs_test_1',
      status: 'complete',
      payment_status: 'paid',
      mode: 'subscription',
      customer: { id: 'cus_1' },
      subscription: 'sub_1',
      metadata: { userId: 'u1', tier: 'annual' },
      client_reference_id: 'u1',
      url: null,
      created: 1_700_000_000,
    } as unknown as Stripe.Checkout.Session);
    expect(info).toEqual({
      id: 'cs_test_1',
      status: 'complete',
      paymentStatus: 'paid',
      mode: 'subscription',
      customerId: 'cus_1',
      subscriptionId: 'sub_1',
      userId: 'u1',
      clientReferenceId: 'u1',
      tier: 'annual',
      url: null,
      createdAt: new Date(1_700_000_000_000),
    });
  });

  it('treats missing metadata as unowned rather than guessing', () => {
    const info = toCheckoutSessionInfo({
      id: 'cs_test_2',
      status: 'open',
      payment_status: 'unpaid',
      mode: 'subscription',
      customer: 'cus_2',
      subscription: null,
      metadata: null,
      client_reference_id: null,
      url: 'https://checkout.stripe.test/x',
      created: 1_700_000_000,
    } as unknown as Stripe.Checkout.Session);
    expect(info.userId).toBeNull();
    expect(info.tier).toBeNull();
    expect(info.subscriptionId).toBeNull();
  });
});
