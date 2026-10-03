import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { SQL } from 'drizzle-orm';
import type Stripe from 'stripe';

/**
 * What the Stripe webhook executor actually writes to `entitlements`,
 * captured through a mocked database (no connection, no Stripe call). The
 * pure decisions are covered in @tnsi/integrations; this checks the
 * executor applies them — in particular the 7-day grace anchor:
 * set on first failure (first-failure-wins), cleared on recovery, left alone
 * for terminal states.
 */

const writes = vi.hoisted(() => ({ sets: [] as Record<string, unknown>[] }));

vi.mock('@tnsi/db', () => {
  const updateChain = {
    set: (values: Record<string, unknown>) => {
      writes.sets.push(values);
      return updateChain;
    },
    where: () => updateChain,
    returning: async () => [{ userId: 'user-1' }],
  };
  return {
    db: {
      update: () => updateChain,
      select: () => ({ from: () => ({ where: () => ({ limit: async () => [] }) }) }),
    },
    entitlements: {
      userId: 'userId',
      stripeCustomerId: 'stripeCustomerId',
      paymentFailedAt: { name: 'payment_failed_at' },
    },
    users: {},
  };
});

const { syncStripeEvent } = await import('./sync-stripe-entitlement');

const KEYS = ['STRIPE_PRICE_ID_MONTHLY', 'STRIPE_PRICE_ID_ANNUAL'];
const saved = Object.fromEntries(KEYS.map((k) => [k, process.env[k]]));

beforeEach(() => {
  writes.sets.length = 0;
  process.env.STRIPE_PRICE_ID_MONTHLY = 'price_m';
  process.env.STRIPE_PRICE_ID_ANNUAL = 'price_a';
});
afterEach(() => {
  for (const k of KEYS) {
    if (saved[k] === undefined) delete process.env[k];
    else process.env[k] = saved[k];
  }
});

const EVENT_UNIX = Math.floor(new Date('2026-10-01T09:00:00Z').getTime() / 1000);

function subscriptionEvent(
  type: string,
  overrides: Partial<Stripe.Subscription> & { price?: string } = {},
) {
  const { price = 'price_m', ...rest } = overrides;
  return {
    type,
    created: EVENT_UNIX,
    data: {
      object: {
        id: 'sub_1',
        customer: 'cus_1',
        status: 'active',
        cancel_at_period_end: false,
        current_period_start: EVENT_UNIX,
        current_period_end: EVENT_UNIX + 30 * 86400,
        canceled_at: null,
        items: { data: [{ price: { id: price } }] },
        ...rest,
      },
    },
  } as unknown as Stripe.Event;
}

describe('syncStripeEvent — subscription lifecycle', () => {
  it('trialing: written as trialing, grace anchor cleared', async () => {
    await syncStripeEvent(
      subscriptionEvent('customer.subscription.created', { status: 'trialing' }),
    );
    expect(writes.sets[0]).toMatchObject({
      tier: 'monthly',
      status: 'trialing',
      paymentFailedAt: null,
    });
  });

  it('annual price: written as the annual tier', async () => {
    await syncStripeEvent(subscriptionEvent('customer.subscription.updated', { price: 'price_a' }));
    expect(writes.sets[0]).toMatchObject({ tier: 'annual', status: 'active' });
  });

  it('active again after a failure: anchor cleared', async () => {
    await syncStripeEvent(subscriptionEvent('customer.subscription.updated', { status: 'active' }));
    expect(writes.sets[0]).toHaveProperty('paymentFailedAt', null);
  });

  it('past_due: status written and the anchor set with first-failure-wins COALESCE', async () => {
    await syncStripeEvent(
      subscriptionEvent('customer.subscription.updated', { status: 'past_due' }),
    );
    const set = writes.sets[0]!;
    expect(set.status).toBe('past_due');
    expect(set.paymentFailedAt).toBeInstanceOf(SQL);
  });

  it('cancel-at-period-end: stays active with the flag recorded — access is not cut early', async () => {
    await syncStripeEvent(
      subscriptionEvent('customer.subscription.updated', { cancel_at_period_end: true }),
    );
    expect(writes.sets[0]).toMatchObject({ status: 'active', cancelAtPeriodEnd: true });
  });

  it('subscription ended (canceled): status written, anchor left untouched', async () => {
    await syncStripeEvent(
      subscriptionEvent('customer.subscription.deleted', {
        status: 'canceled',
        canceled_at: EVENT_UNIX,
      }),
    );
    const set = writes.sets[0]!;
    expect(set.status).toBe('canceled');
    expect(set).not.toHaveProperty('paymentFailedAt');
  });

  it('an unrecognised price is skipped — never guessed into a tier', async () => {
    const result = await syncStripeEvent(
      subscriptionEvent('customer.subscription.updated', { price: 'price_unknown' }),
    );
    expect(result.action).toBe('skip');
    expect(writes.sets).toHaveLength(0);
  });
});

describe('syncStripeEvent — invoice.payment_failed', () => {
  const invoiceEvent = {
    type: 'invoice.payment_failed',
    created: EVENT_UNIX,
    data: { object: { customer: 'cus_1', subscription: 'sub_1' } },
  } as unknown as Stripe.Event;

  it('marks past_due and records the failure with first-failure-wins COALESCE (retries cannot restart the clock)', async () => {
    const result = await syncStripeEvent(invoiceEvent);
    expect(result.action).toBe('mark-past-due');
    const set = writes.sets[0]!;
    expect(set.status).toBe('past_due');
    expect(set.paymentFailedAt).toBeInstanceOf(SQL);
  });

  it('ignores a failed invoice that is not for a subscription', async () => {
    const result = await syncStripeEvent({
      ...invoiceEvent,
      data: { object: { customer: 'cus_1', subscription: null } },
    } as unknown as Stripe.Event);
    expect(result.action).toBe('skip');
    expect(writes.sets).toHaveLength(0);
  });
});
