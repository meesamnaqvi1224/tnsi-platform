import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));

const create = vi.fn();
vi.mock('./client', () => ({
  getStripeClient: () => ({ checkout: { sessions: { create } } }),
}));

import { createCheckoutSession, MembershipClosedError, UnpurchasableTierError } from './checkout';

/**
 * createCheckoutSession is the only code that creates a Stripe Checkout Session.
 * It must refuse by itself while membership is closed, whatever the caller does.
 * Stripe is a spy here: nothing is ever created or charged.
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
  userEmail: 'member@example.com',
  existingStripeCustomerId: null,
  successUrl: 'https://example.test/ok',
  cancelUrl: 'https://example.test/cancel',
};

beforeEach(() => {
  create.mockReset();
  create.mockResolvedValue({ url: 'https://checkout.stripe.test/session' });
  for (const k of KEYS) delete process.env[k];
});

afterEach(() => {
  for (const k of KEYS) {
    if (saved[k] === undefined) delete process.env[k];
    else process.env[k] = saved[k];
  }
});

describe('createCheckoutSession', () => {
  it('refuses, without calling Stripe, when the launch variable is unset', async () => {
    open();
    delete process.env.REGULATION_SUITE_MEMBERSHIP_OPEN;
    await expect(createCheckoutSession({ ...input, tier: 'monthly' })).rejects.toBeInstanceOf(
      MembershipClosedError,
    );
    expect(create).not.toHaveBeenCalled();
  });

  it.each(['TRUE', '1', 'yes', ' true', 'true ', 'false', ''])(
    'refuses, without calling Stripe, when the launch variable is %j',
    async (value) => {
      open();
      process.env.REGULATION_SUITE_MEMBERSHIP_OPEN = value;
      await expect(createCheckoutSession({ ...input, tier: 'annual' })).rejects.toBeInstanceOf(
        MembershipClosedError,
      );
      expect(create).not.toHaveBeenCalled();
    },
  );

  it('refuses when billing is only partly configured', async () => {
    open();
    delete process.env.STRIPE_PRICE_ID_ANNUAL;
    await expect(createCheckoutSession({ ...input, tier: 'monthly' })).rejects.toBeInstanceOf(
      MembershipClosedError,
    );
    expect(create).not.toHaveBeenCalled();
  });

  it('refuses Lifetime even when open and a Lifetime price exists, without calling Stripe', async () => {
    open();
    process.env.STRIPE_PRICE_ID_LIFETIME = 'price_lifetime_placeholder';
    await expect(
      createCheckoutSession({ ...input, tier: 'lifetime' as never }),
    ).rejects.toBeInstanceOf(UnpurchasableTierError);
    expect(create).not.toHaveBeenCalled();
  });

  it.each([
    ['monthly', 'price_monthly_placeholder'],
    ['annual', 'price_annual_placeholder'],
  ] as const)(
    'creates a subscription session for %s only when open and configured',
    async (tier, price) => {
      open();
      await expect(createCheckoutSession({ ...input, tier })).resolves.toEqual({
        url: 'https://checkout.stripe.test/session',
      });
      expect(create).toHaveBeenCalledTimes(1);
      expect(create.mock.calls[0]![0]).toMatchObject({
        mode: 'subscription',
        line_items: [{ price, quantity: 1 }],
        metadata: { userId: 'user-1' },
      });
    },
  );
});
