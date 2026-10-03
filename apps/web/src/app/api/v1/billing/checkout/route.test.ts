import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * Checkout route rules, enforced server-side: closed until membership is
 * open, no second subscription for a current member, and the 30-day trial
 * only for an account that has never had a subscription. Auth, the database
 * and Stripe are mocked — no network, nothing is ever charged.
 */

const state = vi.hoisted(() => ({
  user: null as null | { id: string; email: string; entitlements: Record<string, unknown> | null },
  row: null as null | { stripeCustomerId: string | null; stripeSubscriptionId: string | null },
}));

vi.mock('@/lib/auth-api', () => ({
  requireAuth: async () => {
    if (!state.user) throw new Error('UNAUTHENTICATED');
    return state.user;
  },
}));

vi.mock('@tnsi/db', () => {
  const chain = {
    from: () => chain,
    where: () => chain,
    limit: async () => (state.row ? [state.row] : []),
  };
  return { db: { select: () => chain }, entitlements: {} };
});

const createCheckoutSession = vi.fn();
vi.mock('@tnsi/integrations', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@tnsi/integrations')>();
  return { ...actual, createCheckoutSession: (input: unknown) => createCheckoutSession(input) };
});

const { POST } = await import('./route');

const KEYS = [
  'REGULATION_SUITE_MEMBERSHIP_OPEN',
  'STRIPE_SECRET_KEY',
  'STRIPE_WEBHOOK_SECRET',
  'STRIPE_PRICE_ID_MONTHLY',
  'STRIPE_PRICE_ID_ANNUAL',
];
const saved = Object.fromEntries(KEYS.map((k) => [k, process.env[k]]));

function openMembership() {
  process.env.REGULATION_SUITE_MEMBERSHIP_OPEN = 'true';
  process.env.STRIPE_SECRET_KEY = 'sk_test_x';
  process.env.STRIPE_WEBHOOK_SECRET = 'whsec_x';
  process.env.STRIPE_PRICE_ID_MONTHLY = 'price_m';
  process.env.STRIPE_PRICE_ID_ANNUAL = 'price_a';
}

const free = {
  tier: 'free',
  status: 'active',
  programs: [],
  certifications: [],
  features: [],
  cancelAtPeriodEnd: false,
  paymentFailedAt: null,
};

function request(tier: string) {
  return new Request('http://x/api/v1/billing/checkout', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ tier }),
  });
}

beforeEach(() => {
  createCheckoutSession.mockReset();
  createCheckoutSession.mockResolvedValue({ url: 'https://checkout.stripe.test/s' });
  state.user = { id: 'user-1', email: 'member@example.com', entitlements: free };
  state.row = { stripeCustomerId: null, stripeSubscriptionId: null };
  for (const k of KEYS) delete process.env[k];
});
afterEach(() => {
  for (const k of KEYS) {
    if (saved[k] === undefined) delete process.env[k];
    else process.env[k] = saved[k];
  }
});

describe('POST /api/v1/billing/checkout', () => {
  it('is refused (503) while membership is closed — no checkout is started', async () => {
    const res = await POST(request('monthly'));
    expect(res.status).toBe(503);
    expect(createCheckoutSession).not.toHaveBeenCalled();
  });

  it('is refused for an unauthenticated caller (401)', async () => {
    openMembership();
    state.user = null;
    const res = await POST(request('monthly'));
    expect(res.status).toBe(401);
    expect(createCheckoutSession).not.toHaveBeenCalled();
  });

  it.each(['monthly', 'annual'] as const)(
    'starts a %s checkout WITH the trial for an account that has never subscribed',
    async (tier) => {
      openMembership();
      const res = await POST(request(tier));
      expect(res.status).toBe(200);
      const input = createCheckoutSession.mock.calls[0]![0];
      expect(input.tier).toBe(tier);
      expect(input.offerTrial).toBe(true);
      expect(input.userId).toBe('user-1');
    },
  );

  it('offers NO trial to an account that has had a subscription before', async () => {
    openMembership();
    state.row = { stripeCustomerId: 'cus_1', stripeSubscriptionId: 'sub_old' };
    state.user!.entitlements = { ...free, tier: 'monthly', status: 'canceled' };
    const res = await POST(request('monthly'));
    expect(res.status).toBe(200);
    expect(createCheckoutSession.mock.calls[0]![0].offerTrial).toBe(false);
    expect(createCheckoutSession.mock.calls[0]![0].existingStripeCustomerId).toBe('cus_1');
  });

  it.each([
    ['trialing', { tier: 'monthly', status: 'trialing' }],
    ['active', { tier: 'annual', status: 'active' }],
    ['in payment grace', { tier: 'monthly', status: 'past_due', paymentFailedAt: new Date() }],
  ])('refuses a second subscription (409) for a member who is %s', async (_label, patch) => {
    openMembership();
    state.user!.entitlements = { ...free, ...patch };
    const res = await POST(request('monthly'));
    expect(res.status).toBe(409);
    expect(createCheckoutSession).not.toHaveBeenCalled();
  });

  it('rejects an unknown tier before anything is sent to Stripe', async () => {
    openMembership();
    const res = await POST(request('platinum'));
    expect(res.status).toBe(400);
    expect(createCheckoutSession).not.toHaveBeenCalled();
  });
});
