import { describe, expect, it } from 'vitest';
import {
  planForCheckoutSessionCompleted,
  planForInvoicePaymentFailed,
  planForSubscriptionEvent,
  type CheckoutSessionCompletedInput,
  type SubscriptionEventInput,
} from './sync-plan';
import type { PurchasableTier } from './tier-mapping';

const priceIds: Record<PurchasableTier, string | undefined> = {
  monthly: 'price_monthly',
  annual: 'price_annual',
  lifetime: 'price_lifetime',
};

function checkoutInput(
  overrides: Partial<CheckoutSessionCompletedInput> = {},
): CheckoutSessionCompletedInput {
  return {
    mode: 'subscription',
    customerId: 'cus_123',
    userId: 'user-uuid-1',
    paymentStatus: 'paid',
    priceId: null,
    ...overrides,
  };
}

function subscriptionInput(
  overrides: Partial<SubscriptionEventInput> = {},
): SubscriptionEventInput {
  return {
    customerId: 'cus_123',
    subscriptionId: 'sub_123',
    status: 'active',
    priceId: 'price_monthly',
    currentPeriodStart: new Date('2026-01-01T00:00:00Z'),
    currentPeriodEnd: new Date('2026-02-01T00:00:00Z'),
    cancelAtPeriodEnd: false,
    canceledAt: null,
    ...overrides,
  };
}

describe('planForCheckoutSessionCompleted', () => {
  it('links the customer for a subscription-mode checkout — the subscription event grants the actual access', () => {
    const plan = planForCheckoutSessionCompleted(checkoutInput({ mode: 'subscription' }), priceIds);
    expect(plan).toEqual({
      action: 'link-customer',
      userId: 'user-uuid-1',
      stripeCustomerId: 'cus_123',
    });
  });

  it('grants lifetime immediately for a paid one-time checkout', () => {
    const plan = planForCheckoutSessionCompleted(
      checkoutInput({ mode: 'payment', paymentStatus: 'paid', priceId: 'price_lifetime' }),
      priceIds,
    );
    expect(plan).toEqual({
      action: 'grant-lifetime',
      userId: 'user-uuid-1',
      stripeCustomerId: 'cus_123',
    });
  });

  it('skips a one-time checkout that has not actually been paid', () => {
    const plan = planForCheckoutSessionCompleted(
      checkoutInput({ mode: 'payment', paymentStatus: 'unpaid', priceId: 'price_lifetime' }),
      priceIds,
    );
    expect(plan.action).toBe('skip');
  });

  it('skips a one-time checkout whose price is not the configured lifetime price', () => {
    const plan = planForCheckoutSessionCompleted(
      checkoutInput({ mode: 'payment', paymentStatus: 'paid', priceId: 'price_unknown' }),
      priceIds,
    );
    expect(plan.action).toBe('skip');
  });

  it('rejects a checkout session with no userId — the client can never cause this to resolve to a real account', () => {
    const plan = planForCheckoutSessionCompleted(checkoutInput({ userId: null }), priceIds);
    expect(plan).toEqual({ action: 'skip', reason: expect.stringContaining('userId') });
  });

  it('rejects a checkout session with no customer id', () => {
    const plan = planForCheckoutSessionCompleted(checkoutInput({ customerId: null }), priceIds);
    expect(plan.action).toBe('skip');
  });

  it('is deterministic — replaying the identical event produces the identical plan (idempotency at the decision level)', () => {
    const input = checkoutInput({
      mode: 'payment',
      paymentStatus: 'paid',
      priceId: 'price_lifetime',
    });
    expect(planForCheckoutSessionCompleted(input, priceIds)).toEqual(
      planForCheckoutSessionCompleted(input, priceIds),
    );
  });
});

describe('planForSubscriptionEvent', () => {
  it('produces a sync-subscription plan for an active subscription — this is the "active subscription -> entitled" path', () => {
    const plan = planForSubscriptionEvent(subscriptionInput({ status: 'active' }), priceIds);
    expect(plan).toEqual({
      action: 'sync-subscription',
      stripeCustomerId: 'cus_123',
      values: {
        tier: 'monthly',
        status: 'active',
        stripeSubscriptionId: 'sub_123',
        currentPeriodStart: new Date('2026-01-01T00:00:00Z'),
        currentPeriodEnd: new Date('2026-02-01T00:00:00Z'),
        cancelAtPeriodEnd: false,
        canceledAt: null,
      },
    });
  });

  it('maps a canceled Stripe subscription to the canceled status — "canceled subscription -> not entitled" is enforced downstream by the existing authorizeEntitlement, not re-implemented here', () => {
    const plan = planForSubscriptionEvent(
      subscriptionInput({ status: 'canceled', canceledAt: new Date('2026-03-01T00:00:00Z') }),
      priceIds,
    );
    expect(plan.action).toBe('sync-subscription');
    if (plan.action === 'sync-subscription') {
      expect(plan.values.status).toBe('canceled');
    }
  });

  it('maps an expired/incomplete Stripe subscription to the expired status', () => {
    const plan = planForSubscriptionEvent(
      subscriptionInput({ status: 'incomplete_expired' }),
      priceIds,
    );
    expect(plan.action).toBe('sync-subscription');
    if (plan.action === 'sync-subscription') {
      expect(plan.values.status).toBe('expired');
    }
  });

  it('skips a subscription with no customer id', () => {
    const plan = planForSubscriptionEvent(subscriptionInput({ customerId: null }), priceIds);
    expect(plan.action).toBe('skip');
  });

  it('refuses to guess a tier for an unrecognised price id — safe denial rather than a fabricated tier', () => {
    const plan = planForSubscriptionEvent(
      subscriptionInput({ priceId: 'price_unknown' }),
      priceIds,
    );
    expect(plan.action).toBe('skip');
  });

  it('is deterministic for the same subscription event replayed twice', () => {
    const input = subscriptionInput();
    expect(planForSubscriptionEvent(input, priceIds)).toEqual(
      planForSubscriptionEvent(input, priceIds),
    );
  });
});

describe('planForInvoicePaymentFailed', () => {
  it('marks the customer past-due when the failed invoice belongs to a subscription', () => {
    const plan = planForInvoicePaymentFailed({ customerId: 'cus_123', subscriptionId: 'sub_123' });
    expect(plan).toEqual({ action: 'mark-past-due', stripeCustomerId: 'cus_123' });
  });

  it('skips an invoice with no customer id', () => {
    expect(
      planForInvoicePaymentFailed({ customerId: null, subscriptionId: 'sub_123' }).action,
    ).toBe('skip');
  });

  it('skips a failed invoice not associated with any subscription', () => {
    expect(
      planForInvoicePaymentFailed({ customerId: 'cus_123', subscriptionId: null }).action,
    ).toBe('skip');
  });
});
