import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * GET /api/v1/me/entitlements - the member-facing contract the web app and the
 * native app read. The resolved `membership` is computed by the same function
 * every access check uses; the new trial / paid-through / grace-reason fields
 * are additive, and billing identifiers must never appear.
 */

const state = vi.hoisted(() => ({
  user: null as null | { entitlements: Record<string, unknown> | null },
}));

vi.mock('@/lib/auth-api', () => ({ getAuthUser: async () => state.user }));

const { GET } = await import('./route');

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

const DAY = 24 * 60 * 60 * 1000;

function row(overrides: Record<string, unknown> = {}) {
  return {
    userId: 'u1',
    tier: 'free',
    status: 'active',
    programs: [],
    certifications: [],
    features: [],
    stripeCustomerId: null,
    stripeSubscriptionId: null,
    currentPeriodStart: null,
    currentPeriodEnd: null,
    cancelAtPeriodEnd: false,
    canceledAt: null,
    paymentFailedAt: null,
    trialStartedAt: null,
    trialEndsAt: null,
    stripeSyncedAt: null,
    metadata: {},
    ...overrides,
  };
}

async function read() {
  const res = await GET();
  return { status: res.status, body: (await res.json()).data };
}

beforeEach(() => {
  for (const k of KEYS) delete process.env[k];
  state.user = { entitlements: row() };
});
afterEach(() => {
  for (const k of KEYS) {
    if (saved[k] === undefined) delete process.env[k];
    else process.env[k] = saved[k];
  }
});

describe('GET /api/v1/me/entitlements - membership summary', () => {
  it('requires sign-in', async () => {
    state.user = null;
    expect((await GET()).status).toBe(401);
  });

  it('a Free account while membership is closed: free, no locking, no trial offered', async () => {
    const { body } = await read();
    expect(body.membership).toMatchObject({
      state: 'free',
      hasPaidAccess: false,
      contentLocking: false,
      trialAvailable: false,
      trialEndsAt: null,
      trialExpired: false,
    });
  });

  it('once membership is open, an unused Free account is offered the trial', async () => {
    openMembership();
    expect((await read()).body.membership).toMatchObject({ state: 'free', trialAvailable: true });
  });

  it('an unexpired trial reports trialing with full paid access and its end date', async () => {
    openMembership();
    const ends = new Date(Date.now() + 20 * DAY);
    state.user = {
      entitlements: row({ trialStartedAt: new Date(Date.now() - 10 * DAY), trialEndsAt: ends }),
    };
    const { body } = await read();
    expect(body.membership).toMatchObject({
      state: 'trialing',
      hasPaidAccess: true,
      trialAvailable: false,
      trialExpired: false,
    });
    expect(new Date(body.membership.trialEndsAt).getTime()).toBe(ends.getTime());
  });

  it('an expired trial is Free again, flagged as expired, and is not offered another', async () => {
    openMembership();
    state.user = {
      entitlements: row({
        trialStartedAt: new Date(Date.now() - 40 * DAY),
        trialEndsAt: new Date(Date.now() - 10 * DAY),
      }),
    };
    expect((await read()).body.membership).toMatchObject({
      state: 'free',
      hasPaidAccess: false,
      trialExpired: true,
      trialAvailable: false,
      trialEndsAt: null,
    });
  });

  it('a Stripe-backed member reports the paid-through date and is not offered a trial', async () => {
    openMembership();
    const end = new Date(Date.now() + 12 * DAY);
    state.user = {
      entitlements: row({
        tier: 'annual',
        stripeSubscriptionId: 'sub_1',
        currentPeriodEnd: end,
        cancelAtPeriodEnd: true,
      }),
    };
    const { body } = await read();
    expect(body.membership).toMatchObject({
      state: 'active',
      hasPaidAccess: true,
      cancelsAtPeriodEnd: true,
      trialAvailable: false,
    });
    expect(new Date(body.membership.paidThrough).getTime()).toBe(end.getTime());
  });

  it('a failed payment reports the grace and its reason', async () => {
    openMembership();
    state.user = {
      entitlements: row({
        tier: 'monthly',
        status: 'past_due',
        stripeSubscriptionId: 'sub_1',
        currentPeriodEnd: new Date(Date.now() - 1 * DAY),
        paymentFailedAt: new Date(Date.now() - 2 * DAY),
      }),
    };
    expect((await read()).body.membership).toMatchObject({
      state: 'grace',
      hasPaidAccess: true,
      graceReason: 'payment_failed',
    });
  });

  it('a legacy Lifetime member is active and never offered a trial', async () => {
    openMembership();
    state.user = { entitlements: row({ tier: 'lifetime' }) };
    expect((await read()).body.membership).toMatchObject({
      state: 'active',
      hasPaidAccess: true,
      trialAvailable: false,
    });
  });
});

describe('GET /api/v1/me/entitlements - what is never exposed', () => {
  it('keeps the top-level allowlist: no Stripe ids, trial dates, sync time or user id', async () => {
    state.user = {
      entitlements: row({
        tier: 'monthly',
        stripeCustomerId: 'cus_secret',
        stripeSubscriptionId: 'sub_secret',
        trialStartedAt: new Date(),
        trialEndsAt: new Date(Date.now() + DAY),
        stripeSyncedAt: new Date(),
      }),
    };
    const { body } = await read();
    expect(Object.keys(body).sort()).toEqual(
      [
        'tier',
        'status',
        'programs',
        'certifications',
        'features',
        'currentPeriodEnd',
        'cancelAtPeriodEnd',
        'canceledAt',
        'membership',
      ].sort(),
    );
    const text = JSON.stringify(body);
    expect(text).not.toContain('cus_secret');
    expect(text).not.toContain('sub_secret');
    expect(text).not.toContain('stripeSyncedAt');
  });

  it('the no-row fallback also carries the new membership fields', async () => {
    state.user = { entitlements: null };
    const { body } = await read();
    expect(body.membership).toMatchObject({ state: 'inactive', trialAvailable: false });
  });
});
