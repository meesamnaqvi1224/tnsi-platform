import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * Checkout launch guard, enforced server-side: closed unless membership has
 * been deliberately opened AND billing is fully configured; only the approved
 * plans (monthly, annual) can be started - never Lifetime. Auth, the database
 * and Stripe are mocked: no network, nothing is ever charged.
 */

const state = vi.hoisted(() => ({
  user: null as null | { id: string; email: string; entitlements: Record<string, unknown> | null },
  customerId: null as string | null,
  /** What the compare-and-set UPDATE returns (empty = another request already saved a customer). */
  saved: [] as { stripeCustomerId: string | null }[] | 'created',
  updates: 0,
}));

vi.mock('@/lib/auth-api', () => ({
  requireAuth: async () => {
    if (!state.user) throw new Error('UNAUTHENTICATED');
    return state.user;
  },
}));

vi.mock('@tnsi/db', () => {
  const select = {
    from: () => select,
    where: () => select,
    limit: async () => [{ stripeCustomerId: state.customerId }],
  };
  const update = {
    set: () => update,
    where: () => update,
    returning: async () => {
      state.updates += 1;
      return state.saved === 'created' ? [{ stripeCustomerId: 'cus_new' }] : state.saved;
    },
  };
  return { db: { select: () => select, update: () => update }, entitlements: {} };
});

const createCheckoutSession = vi.fn();
const ensureStripeCustomer = vi.fn();
vi.mock('@tnsi/integrations', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@tnsi/integrations')>();
  return {
    ...actual,
    createCheckoutSession: (input: unknown) => createCheckoutSession(input),
    ensureStripeCustomer: (input: unknown) => ensureStripeCustomer(input),
  };
});

const { POST } = await import('./route');
const {
  AlreadySubscribedError,
  CheckoutInProgressError,
  MembershipClosedError,
  StripeConfigError,
} = await import('@tnsi/integrations');

const KEYS = [
  'REGULATION_SUITE_MEMBERSHIP_OPEN',
  'STRIPE_SECRET_KEY',
  'STRIPE_WEBHOOK_SECRET',
  'STRIPE_PRICE_ID_MONTHLY',
  'STRIPE_PRICE_ID_ANNUAL',
  'STRIPE_PRICE_ID_LIFETIME',
];
const FREE = { tier: 'free', status: 'active' };
const saved = Object.fromEntries(KEYS.map((k) => [k, process.env[k]]));

function configureBilling() {
  process.env.STRIPE_SECRET_KEY = 'sk_test_placeholder';
  process.env.STRIPE_WEBHOOK_SECRET = 'whsec_placeholder';
  process.env.STRIPE_PRICE_ID_MONTHLY = 'price_monthly_placeholder';
  process.env.STRIPE_PRICE_ID_ANNUAL = 'price_annual_placeholder';
}

function openMembership() {
  configureBilling();
  process.env.REGULATION_SUITE_MEMBERSHIP_OPEN = 'true';
}

function request(body: unknown) {
  return new Request('http://x/api/v1/billing/checkout', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: typeof body === 'string' ? body : JSON.stringify(body),
  });
}

beforeEach(() => {
  createCheckoutSession.mockReset();
  createCheckoutSession.mockResolvedValue({ url: 'https://checkout.stripe.test/session' });
  ensureStripeCustomer.mockReset();
  ensureStripeCustomer.mockResolvedValue('cus_new');
  state.user = { id: 'user-1', email: 'member@example.com', entitlements: FREE };
  state.customerId = null;
  state.saved = 'created';
  state.updates = 0;
  for (const k of KEYS) delete process.env[k];
});

afterEach(() => {
  for (const k of KEYS) {
    if (saved[k] === undefined) delete process.env[k];
    else process.env[k] = saved[k];
  }
});

describe('POST /api/v1/billing/checkout', () => {
  it('requires authentication', async () => {
    state.user = null;
    openMembership();
    const response = await POST(request({ tier: 'monthly' }));
    expect(response.status).toBe(401);
    expect(createCheckoutSession).not.toHaveBeenCalled();
  });

  it('is closed by default (launch variable unset), even with billing configured', async () => {
    configureBilling();
    const response = await POST(request({ tier: 'monthly' }));
    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({ error: 'Billing is not available right now.' });
    expect(createCheckoutSession).not.toHaveBeenCalled();
  });

  it.each(['1', 'TRUE', 'True', 'yes', ' true', 'true ', 'false', ''])(
    'stays closed unless the launch variable is exactly "true" (got %j)',
    async (value) => {
      configureBilling();
      process.env.REGULATION_SUITE_MEMBERSHIP_OPEN = value;
      const response = await POST(request({ tier: 'monthly' }));
      expect(response.status).toBe(503);
      expect(createCheckoutSession).not.toHaveBeenCalled();
    },
  );

  it.each([
    'STRIPE_SECRET_KEY',
    'STRIPE_WEBHOOK_SECRET',
    'STRIPE_PRICE_ID_MONTHLY',
    'STRIPE_PRICE_ID_ANNUAL',
  ])('stays closed when %s is missing, and reveals no configuration', async (missing) => {
    openMembership();
    delete process.env[missing];
    const response = await POST(request({ tier: 'annual' }));
    expect(response.status).toBe(503);
    const text = JSON.stringify(await response.json());
    expect(text).toBe(JSON.stringify({ error: 'Billing is not available right now.' }));
    expect(createCheckoutSession).not.toHaveBeenCalled();
  });

  it('rejects the Lifetime plan even when membership is open and a Lifetime price exists', async () => {
    openMembership();
    process.env.STRIPE_PRICE_ID_LIFETIME = 'price_lifetime_placeholder';
    const response = await POST(request({ tier: 'lifetime' }));
    expect(response.status).toBe(400);
    expect(createCheckoutSession).not.toHaveBeenCalled();
  });

  it.each([{ tier: 'free' }, { tier: 'weekly' }, { tier: 42 }, {}, { price: 'price_x' }])(
    'rejects unsupported plan input %j',
    async (body) => {
      openMembership();
      const response = await POST(request(body));
      expect(response.status).toBe(400);
      expect(createCheckoutSession).not.toHaveBeenCalled();
    },
  );

  it('rejects malformed JSON', async () => {
    openMembership();
    const response = await POST(request('{not json'));
    expect(response.status).toBe(400);
  });

  it.each(['monthly', 'annual'] as const)(
    'starts a %s checkout only when membership is open and configured',
    async (tier) => {
      openMembership();
      const response = await POST(request({ tier }));
      expect(response.status).toBe(200);
      expect(createCheckoutSession).toHaveBeenCalledTimes(1);
      expect(createCheckoutSession.mock.calls[0]![0]).toMatchObject({
        tier,
        userId: 'user-1',
        stripeCustomerId: 'cus_new',
      });
    },
  );

  it.each([
    ['monthly', 'active'],
    ['annual', 'active'],
    ['monthly', 'trialing'],
    ['annual', 'past_due'],
    ['lifetime', 'active'],
  ])(
    'refuses a second subscription for a current %s member (%s) with 409',
    async (tier, status) => {
      openMembership();
      state.user = { id: 'user-1', email: 'm@example.com', entitlements: { tier, status } };
      const response = await POST(request({ tier: 'annual' }));
      expect(response.status).toBe(409);
      expect((await response.json()).error.code).toBe('ALREADY_A_MEMBER');
      expect(createCheckoutSession).not.toHaveBeenCalled();
      expect(ensureStripeCustomer).not.toHaveBeenCalled();
    },
  );

  it.each([
    ['free', 'active'],
    ['monthly', 'canceled'],
    ['annual', 'expired'],
  ])('lets an eligible %s account with status %s start a checkout', async (tier, status) => {
    openMembership();
    state.user = { id: 'user-1', email: 'm@example.com', entitlements: { tier, status } };
    const response = await POST(request({ tier: 'monthly' }));
    expect(response.status).toBe(200);
  });

  it('reuses the saved Stripe customer and does not create another', async () => {
    openMembership();
    state.customerId = 'cus_existing';
    await POST(request({ tier: 'monthly' }));
    expect(ensureStripeCustomer).not.toHaveBeenCalled();
    expect(createCheckoutSession.mock.calls[0]![0]).toMatchObject({
      stripeCustomerId: 'cus_existing',
    });
  });

  it('creates and saves a customer once for a first purchase', async () => {
    openMembership();
    await POST(request({ tier: 'monthly' }));
    expect(ensureStripeCustomer).toHaveBeenCalledWith({
      userId: 'user-1',
      email: 'member@example.com',
    });
    expect(state.updates).toBe(1);
  });

  it("uses the winner's customer when a concurrent request saved one first", async () => {
    openMembership();
    state.saved = [{ stripeCustomerId: 'cus_winner' }];
    await POST(request({ tier: 'annual' }));
    expect(createCheckoutSession.mock.calls[0]![0]).toMatchObject({
      stripeCustomerId: 'cus_winner',
    });
  });

  it('answers 409 when Stripe reports a live subscription the local row did not show', async () => {
    openMembership();
    createCheckoutSession.mockRejectedValue(new AlreadySubscribedError('exists'));
    const response = await POST(request({ tier: 'monthly' }));
    expect(response.status).toBe(409);
    expect((await response.json()).error.code).toBe('ALREADY_A_MEMBER');
  });

  it('answers 409 for a repeated identical request that is already in progress', async () => {
    openMembership();
    createCheckoutSession.mockRejectedValue(new CheckoutInProgressError('busy'));
    const response = await POST(request({ tier: 'monthly' }));
    expect(response.status).toBe(409);
    expect((await response.json()).error.code).toBe('CHECKOUT_IN_PROGRESS');
  });

  it('answers 503 without detail if the integration itself refuses (closed)', async () => {
    openMembership();
    createCheckoutSession.mockRejectedValue(new MembershipClosedError('Membership is not open.'));
    const response = await POST(request({ tier: 'monthly' }));
    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({ error: 'Billing is not available right now.' });
  });

  it('never echoes a configuration error message or any secret value', async () => {
    openMembership();
    createCheckoutSession.mockRejectedValue(
      new StripeConfigError('Stripe is not configured - set STRIPE_SECRET_KEY=sk_test_placeholder'),
    );
    const response = await POST(request({ tier: 'annual' }));
    const text = JSON.stringify(await response.json());
    expect(response.status).toBe(503);
    expect(text).not.toMatch(/sk_|whsec_|price_|STRIPE_/);
  });

  it('answers a generic 500 for an unexpected failure, with no internal detail', async () => {
    openMembership();
    createCheckoutSession.mockRejectedValue(new Error('boom sk_test_placeholder'));
    const logged = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const response = await POST(request({ tier: 'monthly' }));
    expect(response.status).toBe(500);
    expect(JSON.stringify(await response.json())).not.toMatch(/boom|sk_/);
    expect(JSON.stringify(logged.mock.calls)).not.toMatch(/boom|sk_/);
    logged.mockRestore();
  });
});
