import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * Stripe event -> entitlement behaviour for the cases that protect members:
 * legacy Lifetime entitlements are preserved, new Lifetime grants are refused,
 * and a second live subscription never takes over an existing one. The database
 * is a fake; nothing touches Stripe or a real database.
 */
const db = vi.hoisted(() => ({
  rows: [] as Record<string, unknown>[],
  users: [{ id: 'user-1' }] as Record<string, unknown>[],
  updates: [] as Record<string, unknown>[],
  selects: 0,
}));

vi.mock('@tnsi/db', () => {
  const entitlements = { __t: 'entitlements' };
  const users = { __t: 'users' };
  return {
    entitlements,
    users,
    db: {
      select: () => ({
        from: (table: { __t: string }) => ({
          where: () => ({
            limit: async () => (table.__t === 'users' ? db.users : db.rows),
          }),
        }),
      }),
      update: () => ({
        set: (values: Record<string, unknown>) => ({
          where: () => {
            db.updates.push(values);
            return { returning: async () => [{ userId: 'user-1' }] };
          },
        }),
      }),
    },
  };
});

const { syncStripeEvent } = await import('./sync-stripe-entitlement');

const KEYS = ['STRIPE_PRICE_ID_MONTHLY', 'STRIPE_PRICE_ID_ANNUAL', 'STRIPE_PRICE_ID_LIFETIME'];
const saved = Object.fromEntries(KEYS.map((k) => [k, process.env[k]]));

function subscriptionEvent(id: string, status = 'active', price = 'price_monthly') {
  return {
    type: 'customer.subscription.updated',
    data: {
      object: {
        id,
        customer: 'cus_1',
        status,
        cancel_at_period_end: false,
        canceled_at: null,
        current_period_start: 1_790_000_000,
        current_period_end: 1_792_600_000,
        items: { data: [{ price: { id: price } }] },
      },
    },
  } as never;
}

function lifetimeCheckout(created: number) {
  return {
    type: 'checkout.session.completed',
    data: {
      object: {
        id: 'cs_1',
        mode: 'payment',
        payment_status: 'paid',
        customer: 'cus_1',
        created,
        metadata: { userId: 'user-1' },
        line_items: { data: [{ price: { id: 'price_lifetime' } }] },
      },
    },
  } as never;
}

beforeEach(() => {
  db.rows = [];
  db.users = [{ id: 'user-1' }];
  db.updates = [];
  process.env.STRIPE_PRICE_ID_MONTHLY = 'price_monthly';
  process.env.STRIPE_PRICE_ID_ANNUAL = 'price_annual';
  process.env.STRIPE_PRICE_ID_LIFETIME = 'price_lifetime';
});

afterEach(() => {
  for (const k of KEYS) {
    if (saved[k] === undefined) delete process.env[k];
    else process.env[k] = saved[k];
  }
  vi.restoreAllMocks();
});

describe('legacy Lifetime entitlements', () => {
  it('are not overwritten or revoked by a subscription event', async () => {
    db.rows = [{ tier: 'lifetime', status: 'active', stripeSubscriptionId: null }];
    const result = await syncStripeEvent(subscriptionEvent('sub_new', 'canceled'));
    expect(result.action).toBe('skip');
    expect(result.detail).toContain('Lifetime');
    expect(db.updates).toEqual([]);
  });

  it('are not marked past due by a failed invoice', async () => {
    db.rows = [{ tier: 'lifetime', status: 'active', stripeSubscriptionId: null }];
    const result = await syncStripeEvent({
      type: 'invoice.payment_failed',
      data: { object: { customer: 'cus_1', subscription: 'sub_x' } },
    } as never);
    expect(result.action).toBe('skip');
    expect(db.updates).toEqual([]);
  });

  it('are still granted for a legitimate purchase made before sales ended (late delivery)', async () => {
    const result = await syncStripeEvent(lifetimeCheckout(1_790_000_000)); // 2026-09-21
    expect(result.action).toBe('grant-lifetime');
    expect(db.updates[0]).toMatchObject({ tier: 'lifetime', status: 'active' });
  });
});

describe('new Lifetime purchases', () => {
  it('are never granted just because a signed event says so', async () => {
    const result = await syncStripeEvent(lifetimeCheckout(1_792_800_000)); // after 2026-10-23
    expect(result.action).toBe('skip');
    expect(result.detail).toContain('discontinued');
    expect(db.updates).toEqual([]);
  });
});

describe('other subscription events keep working', () => {
  it('updates the entitlement for the same subscription', async () => {
    db.rows = [{ tier: 'monthly', status: 'active', stripeSubscriptionId: 'sub_1' }];
    const result = await syncStripeEvent(subscriptionEvent('sub_1', 'active'));
    expect(result.action).toBe('sync-subscription');
    expect(db.updates[0]).toMatchObject({ tier: 'monthly', status: 'active' });
  });

  it('records a first subscription on a free row', async () => {
    db.rows = [{ tier: 'free', status: 'active', stripeSubscriptionId: null }];
    const result = await syncStripeEvent(subscriptionEvent('sub_1', 'trialing'));
    expect(result.action).toBe('sync-subscription');
    expect(db.updates[0]).toMatchObject({ tier: 'monthly', status: 'trialing' });
  });

  it('lets a new subscription replace an ended one', async () => {
    db.rows = [{ tier: 'monthly', status: 'canceled', stripeSubscriptionId: 'sub_old' }];
    const result = await syncStripeEvent(subscriptionEvent('sub_new', 'active', 'price_annual'));
    expect(result.action).toBe('sync-subscription');
    expect(db.updates[0]).toMatchObject({ tier: 'annual', stripeSubscriptionId: 'sub_new' });
  });

  it('applies a cancellation of the current subscription', async () => {
    db.rows = [{ tier: 'monthly', status: 'active', stripeSubscriptionId: 'sub_1' }];
    await syncStripeEvent(subscriptionEvent('sub_1', 'canceled'));
    expect(db.updates[0]).toMatchObject({ status: 'canceled' });
  });
});

describe('a second live subscription', () => {
  it('does not take over the entitlement and is flagged for manual review', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    db.rows = [{ tier: 'monthly', status: 'active', stripeSubscriptionId: 'sub_1' }];
    const result = await syncStripeEvent(subscriptionEvent('sub_2', 'active', 'price_annual'));
    expect(result.action).toBe('skip');
    expect(result.detail).toContain('manual review');
    expect(db.updates).toEqual([]);
    expect(warn).toHaveBeenCalledWith(
      '[stripe webhook] DUPLICATE_SUBSCRIPTION_REVIEW',
      expect.objectContaining({ existing: 'sub_1', incoming: 'sub_2' }),
    );
  });
});
