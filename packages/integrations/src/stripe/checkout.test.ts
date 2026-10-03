import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));

const create = vi.fn();
vi.mock('./client', () => ({
  getStripeClient: () => ({ checkout: { sessions: { create } } }),
}));

import { createCheckoutSession, UnpurchasableTierError } from './checkout';
import { MEMBERSHIP_TRIAL_DAYS } from './plans';

const baseInput = {
  userId: 'user-1',
  userEmail: 'member@example.com',
  existingStripeCustomerId: null,
  successUrl: 'https://example.test/ok',
  cancelUrl: 'https://example.test/cancel',
};

describe('createCheckoutSession — 30-day trial', () => {
  beforeEach(() => {
    create.mockReset();
    create.mockResolvedValue({ url: 'https://checkout.stripe.test/session' });
    process.env.STRIPE_PRICE_ID_MONTHLY = 'price_monthly';
    process.env.STRIPE_PRICE_ID_ANNUAL = 'price_annual';
    delete process.env.STRIPE_PRICE_ID_LIFETIME;
  });

  it('is a 30-day trial', () => {
    expect(MEMBERSHIP_TRIAL_DAYS).toBe(30);
  });

  it.each(['monthly', 'annual'] as const)(
    'starts a %s subscription with Stripe-native trial_period_days and collects a payment method up front',
    async (tier) => {
      await createCheckoutSession({ ...baseInput, tier, offerTrial: true });
      const params = create.mock.calls[0]![0];
      expect(params.mode).toBe('subscription');
      expect(params.line_items).toEqual([{ price: `price_${tier}`, quantity: 1 }]);
      expect(params.subscription_data.trial_period_days).toBe(30);
      expect(params.subscription_data.metadata).toEqual({ userId: 'user-1' });
      expect(params.payment_method_collection).toBe('always');
    },
  );

  it('offers no trial when the caller says the member is not eligible (e.g. already had a subscription)', async () => {
    await createCheckoutSession({ ...baseInput, tier: 'monthly', offerTrial: false });
    const params = create.mock.calls[0]![0];
    expect(params.subscription_data.trial_period_days).toBeUndefined();
    expect(params.payment_method_collection).toBeUndefined();
  });

  it('never adds a trial to a one-time (lifetime) purchase', async () => {
    process.env.STRIPE_PRICE_ID_LIFETIME = 'price_lifetime';
    await createCheckoutSession({ ...baseInput, tier: 'lifetime', offerTrial: true });
    const params = create.mock.calls[0]![0];
    expect(params.mode).toBe('payment');
    expect(params.subscription_data).toBeUndefined();
    expect(params.payment_method_collection).toBeUndefined();
  });

  it('refuses (rather than fabricating a price) when the plan has no configured Stripe Price', async () => {
    delete process.env.STRIPE_PRICE_ID_ANNUAL;
    await expect(
      createCheckoutSession({ ...baseInput, tier: 'annual', offerTrial: true }),
    ).rejects.toBeInstanceOf(UnpurchasableTierError);
    expect(create).not.toHaveBeenCalled();
  });

  it('reuses an existing Stripe customer instead of creating a second one', async () => {
    await createCheckoutSession({
      ...baseInput,
      tier: 'monthly',
      offerTrial: true,
      existingStripeCustomerId: 'cus_existing',
    });
    const params = create.mock.calls[0]![0];
    expect(params.customer).toBe('cus_existing');
    expect(params.customer_email).toBeUndefined();
  });
});
