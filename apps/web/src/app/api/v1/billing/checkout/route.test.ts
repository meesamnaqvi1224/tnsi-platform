import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * Checkout route: what it accepts, refuses and reports. The locking, the
 * single Stripe customer and the idempotent session are exercised against real
 * PostgreSQL in stripe-sync.integration.test.ts ("concurrent and repeated
 * checkout"); here `startCheckout` is replaced so the route's own rules are
 * isolated. Nothing is ever charged and Stripe is never called.
 */

const state = vi.hoisted(() => ({
  user: null as null | { id: string; email: string },
}));

vi.mock('@/lib/auth-api', () => ({
  requireAuth: async () => {
    if (!state.user) throw new Error('UNAUTHENTICATED');
    return state.user;
  },
}));

const startCheckout = vi.fn();
vi.mock('@/lib/start-checkout', () => ({
  startCheckout: (...args: unknown[]) => startCheckout(...args),
}));

const { POST } = await import('./route');
const { MembershipClosedError, StripeConfigError } = await import('@tnsi/integrations');

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

function request(tier: string) {
  return new Request('http://x/api/v1/billing/checkout', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ tier }),
  });
}

beforeEach(() => {
  startCheckout.mockReset();
  startCheckout.mockResolvedValue({ status: 'created', url: 'https://checkout.stripe.test/s' });
  state.user = { id: 'user-1', email: 'member@example.com' };
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
    expect(startCheckout).not.toHaveBeenCalled();
  });

  it('is refused for an unauthenticated caller (401)', async () => {
    openMembership();
    state.user = null;
    expect((await POST(request('monthly'))).status).toBe(401);
    expect(startCheckout).not.toHaveBeenCalled();
  });

  it.each(['monthly', 'annual'] as const)(
    'starts a %s checkout — an explicit plan choice, with no trial option',
    async (tier) => {
      openMembership();
      const res = await POST(request(tier));
      expect(res.status).toBe(200);
      expect((await res.json()).data.url).toBe('https://checkout.stripe.test/s');
      const input = startCheckout.mock.calls[0]![0];
      expect(input).toMatchObject({ userId: 'user-1', userEmail: 'member@example.com', tier });
      expect(input).not.toHaveProperty('offerTrial');
    },
  );

  it.each(['lifetime', 'Lifetime', 'platinum', '', 'free'])(
    'rejects the tier %j before anything is started — Lifetime is closed to new purchases',
    async (tier) => {
      openMembership();
      const res = await POST(request(tier));
      expect(res.status).toBe(400);
      expect(startCheckout).not.toHaveBeenCalled();
    },
  );

  it('even with a Lifetime Price configured, "lifetime" cannot be requested', async () => {
    openMembership();
    process.env.STRIPE_PRICE_ID_LIFETIME = 'price_lifetime';
    try {
      expect((await POST(request('lifetime'))).status).toBe(400);
      expect(startCheckout).not.toHaveBeenCalled();
    } finally {
      delete process.env.STRIPE_PRICE_ID_LIFETIME;
    }
  });

  it('refuses a second subscription (409) for a member who already has paid access', async () => {
    openMembership();
    startCheckout.mockResolvedValue({ status: 'already_a_member' });
    const res = await POST(request('monthly'));
    expect(res.status).toBe(409);
    expect((await res.json()).error.code).toBe('ALREADY_A_MEMBER');
  });

  it('hands back an existing open session for the same plan (200) as if it were new', async () => {
    openMembership();
    startCheckout.mockResolvedValue({ status: 'reused', url: 'https://checkout.stripe.test/old' });
    const res = await POST(request('monthly'));
    expect(res.status).toBe(200);
    expect((await res.json()).data.url).toBe('https://checkout.stripe.test/old');
  });

  it('refuses (409) while an earlier completed checkout is still being confirmed', async () => {
    openMembership();
    startCheckout.mockResolvedValue({ status: 'checkout_in_progress' });
    const res = await POST(request('annual'));
    expect(res.status).toBe(409);
    expect((await res.json()).error.code).toBe('CHECKOUT_IN_PROGRESS');
  });

  it('pauses checkout (409) for a member whose second subscription is awaiting manual review', async () => {
    openMembership();
    startCheckout.mockResolvedValue({ status: 'review_required' });
    const res = await POST(request('monthly'));
    expect(res.status).toBe(409);
    expect((await res.json()).error.code).toBe('REVIEW_REQUIRED');
  });

  it('asks Stripe to return the session id, and never puts a real id in the URL itself', async () => {
    openMembership();
    await POST(request('monthly'));
    const { successUrl, cancelUrl } = startCheckout.mock.calls[0]![0];
    expect(successUrl).toContain(
      '/dashboard/billing?success=true&session_id={CHECKOUT_SESSION_ID}',
    );
    expect(cancelUrl).not.toContain('session_id');
  });

  it('refuses an account with no member row (403)', async () => {
    openMembership();
    startCheckout.mockResolvedValue({ status: 'no_account' });
    expect((await POST(request('monthly'))).status).toBe(403);
  });

  it('a plan with no Stripe Price answers 400, never a fabricated price', async () => {
    openMembership();
    const { UnpurchasableTierError } = await import('@tnsi/integrations');
    startCheckout.mockRejectedValue(new UnpurchasableTierError('No Stripe price is configured'));
    expect((await POST(request('annual'))).status).toBe(400);
  });

  it('rejects a malformed body (400)', async () => {
    openMembership();
    const res = await POST(
      new Request('http://x/api/v1/billing/checkout', { method: 'POST', body: 'not json' }),
    );
    expect(res.status).toBe(400);
  });

  it('logs only a safe summary of an unexpected failure, and returns a generic 500', async () => {
    openMembership();
    const logged: string[] = [];
    const spy = vi.spyOn(console, 'error').mockImplementation((...args: unknown[]) => {
      logged.push(JSON.stringify(args));
    });
    try {
      startCheckout.mockRejectedValue(
        Object.assign(new Error('failed for member@example.com with key sk_live_SECRET'), {
          code: '23505',
        }),
      );
      const res = await POST(request('monthly'));
      expect(res.status).toBe(500);
      const text = logged.join('') + JSON.stringify(await res.json());
      expect(text).not.toContain('member@example.com');
      expect(text).not.toContain('sk_live_SECRET');
      expect(text).toContain('23505');
    } finally {
      spy.mockRestore();
    }
  });

  // --- Launch-gate strictness (owner decision: closed unless exactly "true" AND fully configured) ---

  it.each(['TRUE', 'True', '1', 'yes', 'on', ' true', 'true ', 'false', '', 'truee'])(
    'stays closed (503) when the launch variable is %j, even with billing fully configured',
    async (value) => {
      openMembership();
      process.env.REGULATION_SUITE_MEMBERSHIP_OPEN = value;
      const response = await POST(request('monthly'));
      expect(response.status).toBe(503);
      expect(startCheckout).not.toHaveBeenCalled();
    },
  );

  it.each([
    'STRIPE_SECRET_KEY',
    'STRIPE_WEBHOOK_SECRET',
    'STRIPE_PRICE_ID_MONTHLY',
    'STRIPE_PRICE_ID_ANNUAL',
  ])('stays closed (503, generic message) when %s is missing', async (missing) => {
    openMembership();
    delete process.env[missing];
    const response = await POST(request('annual'));
    expect(response.status).toBe(503);
    expect(JSON.stringify(await response.json())).toBe(
      JSON.stringify({ error: 'Billing is not available right now.' }),
    );
    expect(startCheckout).not.toHaveBeenCalled();
  });

  it('answers 503 without detail if the integration itself refuses because membership is closed', async () => {
    openMembership();
    startCheckout.mockRejectedValue(new MembershipClosedError('Membership is not open.'));
    const response = await POST(request('monthly'));
    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({ error: 'Billing is not available right now.' });
  });

  it('never echoes a configuration error message or any secret value', async () => {
    openMembership();
    startCheckout.mockRejectedValue(
      new StripeConfigError('Stripe is not configured - set STRIPE_SECRET_KEY=sk_test_placeholder'),
    );
    const response = await POST(request('annual'));
    expect(response.status).toBe(503);
    expect(JSON.stringify(await response.json())).not.toMatch(/sk_|whsec_|price_|STRIPE_/);
  });
});
