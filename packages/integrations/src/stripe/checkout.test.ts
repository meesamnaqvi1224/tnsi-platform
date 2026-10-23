import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));

const fake = vi.hoisted(() => ({
  subscriptions: { list: vi.fn() },
  sessions: { list: vi.fn(), expire: vi.fn(), create: vi.fn() },
  customers: { create: vi.fn() },
}));

vi.mock('./client', () => ({
  getStripeClient: () => ({
    subscriptions: fake.subscriptions,
    checkout: { sessions: fake.sessions },
    customers: fake.customers,
  }),
}));

import {
  AlreadySubscribedError,
  CheckoutInProgressError,
  createCheckoutSession,
  ensureStripeCustomer,
  MembershipClosedError,
  UnpurchasableTierError,
} from './checkout';

/**
 * createCheckoutSession and ensureStripeCustomer are the only code that creates
 * Stripe objects for a purchase. Stripe is a fake here: nothing is created or charged.
 */
const KEYS = [
  'REGULATION_SUITE_MEMBERSHIP_OPEN',
  'STRIPE_SECRET_KEY',
  'STRIPE_WEBHOOK_SECRET',
  'STRIPE_PRICE_ID_MONTHLY',
  'STRIPE_PRICE_ID_ANNUAL',
  'STRIPE_PRICE_ID_LIFETIME',
];
const saved = Object.fromEntries(KEYS.map((k) => [k, process.env[k]]));

function open() {
  process.env.REGULATION_SUITE_MEMBERSHIP_OPEN = 'true';
  process.env.STRIPE_SECRET_KEY = 'sk_test_placeholder';
  process.env.STRIPE_WEBHOOK_SECRET = 'whsec_placeholder';
  process.env.STRIPE_PRICE_ID_MONTHLY = 'price_monthly_placeholder';
  process.env.STRIPE_PRICE_ID_ANNUAL = 'price_annual_placeholder';
}

const input = {
  userId: 'user-1',
  stripeCustomerId: 'cus_placeholder',
  successUrl: 'https://example.test/ok',
  cancelUrl: 'https://example.test/cancel',
};

function nothingStripeCalled() {
  expect(fake.subscriptions.list).not.toHaveBeenCalled();
  expect(fake.sessions.list).not.toHaveBeenCalled();
  expect(fake.sessions.expire).not.toHaveBeenCalled();
  expect(fake.sessions.create).not.toHaveBeenCalled();
  expect(fake.customers.create).not.toHaveBeenCalled();
}

beforeEach(() => {
  for (const f of [
    fake.subscriptions.list,
    fake.sessions.list,
    fake.sessions.expire,
    fake.sessions.create,
    fake.customers.create,
  ]) {
    f.mockReset();
  }
  fake.subscriptions.list.mockResolvedValue({ data: [] });
  fake.sessions.list.mockResolvedValue({ data: [] });
  fake.sessions.create.mockResolvedValue({ url: 'https://checkout.stripe.test/new' });
  fake.customers.create.mockResolvedValue({ id: 'cus_new' });
  for (const k of KEYS) delete process.env[k];
});

afterEach(() => {
  for (const k of KEYS) {
    if (saved[k] === undefined) delete process.env[k];
    else process.env[k] = saved[k];
  }
});

describe('launch gate', () => {
  it('refuses, without calling Stripe, when the launch variable is unset', async () => {
    open();
    delete process.env.REGULATION_SUITE_MEMBERSHIP_OPEN;
    await expect(createCheckoutSession({ ...input, tier: 'monthly' })).rejects.toBeInstanceOf(
      MembershipClosedError,
    );
    await expect(ensureStripeCustomer({ userId: 'u', email: 'a@b.test' })).rejects.toBeInstanceOf(
      MembershipClosedError,
    );
    nothingStripeCalled();
  });

  it.each(['TRUE', '1', 'yes', ' true', 'true ', 'false', ''])(
    'refuses, without calling Stripe, when the launch variable is %j',
    async (value) => {
      open();
      process.env.REGULATION_SUITE_MEMBERSHIP_OPEN = value;
      await expect(createCheckoutSession({ ...input, tier: 'annual' })).rejects.toBeInstanceOf(
        MembershipClosedError,
      );
      nothingStripeCalled();
    },
  );

  it('refuses when billing is only partly configured', async () => {
    open();
    delete process.env.STRIPE_PRICE_ID_ANNUAL;
    await expect(createCheckoutSession({ ...input, tier: 'monthly' })).rejects.toBeInstanceOf(
      MembershipClosedError,
    );
    nothingStripeCalled();
  });

  it('refuses Lifetime even when open and a Lifetime price exists', async () => {
    open();
    process.env.STRIPE_PRICE_ID_LIFETIME = 'price_lifetime_placeholder';
    await expect(
      createCheckoutSession({ ...input, tier: 'lifetime' as never }),
    ).rejects.toBeInstanceOf(UnpurchasableTierError);
    nothingStripeCalled();
  });
});

describe('duplicate-subscription protection', () => {
  it.each(['active', 'trialing', 'past_due', 'unpaid', 'incomplete', 'paused'])(
    'refuses when Stripe already holds a %s subscription for the customer, and creates nothing',
    async (status) => {
      open();
      fake.subscriptions.list.mockResolvedValue({ data: [{ id: 'sub_1', status }] });
      await expect(createCheckoutSession({ ...input, tier: 'annual' })).rejects.toBeInstanceOf(
        AlreadySubscribedError,
      );
      expect(fake.sessions.create).not.toHaveBeenCalled();
    },
  );

  it('allows a customer whose earlier subscriptions have all ended', async () => {
    open();
    fake.subscriptions.list.mockResolvedValue({
      data: [
        { id: 'sub_old', status: 'canceled' },
        { id: 'sub_old2', status: 'incomplete_expired' },
      ],
    });
    await expect(createCheckoutSession({ ...input, tier: 'monthly' })).resolves.toEqual({
      url: 'https://checkout.stripe.test/new',
    });
  });

  it('fails closed (no session) if Stripe cannot be read', async () => {
    open();
    fake.subscriptions.list.mockRejectedValue(new Error('network'));
    await expect(createCheckoutSession({ ...input, tier: 'monthly' })).rejects.toThrow('network');
    expect(fake.sessions.create).not.toHaveBeenCalled();
  });

  it("reuses the member's own open session for the same plan instead of creating another", async () => {
    open();
    fake.sessions.list.mockResolvedValue({
      data: [
        {
          id: 'cs_open',
          url: 'https://checkout.stripe.test/existing',
          metadata: { userId: 'user-1' },
          line_items: { data: [{ price: { id: 'price_monthly_placeholder' } }] },
        },
      ],
    });
    await expect(createCheckoutSession({ ...input, tier: 'monthly' })).resolves.toEqual({
      url: 'https://checkout.stripe.test/existing',
    });
    expect(fake.sessions.create).not.toHaveBeenCalled();
    expect(fake.sessions.expire).not.toHaveBeenCalled();
  });

  it("expires the member's own open session for a different plan, then creates the new one", async () => {
    open();
    fake.sessions.list.mockResolvedValue({
      data: [
        {
          id: 'cs_other_plan',
          url: 'https://checkout.stripe.test/old',
          metadata: { userId: 'user-1' },
          line_items: { data: [{ price: { id: 'price_monthly_placeholder' } }] },
        },
      ],
    });
    await createCheckoutSession({ ...input, tier: 'annual' });
    expect(fake.sessions.expire).toHaveBeenCalledWith('cs_other_plan');
    expect(fake.sessions.create).toHaveBeenCalledTimes(1);
  });

  it('never touches an open session that is not stamped with this user', async () => {
    open();
    fake.sessions.list.mockResolvedValue({
      data: [{ id: 'cs_foreign', url: 'x', metadata: {}, line_items: { data: [] } }],
    });
    await createCheckoutSession({ ...input, tier: 'monthly' });
    expect(fake.sessions.expire).not.toHaveBeenCalled();
  });

  it('creates the session with a 30-minute expiry and an idempotency key for repeated or concurrent requests', async () => {
    open();
    const before = Math.floor(Date.now() / 1000);
    await createCheckoutSession({ ...input, tier: 'monthly' });
    const [params, options] = fake.sessions.create.mock.calls[0]!;
    expect(params).toMatchObject({
      mode: 'subscription',
      customer: 'cus_placeholder',
      line_items: [{ price: 'price_monthly_placeholder', quantity: 1 }],
      metadata: { userId: 'user-1' },
    });
    expect(params.expires_at).toBeGreaterThanOrEqual(before + 30 * 60);
    expect(params.expires_at).toBeLessThanOrEqual(before + 30 * 60 + 5);
    expect(options.idempotencyKey).toMatch(/^checkout:user-1:monthly:\d+$/);
  });

  it('turns a Stripe idempotency conflict into "checkout in progress"', async () => {
    open();
    fake.sessions.create.mockRejectedValue(
      Object.assign(new Error('keys differ'), { type: 'StripeIdempotencyError' }),
    );
    await expect(createCheckoutSession({ ...input, tier: 'monthly' })).rejects.toBeInstanceOf(
      CheckoutInProgressError,
    );
  });
});

describe('ensureStripeCustomer', () => {
  it('creates the customer with a per-user idempotency key, so concurrent first requests share one', async () => {
    open();
    await expect(ensureStripeCustomer({ userId: 'user-1', email: 'm@example.test' })).resolves.toBe(
      'cus_new',
    );
    const [params, options] = fake.customers.create.mock.calls[0]!;
    expect(params).toEqual({ email: 'm@example.test', metadata: { userId: 'user-1' } });
    expect(options).toEqual({ idempotencyKey: 'customer:user-1' });
  });
});
