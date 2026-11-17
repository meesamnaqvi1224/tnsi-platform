import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { SQL } from 'drizzle-orm';
import type Stripe from 'stripe';
import { createFakeDb } from './test-support/fake-trx';

/**
 * Event dispatch and mapping for the Stripe webhook executor, with no database
 * and no Stripe call (see test-support/fake-trx.ts). The properties that need
 * a real database - the row lock, rollback, replay and concurrency - are
 * covered against PostgreSQL in stripe-sync.integration.test.ts.
 */

vi.mock('@tnsi/db', () => ({
  db: {},
  entitlements: {
    userId: 'userId',
    stripeCustomerId: 'stripeCustomerId',
    paymentFailedAt: { name: 'payment_failed_at' },
    metadata: { name: 'metadata' },
  },
}));

const { syncStripeEvent } = await import('./sync-stripe-entitlement');

const KEYS = ['STRIPE_PRICE_ID_MONTHLY', 'STRIPE_PRICE_ID_ANNUAL'];
const saved = Object.fromEntries(KEYS.map((k) => [k, process.env[k]]));

beforeEach(() => {
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

const linkedRow = {
  userId: 'user-1',
  tier: 'free',
  stripeCustomerId: 'cus_1',
  stripeSubscriptionId: null,
};

function subscription(
  overrides: Partial<Stripe.Subscription> & { price?: string } = {},
): Stripe.Subscription {
  const { price = 'price_m', ...rest } = overrides;
  return {
    id: 'sub_1',
    customer: 'cus_1',
    status: 'active',
    cancel_at_period_end: false,
    current_period_start: EVENT_UNIX,
    current_period_end: EVENT_UNIX + 30 * 86400,
    canceled_at: null,
    metadata: {},
    items: { data: [{ price: { id: price } }] },
    ...rest,
  } as unknown as Stripe.Subscription;
}

function lifecycleEvent(type: string, sub: Partial<Stripe.Subscription> = {}) {
  return {
    type,
    created: EVENT_UNIX,
    data: { object: subscription(sub) },
  } as unknown as Stripe.Event;
}

/** Runs one event through the executor against a linked Free row with Stripe answering `current`. */
async function run(event: Stripe.Event, current: Stripe.Subscription, rows = [linkedRow]) {
  const fake = createFakeDb([rows]);
  const reader = { retrieveSubscription: vi.fn().mockResolvedValue(current) };
  const result = await syncStripeEvent(event, {
    reader,
    runTransaction: fake.runTransaction,
    now: () => new Date('2026-10-01T10:00:00Z'),
  });
  return { result, reader, writes: fake.state.committedSets, fake };
}

describe('syncStripeEvent — what is written comes from Stripe’s current state, not the event', () => {
  it('reads the subscription from Stripe for a lifecycle event, under the row lock', async () => {
    const { reader, fake } = await run(
      lifecycleEvent('customer.subscription.updated'),
      subscription(),
    );
    expect(reader.retrieveSubscription).toHaveBeenCalledWith('sub_1');
    expect(fake.state.forUpdateCalls).toBe(1);
  });

  it('writes Stripe’s answer even when the event payload says something older', async () => {
    // The event claims past_due; Stripe's current state is active.
    const { writes } = await run(
      lifecycleEvent('customer.subscription.updated', { status: 'past_due' }),
      subscription({ status: 'active' }),
    );
    expect(writes[0]).toMatchObject({ status: 'active', paymentFailedAt: null });
  });

  it('trialing (a pre-existing Stripe trial): written as trialing, grace anchor cleared', async () => {
    const { writes } = await run(
      lifecycleEvent('customer.subscription.created'),
      subscription({ status: 'trialing' }),
    );
    expect(writes[0]).toMatchObject({ tier: 'monthly', status: 'trialing', paymentFailedAt: null });
  });

  it('annual price: written as the annual tier', async () => {
    const { writes } = await run(
      lifecycleEvent('customer.subscription.updated'),
      subscription({ price: 'price_a' }),
    );
    expect(writes[0]).toMatchObject({ tier: 'annual', status: 'active' });
  });

  it('past_due: status written and the anchor set with first-failure-wins COALESCE', async () => {
    const { writes } = await run(
      lifecycleEvent('customer.subscription.updated'),
      subscription({ status: 'past_due' }),
    );
    expect(writes[0]!.status).toBe('past_due');
    expect(writes[0]!.paymentFailedAt).toBeInstanceOf(SQL);
  });

  it('cancel-at-period-end: stays active with the flag recorded — access is not cut early', async () => {
    const { writes } = await run(
      lifecycleEvent('customer.subscription.updated'),
      subscription({ cancel_at_period_end: true }),
    );
    expect(writes[0]).toMatchObject({ status: 'active', cancelAtPeriodEnd: true });
  });

  it('subscription ended (canceled): status written, anchor left untouched', async () => {
    const { writes } = await run(
      lifecycleEvent('customer.subscription.deleted'),
      subscription({ status: 'canceled', canceled_at: EVENT_UNIX }),
    );
    expect(writes[0]!.status).toBe('canceled');
    expect(writes[0]).not.toHaveProperty('paymentFailedAt');
  });

  it('records when the row was last synced from Stripe', async () => {
    const { writes } = await run(lifecycleEvent('customer.subscription.updated'), subscription());
    expect(writes[0]!.stripeSyncedAt).toEqual(new Date('2026-10-01T10:00:00Z'));
  });

  it('an unrecognised price is skipped — never guessed into a tier', async () => {
    const { result, writes } = await run(
      lifecycleEvent('customer.subscription.updated'),
      subscription({ price: 'price_unknown' }),
    );
    expect(result.action).toBe('skip');
    expect(writes).toHaveLength(0);
  });

  it('skips a subscription that belongs to a different Stripe customer', async () => {
    const { result, writes } = await run(
      lifecycleEvent('customer.subscription.updated'),
      subscription({ customer: 'cus_other' as never }),
    );
    expect(result).toMatchObject({ action: 'skip', detail: expect.stringContaining('customer') });
    expect(writes).toHaveLength(0);
  });
});

describe('syncStripeEvent — invoice.payment_failed', () => {
  const invoiceEvent = {
    type: 'invoice.payment_failed',
    created: EVENT_UNIX,
    data: { object: { customer: 'cus_1', subscription: 'sub_1' } },
  } as unknown as Stripe.Event;

  it('refreshes the subscription from Stripe; if past due, the anchor is first-failure-wins COALESCE', async () => {
    const { result, writes } = await run(invoiceEvent, subscription({ status: 'past_due' }));
    expect(result.action).toBe('sync-subscription');
    expect(writes[0]!.status).toBe('past_due');
    expect(writes[0]!.paymentFailedAt).toBeInstanceOf(SQL);
  });

  it('does NOT mark a member past due if Stripe now says the payment recovered', async () => {
    const { writes } = await run(invoiceEvent, subscription({ status: 'active' }));
    expect(writes[0]).toMatchObject({ status: 'active', paymentFailedAt: null });
  });

  it('ignores a failed invoice that is not for a subscription', async () => {
    const fake = createFakeDb();
    const reader = { retrieveSubscription: vi.fn() };
    const result = await syncStripeEvent(
      {
        ...invoiceEvent,
        data: { object: { customer: 'cus_1', subscription: null } },
      } as unknown as Stripe.Event,
      { reader, runTransaction: fake.runTransaction },
    );
    expect(result.action).toBe('skip');
    expect(reader.retrieveSubscription).not.toHaveBeenCalled();
  });
});

describe('syncStripeEvent — checkout.session.completed', () => {
  const sessionEvent = (overrides: Record<string, unknown> = {}) =>
    ({
      type: 'checkout.session.completed',
      created: EVENT_UNIX,
      data: {
        object: {
          mode: 'subscription',
          customer: 'cus_1',
          subscription: 'sub_1',
          metadata: { userId: 'user-1' },
          ...overrides,
        },
      },
    }) as unknown as Stripe.Event;

  it('syncs the new subscription immediately, without waiting for the subscription event', async () => {
    const { result, writes } = await run(sessionEvent(), subscription());
    expect(result.action).toBe('sync-subscription');
    expect(writes[0]).toMatchObject({ tier: 'monthly', status: 'active' });
  });

  it('never grants anything for a one-time payment: Lifetime is closed to new purchases', async () => {
    const fake = createFakeDb();
    const reader = { retrieveSubscription: vi.fn() };
    const result = await syncStripeEvent(sessionEvent({ mode: 'payment', subscription: null }), {
      reader,
      runTransaction: fake.runTransaction,
    });
    expect(result).toMatchObject({ action: 'skip', detail: expect.stringMatching(/Lifetime/i) });
    expect(fake.state.selectCalls).toBe(0);
    expect(fake.state.committedSets).toHaveLength(0);
  });

  it('refuses a session with no userId in metadata', async () => {
    const fake = createFakeDb();
    const result = await syncStripeEvent(sessionEvent({ metadata: {} }), {
      reader: { retrieveSubscription: vi.fn() },
      runTransaction: fake.runTransaction,
    });
    expect(result.action).toBe('skip');
  });
});

describe('syncStripeEvent — other event types', () => {
  it('ignores event types it does not handle', async () => {
    const result = await syncStripeEvent({ type: 'charge.refunded' } as unknown as Stripe.Event);
    expect(result).toEqual({ action: 'skip', detail: 'unhandled event type: charge.refunded' });
  });
});
