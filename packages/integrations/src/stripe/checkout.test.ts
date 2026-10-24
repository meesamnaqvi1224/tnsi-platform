import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));

const create = vi.fn();
const customersCreate = vi.fn();
vi.mock('./client', () => ({
  getStripeClient: () => ({
    checkout: { sessions: { create } },
    customers: { create: customersCreate },
  }),
}));

import {
  createCheckoutSession,
  ensureStripeCustomer,
  MembershipClosedError,
  UnpurchasableTierError,
} from './checkout';
import { MEMBERSHIP_TRIAL_DAYS } from './plans';

const GATE_KEYS = [
  'REGULATION_SUITE_MEMBERSHIP_OPEN',
  'STRIPE_SECRET_KEY',
  'STRIPE_WEBHOOK_SECRET',
  'STRIPE_PRICE_ID_MONTHLY',
  'STRIPE_PRICE_ID_ANNUAL',
  'STRIPE_PRICE_ID_LIFETIME',
];
const savedGate = Object.fromEntries(GATE_KEYS.map((k) => [k, process.env[k]]));

const baseInput = {
  userId: 'user-1',
  stripeCustomerId: 'cus_existing',
  idempotencyKey: 'tnsi-checkout:user-1:monthly:123',
  successUrl: 'https://example.test/ok',
  cancelUrl: 'https://example.test/cancel',
};

describe('createCheckoutSession — explicit paid checkout, never a trial', () => {
  beforeEach(() => {
    create.mockReset();
    create.mockResolvedValue({ id: 'cs_test_abc', url: 'https://checkout.stripe.test/session' });
    process.env.STRIPE_PRICE_ID_MONTHLY = 'price_monthly';
    process.env.STRIPE_PRICE_ID_ANNUAL = 'price_annual';
    delete process.env.STRIPE_PRICE_ID_LIFETIME;
    // Membership must be open (launch variable AND full configuration) for Stripe to be reached.
    process.env.STRIPE_SECRET_KEY = 'sk_test_placeholder';
    process.env.STRIPE_WEBHOOK_SECRET = 'whsec_placeholder';
    process.env.REGULATION_SUITE_MEMBERSHIP_OPEN = 'true';
  });

  afterEach(() => {
    for (const k of GATE_KEYS) {
      if (savedGate[k] === undefined) delete process.env[k];
      else process.env[k] = savedGate[k];
    }
  });

  it('displays a 30-day trial length (app-managed — see POST /api/v1/billing/trial)', () => {
    expect(MEMBERSHIP_TRIAL_DAYS).toBe(30);
  });

  it.each(['monthly', 'annual'] as const)(
    'starts a %s subscription that is charged from the start: no Stripe trial, no trial-only payment settings',
    async (tier) => {
      await createCheckoutSession({ ...baseInput, tier });
      const params = create.mock.calls[0]![0];
      expect(params.mode).toBe('subscription');
      expect(params.line_items).toEqual([{ price: `price_${tier}`, quantity: 1 }]);
      expect(params.subscription_data).toEqual({ metadata: { userId: 'user-1' } });
      expect(params.metadata).toEqual({ userId: 'user-1', tier });
      expect(params.payment_method_collection).toBeUndefined();
      expect(JSON.stringify(params)).not.toMatch(/trial/i);
    },
  );

  it('always attaches the member’s existing Stripe customer (never creates a second one)', async () => {
    await createCheckoutSession({ ...baseInput, tier: 'monthly' });
    const params = create.mock.calls[0]![0];
    expect(params.customer).toBe('cus_existing');
    expect(params.customer_email).toBeUndefined();
    expect(params.client_reference_id).toBe('user-1');
  });

  it('sends the idempotency key so a repeated or concurrent request gets the same session', async () => {
    await createCheckoutSession({ ...baseInput, tier: 'monthly' });
    expect(create.mock.calls[0]![1]).toEqual({
      idempotencyKey: 'tnsi-checkout:user-1:monthly:123',
    });
  });

  it('returns the session id and makes an abandoned session expire (30 min minimum)', async () => {
    const out = await createCheckoutSession({ ...baseInput, tier: 'monthly' });
    expect(out).toEqual({ url: 'https://checkout.stripe.test/session', sessionId: 'cs_test_abc' });
    const expiresIn = create.mock.calls[0]![0].expires_at - Math.floor(Date.now() / 1000);
    expect(expiresIn).toBeGreaterThanOrEqual(30 * 60);
    expect(expiresIn).toBeLessThanOrEqual(24 * 60 * 60);
  });

  it('has no way to request a trial: any trial option passed is ignored', async () => {
    await createCheckoutSession({ ...baseInput, tier: 'monthly', offerTrial: true } as never);
    expect(JSON.stringify(create.mock.calls[0]![0])).not.toMatch(/trial/i);
  });

  it('cannot start a Lifetime (one-time) purchase, even with a Lifetime price configured', async () => {
    process.env.STRIPE_PRICE_ID_LIFETIME = 'price_lifetime';
    await expect(
      createCheckoutSession({ ...baseInput, tier: 'lifetime' } as never),
    ).rejects.toBeInstanceOf(UnpurchasableTierError);
    expect(create).not.toHaveBeenCalled();
  });

  it('refuses (rather than fabricating a price) when a plan has no configured Stripe Price - membership stays closed', async () => {
    delete process.env.STRIPE_PRICE_ID_ANNUAL;
    await expect(createCheckoutSession({ ...baseInput, tier: 'annual' })).rejects.toBeInstanceOf(
      MembershipClosedError,
    );
    expect(create).not.toHaveBeenCalled();
  });

  it('fails if Stripe returns no URL', async () => {
    create.mockResolvedValue({ url: null });
    await expect(createCheckoutSession({ ...baseInput, tier: 'monthly' })).rejects.toThrow();
  });
});

describe('launch gate (defence in depth: the function refuses by itself)', () => {
  beforeEach(() => {
    create.mockReset();
    customersCreate.mockReset();
    process.env.STRIPE_PRICE_ID_MONTHLY = 'price_monthly';
    process.env.STRIPE_PRICE_ID_ANNUAL = 'price_annual';
    process.env.STRIPE_SECRET_KEY = 'sk_test_placeholder';
    process.env.STRIPE_WEBHOOK_SECRET = 'whsec_placeholder';
    process.env.REGULATION_SUITE_MEMBERSHIP_OPEN = 'true';
  });

  afterEach(() => {
    for (const k of GATE_KEYS) {
      if (savedGate[k] === undefined) delete process.env[k];
      else process.env[k] = savedGate[k];
    }
  });

  it('refuses, touching nothing at Stripe, when the launch variable is unset', async () => {
    delete process.env.REGULATION_SUITE_MEMBERSHIP_OPEN;
    await expect(createCheckoutSession({ ...baseInput, tier: 'monthly' })).rejects.toBeInstanceOf(
      MembershipClosedError,
    );
    await expect(
      ensureStripeCustomer({ userId: 'u', userEmail: 'a@b.test' }),
    ).rejects.toBeInstanceOf(MembershipClosedError);
    expect(create).not.toHaveBeenCalled();
    expect(customersCreate).not.toHaveBeenCalled();
  });

  it.each(['TRUE', 'True', '1', 'yes', 'on', ' true', 'true ', 'false', '', 'truee'])(
    'stays closed when the launch variable is %j (only exactly "true" opens it)',
    async (value) => {
      process.env.REGULATION_SUITE_MEMBERSHIP_OPEN = value;
      await expect(createCheckoutSession({ ...baseInput, tier: 'annual' })).rejects.toBeInstanceOf(
        MembershipClosedError,
      );
      expect(create).not.toHaveBeenCalled();
    },
  );

  it.each(['STRIPE_SECRET_KEY', 'STRIPE_WEBHOOK_SECRET', 'STRIPE_PRICE_ID_MONTHLY'])(
    'stays closed when %s is missing',
    async (missing) => {
      delete process.env[missing];
      await expect(createCheckoutSession({ ...baseInput, tier: 'monthly' })).rejects.toBeInstanceOf(
        MembershipClosedError,
      );
      expect(create).not.toHaveBeenCalled();
    },
  );
});

describe('ensureStripeCustomer', () => {
  beforeEach(() => {
    customersCreate.mockReset();
    customersCreate.mockResolvedValue({ id: 'cus_new' });
    process.env.STRIPE_PRICE_ID_MONTHLY = 'price_monthly';
    process.env.STRIPE_PRICE_ID_ANNUAL = 'price_annual';
    process.env.STRIPE_SECRET_KEY = 'sk_test_placeholder';
    process.env.STRIPE_WEBHOOK_SECRET = 'whsec_placeholder';
    process.env.REGULATION_SUITE_MEMBERSHIP_OPEN = 'true';
  });

  afterEach(() => {
    for (const k of GATE_KEYS) {
      if (savedGate[k] === undefined) delete process.env[k];
      else process.env[k] = savedGate[k];
    }
  });

  it('creates one customer tagged with the member, using an idempotency key per member', async () => {
    const id = await ensureStripeCustomer({ userId: 'user-1', userEmail: 'member@example.com' });
    expect(id).toBe('cus_new');
    expect(customersCreate).toHaveBeenCalledWith(
      { email: 'member@example.com', metadata: { userId: 'user-1' } },
      { idempotencyKey: 'tnsi-customer:user-1' },
    );
  });
});
