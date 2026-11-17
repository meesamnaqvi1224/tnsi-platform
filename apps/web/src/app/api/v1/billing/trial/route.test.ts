import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createInMemoryTrialDatabase } from '@tnsi/auth/trial/testing';
import { buildEligibilityKeys, loadTrialKeyConfig } from '@tnsi/auth/trial/email';

/**
 * POST /api/v1/billing/trial, end to end through the real route and the real
 * claim logic, with the database replaced by an in-memory model of its
 * contract (primary-key conflicts, blocking inserts, rollback) and the identity
 * provider replaced by a fake. No network, no Stripe, nothing is ever charged.
 */

const SECRET = 'k1_Zm9vYmFyYmF6cXV4cXV1eHF1dXhxdXV4MTIzNDU2Nzg5MA==';

type Row = {
  tier: string;
  status: string;
  stripeSubscriptionId: string | null;
  trialStartedAt: Date | null;
  trialEndsAt: Date | null;
};

const state = vi.hoisted(() => ({
  user: null as null | {
    id: string;
    clerkUserId: string;
    entitlements: Record<string, unknown> | null;
  },
  providerUsers: {} as Record<string, unknown>,
  providerFails: false,
  db: null as null | ReturnType<
    typeof import('@tnsi/auth/trial/testing').createInMemoryTrialDatabase
  >,
}));

vi.mock('@/lib/auth-api', () => ({
  requireAuth: async () => {
    if (!state.user) throw new Error('UNAUTHENTICATED');
    return state.user;
  },
}));

vi.mock('@/lib/trial', () => ({
  runTrialTransaction: (fn: never) => state.db!.runTransaction(fn),
}));

vi.mock('@tnsi/auth/verify/email', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@tnsi/auth/verify/email')>();
  return {
    ...actual,
    fetchProviderUserEmails: async (clerkUserId: string) => {
      if (state.providerFails) throw new actual.ProviderLookupError();
      return state.providerUsers[clerkUserId];
    },
  };
});

const { POST } = await import('./route');

const ENV_KEYS = [
  'REGULATION_SUITE_MEMBERSHIP_OPEN',
  'STRIPE_SECRET_KEY',
  'STRIPE_WEBHOOK_SECRET',
  'STRIPE_PRICE_ID_MONTHLY',
  'STRIPE_PRICE_ID_ANNUAL',
  'TRIAL_ELIGIBILITY_SECRET',
  'TRIAL_ELIGIBILITY_KEY_VERSION',
  'TRIAL_ELIGIBILITY_PREVIOUS_KEYS',
];
const saved = Object.fromEntries(ENV_KEYS.map((k) => [k, process.env[k]]));

function openMembership() {
  process.env.REGULATION_SUITE_MEMBERSHIP_OPEN = 'true';
  process.env.STRIPE_SECRET_KEY = 'sk_test_x';
  process.env.STRIPE_WEBHOOK_SECRET = 'whsec_x';
  process.env.STRIPE_PRICE_ID_MONTHLY = 'price_m';
  process.env.STRIPE_PRICE_ID_ANNUAL = 'price_a';
}
function configureTrialKey() {
  process.env.TRIAL_ELIGIBILITY_SECRET = SECRET;
  process.env.TRIAL_ELIGIBILITY_KEY_VERSION = '1';
}

function providerUser(email: string, status = 'verified') {
  return {
    primaryEmailAddressId: 'e1',
    emailAddresses: [{ id: 'e1', emailAddress: email, verification: { status } }],
  };
}

/** A signed-in member whose account row exists both in the route's view and in the model database. */
function signIn(
  userId: string,
  email: string,
  overrides: Partial<Row> = {},
  verifyStatus = 'verified',
) {
  const row: Row = {
    tier: 'free',
    status: 'active',
    stripeSubscriptionId: null,
    trialStartedAt: null,
    trialEndsAt: null,
    ...overrides,
  };
  state.providerUsers[`clerk_${userId}`] = providerUser(email, verifyStatus);
  state.db!.seedEntitlement(userId, row as never);
  state.user = { id: userId, clerkUserId: `clerk_${userId}`, entitlements: row };
}

let errorSpy: ReturnType<typeof vi.spyOn>;
let logged: string;

beforeEach(() => {
  state.db = createInMemoryTrialDatabase();
  state.user = null;
  state.providerUsers = {};
  state.providerFails = false;
  for (const k of ENV_KEYS) delete process.env[k];
  openMembership();
  configureTrialKey();
  errorSpy = vi.spyOn(console, 'error').mockImplementation((...args: unknown[]) => {
    logged += JSON.stringify(args);
  });
  logged = '';
});
afterEach(() => {
  errorSpy.mockRestore();
  for (const k of ENV_KEYS) {
    if (saved[k] === undefined) delete process.env[k];
    else process.env[k] = saved[k];
  }
});

describe('POST /api/v1/billing/trial', () => {
  it('requires sign-in (401)', async () => {
    expect((await POST()).status).toBe(401);
  });

  it('is refused (503) while membership is closed - nothing is claimed', async () => {
    delete process.env.REGULATION_SUITE_MEMBERSHIP_OPEN;
    signIn('u1', 'jane@example.com');
    const res = await POST();
    expect(res.status).toBe(503);
    expect((await res.json()).error.code).toBe('TRIAL_UNAVAILABLE');
    expect(state.db!.claims()).toHaveLength(0);
  });

  it.each(['TRUE', '1', 'yes', ' true', 'true ', 'false', ''])(
    'stays closed (503) unless the launch variable is exactly "true" (got %j) - nothing is claimed',
    async (value) => {
      process.env.REGULATION_SUITE_MEMBERSHIP_OPEN = value;
      signIn('u1', 'jane@example.com');
      const res = await POST();
      expect(res.status).toBe(503);
      expect(state.db!.claims()).toHaveLength(0);
    },
  );

  it('stays closed (503) when billing is only partly configured - nothing is claimed', async () => {
    delete process.env.STRIPE_PRICE_ID_ANNUAL;
    signIn('u1', 'jane@example.com');
    const res = await POST();
    expect(res.status).toBe(503);
    expect(state.db!.claims()).toHaveLength(0);
  });

  it('gives a plus-tagged address its own trial: only exact normalised matches share one', async () => {
    signIn('u1', 'jane@example.com');
    signIn('u2', 'jane+shopping@example.com');
    // Each address is a different verified, normalised email, so each may claim.
    // (Plus-tags are deliberately not stripped - owner decision, 24 Oct 2026.)
    state.user = { ...state.user!, id: 'u1', clerkUserId: 'clerk_u1' };
    expect((await POST()).status).toBe(201);
    state.user = { ...state.user!, id: 'u2', clerkUserId: 'clerk_u2' };
    expect((await POST()).status).toBe(201);
    expect(state.db!.claims()).toHaveLength(2);
  });

  it('starts a 30-day trial for a verified primary email (201) and records one claim', async () => {
    signIn('u1', 'Jane@Example.com');
    const res = await POST();
    const body = await res.json();

    expect(res.status).toBe(201);
    const started = new Date(body.data.trialStartedAt).getTime();
    const ends = new Date(body.data.trialEndsAt).getTime();
    expect(ends - started).toBe(30 * 24 * 60 * 60 * 1000);

    expect(state.db!.claims()).toHaveLength(1);
    expect(state.db!.claims()[0]).toMatchObject({ userId: 'u1', keyVersion: 1 });
    expect(state.db!.entitlement('u1')).toMatchObject({ tier: 'free', stripeSubscriptionId: null });
    expect(state.db!.entitlement('u1')?.trialEndsAt).not.toBeNull();
  });

  it('stores the HMAC key, never the email, and returns neither in the response', async () => {
    signIn('u1', 'jane@example.com');
    const res = await POST();
    const text = JSON.stringify(await res.json());
    const expectedKey = buildEligibilityKeys('jane@example.com', loadTrialKeyConfig(process.env))
      .current.key;

    expect(state.db!.claims()[0]!.emailKey).toBe(expectedKey);
    expect(JSON.stringify(state.db!.claims())).not.toContain('jane');
    expect(text).not.toContain('jane');
    expect(text).not.toContain(expectedKey);
  });

  it('refuses a second trial for the same account (409, TRIAL_NOT_AVAILABLE)', async () => {
    signIn('u1', 'jane@example.com');
    expect((await POST()).status).toBe(201);
    // The route now sees the account as it is stored.
    state.user!.entitlements = { ...state.db!.entitlement('u1')! };
    const second = await POST();
    expect(second.status).toBe(409);
    expect((await second.json()).error).toMatchObject({
      code: 'TRIAL_NOT_AVAILABLE',
      details: { reason: 'trial_already_used' },
    });
    expect(state.db!.claims()).toHaveLength(1);
  });

  it('refuses a different account using the same verified email', async () => {
    signIn('u1', 'jane@example.com');
    expect((await POST()).status).toBe(201);

    signIn('u2', 'JANE@example.com');
    const res = await POST();
    expect(res.status).toBe(409);
    expect((await res.json()).error.details.reason).toBe('trial_already_claimed');
    expect(state.db!.entitlement('u2')?.trialStartedAt).toBeNull();
  });

  it('lets exactly one of several simultaneous requests for one email succeed', async () => {
    // Each caller has its own account but the same verified address.
    const ids = ['a', 'b', 'c', 'd', 'e'];
    const responses = await Promise.all(
      ids.map(async (id) => {
        signIn(id, 'shared@example.com');
        return POST();
      }),
    );
    // `state.user` is shared, so only assert on the database outcome, which is
    // what the guarantee is about: one claim, one trial.
    expect(state.db!.claims()).toHaveLength(1);
    const withTrial = ids.filter((id) => state.db!.entitlement(id)?.trialStartedAt != null);
    expect(withTrial).toHaveLength(1);
    expect(responses.filter((r) => r.status === 201)).toHaveLength(1);
  });

  it.each(['monthly', 'annual', 'lifetime'])(
    'refuses a %s member without calling the identity provider',
    async (tier) => {
      signIn('u1', 'jane@example.com', {
        tier,
        stripeSubscriptionId: tier === 'lifetime' ? null : 'sub_1',
      });
      state.providerFails = true; // would throw 503 if it were ever consulted
      const res = await POST();
      expect(res.status).toBe(409);
      expect((await res.json()).error.details.reason).toBe('paid_membership');
      expect(state.db!.claims()).toHaveLength(0);
    },
  );

  it('refuses a Free account that once had a subscription', async () => {
    signIn('u1', 'jane@example.com', { stripeSubscriptionId: 'sub_old' });
    const res = await POST();
    expect(res.status).toBe(409);
    expect((await res.json()).error.details.reason).toBe('previous_subscription');
  });

  it('refuses an unverified primary email (403) and writes nothing', async () => {
    signIn('u1', 'jane@example.com', {}, 'unverified');
    const res = await POST();
    expect(res.status).toBe(403);
    expect((await res.json()).error.code).toBe('EMAIL_NOT_VERIFIED');
    expect(state.db!.claims()).toHaveLength(0);
    expect(state.db!.entitlement('u1')?.trialStartedAt).toBeNull();
  });

  it('fails closed (503) when the HMAC secret is missing, writing nothing', async () => {
    delete process.env.TRIAL_ELIGIBILITY_SECRET;
    signIn('u1', 'jane@example.com');
    const res = await POST();
    expect(res.status).toBe(503);
    expect(state.db!.claims()).toHaveLength(0);
    expect(state.db!.entitlement('u1')?.trialStartedAt).toBeNull();
  });

  it('fails closed (503) when the secret version is missing', async () => {
    delete process.env.TRIAL_ELIGIBILITY_KEY_VERSION;
    signIn('u1', 'jane@example.com');
    expect((await POST()).status).toBe(503);
    expect(state.db!.claims()).toHaveLength(0);
  });

  it('fails closed (503) when the identity provider cannot be reached', async () => {
    signIn('u1', 'jane@example.com');
    state.providerFails = true;
    expect((await POST()).status).toBe(503);
    expect(state.db!.claims()).toHaveLength(0);
  });

  it('never logs an email address, a secret, or the derived key', async () => {
    delete process.env.TRIAL_ELIGIBILITY_SECRET;
    signIn('u1', 'jane@example.com');
    await POST();
    const key = buildEligibilityKeys(
      'jane@example.com',
      loadTrialKeyConfig({
        TRIAL_ELIGIBILITY_SECRET: SECRET,
        TRIAL_ELIGIBILITY_KEY_VERSION: '1',
      }),
    ).current.key;
    expect(logged).not.toContain('jane');
    expect(logged).not.toContain(SECRET);
    expect(logged).not.toContain(key);
  });

  it('never involves Stripe: no subscription id appears and the tier stays Free', async () => {
    signIn('u1', 'jane@example.com');
    await POST();
    expect(state.db!.entitlement('u1')).toMatchObject({ tier: 'free', stripeSubscriptionId: null });
  });
});
