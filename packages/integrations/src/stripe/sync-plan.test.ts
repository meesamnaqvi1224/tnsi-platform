import { describe, expect, it } from 'vitest';
import {
  planForCheckoutSessionCompleted,
  planForInvoicePaymentFailed,
  planForSubscriptionEvent,
  planForSubscriptionLifecycleEvent,
  type CheckoutSessionCompletedInput,
  type SubscriptionEventInput,
} from './sync-plan';
import type { PurchasableTier } from './tier-mapping';

const priceIds: Record<PurchasableTier, string | undefined> = {
  monthly: 'price_monthly',
  annual: 'price_annual',
};

const EVENT_TIME = new Date('2026-01-10T12:00:00Z');

function checkoutInput(
  overrides: Partial<CheckoutSessionCompletedInput> = {},
): CheckoutSessionCompletedInput {
  return {
    mode: 'subscription',
    customerId: 'cus_123',
    subscriptionId: 'sub_123',
    userId: 'user-uuid-1',
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
    eventTime: EVENT_TIME,
    ...overrides,
  };
}

describe('planForCheckoutSessionCompleted', () => {
  it('asks for a fresh read of the new subscription from Stripe — the event only identifies it', () => {
    expect(planForCheckoutSessionCompleted(checkoutInput())).toEqual({
      action: 'refresh-subscription',
      subscriptionId: 'sub_123',
      stripeCustomerId: 'cus_123',
      userId: 'user-uuid-1',
      eventTime: null,
    });
  });

  it('has NO plan that grants Lifetime: a paid one-time checkout is skipped with a reason', () => {
    const plan = planForCheckoutSessionCompleted(checkoutInput({ mode: 'payment' }));
    expect(plan).toEqual({ action: 'skip', reason: expect.stringMatching(/Lifetime.*closed/i) });
  });

  it.each(['payment', 'setup', 'something-else'])(
    'never grants anything for a %s-mode checkout',
    (mode) => {
      const plan = planForCheckoutSessionCompleted(checkoutInput({ mode }));
      expect(plan.action).toBe('skip');
    },
  );

  it('rejects a checkout session with no userId — the client can never cause this to resolve to a real account', () => {
    const plan = planForCheckoutSessionCompleted(checkoutInput({ userId: null }));
    expect(plan).toEqual({ action: 'skip', reason: expect.stringContaining('userId') });
  });

  it('rejects a checkout session with no customer id', () => {
    expect(planForCheckoutSessionCompleted(checkoutInput({ customerId: null })).action).toBe(
      'skip',
    );
  });

  it('rejects a subscription-mode session with no subscription id', () => {
    expect(planForCheckoutSessionCompleted(checkoutInput({ subscriptionId: null })).action).toBe(
      'skip',
    );
  });

  it('is deterministic — replaying the identical event produces the identical plan (idempotency at the decision level)', () => {
    const input = checkoutInput();
    expect(planForCheckoutSessionCompleted(input)).toEqual(planForCheckoutSessionCompleted(input));
  });
});

describe('planForSubscriptionLifecycleEvent', () => {
  const input = {
    customerId: 'cus_123',
    subscriptionId: 'sub_123',
    eventTime: EVENT_TIME,
    userId: 'user-uuid-1',
  };

  it('refreshes the named subscription from Stripe, carrying the event time as the grace anchor', () => {
    expect(planForSubscriptionLifecycleEvent(input)).toEqual({
      action: 'refresh-subscription',
      subscriptionId: 'sub_123',
      stripeCustomerId: 'cus_123',
      userId: 'user-uuid-1',
      eventTime: EVENT_TIME,
    });
  });

  it('never carries the event payload forward: a stale event and a fresh one plan identically', () => {
    const stale = planForSubscriptionLifecycleEvent({
      ...input,
      eventTime: new Date('2025-01-01'),
    });
    const fresh = planForSubscriptionLifecycleEvent(input);
    expect({ ...stale, eventTime: null }).toEqual({ ...fresh, eventTime: null });
  });

  it('skips an event with no customer id', () => {
    expect(planForSubscriptionLifecycleEvent({ ...input, customerId: null }).action).toBe('skip');
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
        paymentFailure: { action: 'clear' },
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
  it('refreshes the invoice’s subscription from Stripe, with the failure time as the grace anchor', () => {
    const plan = planForInvoicePaymentFailed({
      customerId: 'cus_123',
      subscriptionId: 'sub_123',
      eventTime: EVENT_TIME,
    });
    expect(plan).toEqual({
      action: 'refresh-subscription',
      subscriptionId: 'sub_123',
      stripeCustomerId: 'cus_123',
      userId: null,
      eventTime: EVENT_TIME,
    });
  });

  it('skips an invoice with no customer id', () => {
    expect(
      planForInvoicePaymentFailed({
        customerId: null,
        subscriptionId: 'sub_123',
        eventTime: EVENT_TIME,
      }).action,
    ).toBe('skip');
  });

  it('skips a failed invoice not associated with any subscription', () => {
    expect(
      planForInvoicePaymentFailed({
        customerId: 'cus_123',
        subscriptionId: null,
        eventTime: EVENT_TIME,
      }).action,
    ).toBe('skip');
  });
});

describe('payment-failure grace anchor (7-day grace period)', () => {
  function paymentFailureFor(status: string) {
    const plan = planForSubscriptionEvent(subscriptionInput({ status }), priceIds);
    if (plan.action !== 'sync-subscription') throw new Error('expected sync-subscription');
    return plan.values.paymentFailure;
  }

  it("starts the grace anchor, at Stripe's own event time, when a subscription goes past_due", () => {
    expect(paymentFailureFor('past_due')).toEqual({ action: 'start', at: EVENT_TIME });
  });

  it('treats unpaid like past_due (still a payment problem, not yet a cancellation)', () => {
    expect(paymentFailureFor('unpaid')).toEqual({ action: 'start', at: EVENT_TIME });
  });

  it('clears the anchor once the subscription is healthy again', () => {
    expect(paymentFailureFor('active')).toEqual({ action: 'clear' });
    expect(paymentFailureFor('trialing')).toEqual({ action: 'clear' });
  });

  it('leaves the anchor alone for terminal states', () => {
    expect(paymentFailureFor('canceled')).toEqual({ action: 'keep' });
    expect(paymentFailureFor('incomplete_expired')).toEqual({ action: 'keep' });
  });

  it('a pre-existing Stripe `trialing` subscription still maps to trialing (new trials are app-managed and never reach Stripe)', () => {
    const plan = planForSubscriptionEvent(subscriptionInput({ status: 'trialing' }), priceIds);
    expect(plan.action).toBe('sync-subscription');
    if (plan.action === 'sync-subscription') {
      expect(plan.values.status).toBe('trialing');
      expect(plan.values.tier).toBe('monthly');
    }
  });

  it('cancel-at-period-end keeps the subscription active and records the flag — access is not cut early', () => {
    const plan = planForSubscriptionEvent(
      subscriptionInput({ status: 'active', cancelAtPeriodEnd: true }),
      priceIds,
    );
    expect(plan.action).toBe('sync-subscription');
    if (plan.action === 'sync-subscription') {
      expect(plan.values.status).toBe('active');
      expect(plan.values.cancelAtPeriodEnd).toBe(true);
    }
  });

  it('recognises the annual price as the annual tier', () => {
    const plan = planForSubscriptionEvent(subscriptionInput({ priceId: 'price_annual' }), priceIds);
    expect(plan.action).toBe('sync-subscription');
    if (plan.action === 'sync-subscription') expect(plan.values.tier).toBe('annual');
  });
});
