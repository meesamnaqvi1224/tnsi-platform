import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));

const create = vi.fn();
vi.mock('./client', () => ({
  getStripeClient: () => ({ billingPortal: { sessions: { create } } }),
}));

import { createBillingPortalSession, NoStripeCustomerError } from './portal';

/** The portal is for an existing customer only; Stripe is a spy and nothing is created. */
const original = process.env.STRIPE_PORTAL_CONFIGURATION_ID;

beforeEach(() => {
  create.mockReset();
  create.mockResolvedValue({ url: 'https://portal.stripe.test/p' });
  delete process.env.STRIPE_PORTAL_CONFIGURATION_ID;
});

afterEach(() => {
  if (original === undefined) delete process.env.STRIPE_PORTAL_CONFIGURATION_ID;
  else process.env.STRIPE_PORTAL_CONFIGURATION_ID = original;
});

describe('createBillingPortalSession', () => {
  it('refuses an account with no Stripe customer, without calling Stripe', async () => {
    await expect(
      createBillingPortalSession({ stripeCustomerId: null, returnUrl: 'https://example.test/b' }),
    ).rejects.toBeInstanceOf(NoStripeCustomerError);
    expect(create).not.toHaveBeenCalled();
  });

  it("opens the portal for exactly the given customer, with Stripe's default configuration when none is set", async () => {
    await createBillingPortalSession({
      stripeCustomerId: 'cus_placeholder',
      returnUrl: 'https://example.test/b',
    });
    expect(create).toHaveBeenCalledWith({
      customer: 'cus_placeholder',
      return_url: 'https://example.test/b',
    });
  });

  it('uses the restricted portal configuration when the owner has set one', async () => {
    process.env.STRIPE_PORTAL_CONFIGURATION_ID = 'bpc_placeholder';
    await createBillingPortalSession({
      stripeCustomerId: 'cus_placeholder',
      returnUrl: 'https://example.test/b',
    });
    expect(create.mock.calls[0]![0]).toMatchObject({ configuration: 'bpc_placeholder' });
  });
});
