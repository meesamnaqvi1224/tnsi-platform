import { describe, expect, it } from 'vitest';
import { resolveMembership, type MembershipRecord } from '../authorize/entitlements';
import {
  buildEligibilityKeys,
  loadTrialKeyConfig,
  TrialKeyConfigError,
  UnverifiedEmailError,
  type ProviderUserEmails,
} from './email';
import {
  claimTrial,
  claimTrialForUser,
  decideTrialEligibility,
  TRIAL_DURATION_DAYS,
  trialWindow,
  type TrialEntitlementFacts,
} from './eligibility';
import { createInMemoryTrialDatabase } from './in-memory-trial-store.test-support';

const SECRET_V1 = 'k1_Zm9vYmFyYmF6cXV4cXV1eHF1dXhxdXV4MTIzNDU2Nzg5MA==';
const SECRET_V2 = 'k2_YW5vdGhlci1zZWNyZXQtdmFsdWUtMDEyMzQ1Njc4OS1hYmNkZWY=';
const V1 = loadTrialKeyConfig({
  TRIAL_ELIGIBILITY_SECRET: SECRET_V1,
  TRIAL_ELIGIBILITY_KEY_VERSION: '1',
});
const V2_WITH_V1 = loadTrialKeyConfig({
  TRIAL_ELIGIBILITY_SECRET: SECRET_V2,
  TRIAL_ELIGIBILITY_KEY_VERSION: '2',
  TRIAL_ELIGIBILITY_PREVIOUS_KEYS: `1:${SECRET_V1}`,
});
const V2_ONLY = loadTrialKeyConfig({
  TRIAL_ELIGIBILITY_SECRET: SECRET_V2,
  TRIAL_ELIGIBILITY_KEY_VERSION: '2',
});

const NOW = new Date('2026-10-14T09:00:00.000Z');
const DAY = 24 * 60 * 60 * 1000;

function facts(overrides: Partial<TrialEntitlementFacts> = {}): TrialEntitlementFacts {
  return {
    tier: 'free',
    stripeSubscriptionId: null,
    trialStartedAt: null,
    trialEndsAt: null,
    ...overrides,
  };
}

const keysFor = (email: string, config = V1) => buildEligibilityKeys(email, config);

describe('trialWindow', () => {
  it('is exactly 30 days, to the millisecond', () => {
    expect(TRIAL_DURATION_DAYS).toBe(30);
    const w = trialWindow(NOW);
    expect(w.startedAt).toEqual(NOW);
    expect(w.endsAt.getTime() - w.startedAt.getTime()).toBe(30 * DAY);
    expect(w.endsAt.toISOString()).toBe('2026-11-13T09:00:00.000Z');
  });
});

describe('decideTrialEligibility', () => {
  it('allows an unused Free account with no prior claim', () => {
    expect(decideTrialEligibility({ entitlement: facts(), existingClaim: false })).toEqual({
      eligible: true,
    });
  });

  it.each([
    ['no entitlement row', null, false, 'no_account'],
    ['monthly member', facts({ tier: 'monthly' }), false, 'paid_membership'],
    ['annual member', facts({ tier: 'annual' }), false, 'paid_membership'],
    ['legacy lifetime member', facts({ tier: 'lifetime' }), false, 'paid_membership'],
    [
      'Free account that once had a subscription',
      facts({ stripeSubscriptionId: 'sub_1' }),
      false,
      'previous_subscription',
    ],
    [
      'trial already started',
      facts({ trialStartedAt: NOW, trialEndsAt: new Date(NOW.getTime() + DAY) }),
      false,
      'trial_already_used',
    ],
    [
      'trial half-recorded (start only)',
      facts({ trialStartedAt: NOW }),
      false,
      'trial_already_used',
    ],
    ['a claim exists for the email', facts(), true, 'trial_already_claimed'],
  ] as const)('refuses: %s', (_label, entitlement, existingClaim, reason) => {
    expect(decideTrialEligibility({ entitlement, existingClaim })).toEqual({
      eligible: false,
      reason,
    });
  });

  it('reports the first applicable reason in a fixed order', () => {
    expect(
      decideTrialEligibility({
        entitlement: facts({ tier: 'monthly', stripeSubscriptionId: 'sub_1', trialStartedAt: NOW }),
        existingClaim: true,
      }),
    ).toEqual({ eligible: false, reason: 'paid_membership' });
  });
});

describe('claimTrial - start, expiry and Free fallback', () => {
  it('starts a 30-day trial, recording the claim and the trial dates together', async () => {
    const db = createInMemoryTrialDatabase();
    db.seedEntitlement('u1');
    const keys = keysFor('jane@example.com');

    const result = await claimTrial(db.runTransaction, { userId: 'u1', keys, now: NOW });

    expect(result).toEqual({
      status: 'started',
      trialStartedAt: NOW,
      trialEndsAt: new Date(NOW.getTime() + 30 * DAY),
      keyVersion: 1,
    });
    expect(db.entitlement('u1')).toMatchObject({
      trialStartedAt: NOW,
      trialEndsAt: new Date(NOW.getTime() + 30 * DAY),
    });
    expect(db.claims()).toHaveLength(1);
    expect(db.claims()[0]).toMatchObject({
      emailKey: keys.current.key,
      keyVersion: 1,
      userId: 'u1',
      trialEndsAt: new Date(NOW.getTime() + 30 * DAY),
    });
  });

  it('stores only the derived key - never the email address', async () => {
    const db = createInMemoryTrialDatabase();
    db.seedEntitlement('u1');
    await claimTrial(db.runTransaction, {
      userId: 'u1',
      keys: keysFor('jane@example.com'),
      now: NOW,
    });
    expect(JSON.stringify(db.claims())).not.toContain('jane');
    expect(JSON.stringify(db.claims())).not.toContain('example.com');
    expect(db.claims()[0]!.emailKey).toMatch(/^[0-9a-f]{64}$/);
  });

  it('gives full paid access during the trial, and Free again at expiry - with no charge or conversion', async () => {
    const db = createInMemoryTrialDatabase();
    db.seedEntitlement('u1');
    const started = await claimTrial(db.runTransaction, {
      userId: 'u1',
      keys: keysFor('jane@example.com'),
      now: NOW,
    });
    expect(started.status).toBe('started');

    const row = db.entitlement('u1')!;
    const asRecord = (): MembershipRecord => ({
      tier: row.tier,
      status: 'active',
      programs: [],
      certifications: [],
      features: [],
      trialStartedAt: row.trialStartedAt,
      trialEndsAt: row.trialEndsAt,
      stripeSubscriptionId: row.stripeSubscriptionId,
    });

    const during = resolveMembership(asRecord(), new Date(NOW.getTime() + 29 * DAY));
    expect(during).toMatchObject({ state: 'trialing', hasPaidAccess: true });
    expect(during.trialEndsAt).toEqual(new Date(NOW.getTime() + 30 * DAY));

    const atExpiry = resolveMembership(asRecord(), new Date(NOW.getTime() + 30 * DAY));
    expect(atExpiry).toMatchObject({ state: 'free', hasPaidAccess: false, trialExpired: true });

    const longAfter = resolveMembership(asRecord(), new Date(NOW.getTime() + 400 * DAY));
    expect(longAfter).toMatchObject({ state: 'free', hasPaidAccess: false, trialExpired: true });

    // No automatic paid conversion: the account is still the same Free account
    // with no subscription; expiry changed nothing in storage.
    expect(db.entitlement('u1')).toMatchObject({ tier: 'free', stripeSubscriptionId: null });
  });

  it('refuses and writes nothing for an ineligible account', async () => {
    const db = createInMemoryTrialDatabase();
    db.seedEntitlement('paid', { tier: 'monthly', stripeSubscriptionId: 'sub_1' });
    const result = await claimTrial(db.runTransaction, {
      userId: 'paid',
      keys: keysFor('paid@example.com'),
      now: NOW,
    });
    expect(result).toEqual({ status: 'refused', reason: 'paid_membership' });
    expect(db.claims()).toHaveLength(0);
  });

  it('refuses a legacy Lifetime member and leaves the row untouched', async () => {
    const db = createInMemoryTrialDatabase();
    db.seedEntitlement('lt', { tier: 'lifetime' });
    const result = await claimTrial(db.runTransaction, {
      userId: 'lt',
      keys: keysFor('lt@example.com'),
      now: NOW,
    });
    expect(result).toEqual({ status: 'refused', reason: 'paid_membership' });
    expect(db.entitlement('lt')).toEqual(facts({ tier: 'lifetime' }));
    expect(db.claims()).toHaveLength(0);
  });

  it('refuses a second trial for the same account', async () => {
    const db = createInMemoryTrialDatabase();
    db.seedEntitlement('u1');
    const keys = keysFor('jane@example.com');
    await claimTrial(db.runTransaction, { userId: 'u1', keys, now: NOW });
    const again = await claimTrial(db.runTransaction, {
      userId: 'u1',
      keys,
      now: new Date(NOW.getTime() + 60 * DAY),
    });
    expect(again).toEqual({ status: 'refused', reason: 'trial_already_used' });
    expect(db.claims()).toHaveLength(1);
  });

  it('refuses a deleted-and-recreated account using the same email', async () => {
    const db = createInMemoryTrialDatabase();
    db.seedEntitlement('old-account');
    await claimTrial(db.runTransaction, {
      userId: 'old-account',
      keys: keysFor('jane@example.com'),
      now: NOW,
    });
    // The account is deleted and re-created under a new id: a brand-new row.
    db.seedEntitlement('new-account');
    const result = await claimTrial(db.runTransaction, {
      userId: 'new-account',
      keys: keysFor('JANE@example.com'),
      now: new Date(NOW.getTime() + 90 * DAY),
    });
    expect(result).toEqual({ status: 'refused', reason: 'trial_already_claimed' });
    expect(db.entitlement('new-account')?.trialStartedAt).toBeNull();
  });

  it('lets an alternate address claim its own trial (accepted limitation)', async () => {
    const db = createInMemoryTrialDatabase();
    db.seedEntitlement('a');
    db.seedEntitlement('b');
    const first = await claimTrial(db.runTransaction, {
      userId: 'a',
      keys: keysFor('jane@gmail.com'),
      now: NOW,
    });
    const second = await claimTrial(db.runTransaction, {
      userId: 'b',
      keys: keysFor('jane+2@gmail.com'),
      now: NOW,
    });
    expect([first.status, second.status]).toEqual(['started', 'started']);
  });
});

describe('claimTrial - concurrency (database-contract level)', () => {
  it('lets exactly one of many simultaneous claims for the same email succeed', async () => {
    const db = createInMemoryTrialDatabase();
    const users = Array.from({ length: 25 }, (_, i) => `user-${i}`);
    users.forEach((u) => db.seedEntitlement(u));
    const keys = keysFor('shared@example.com');

    const results = await Promise.all(
      users.map((userId) => claimTrial(db.runTransaction, { userId, keys, now: NOW })),
    );

    expect(results.filter((r) => r.status === 'started')).toHaveLength(1);
    expect(
      results.filter((r) => r.status === 'refused' && r.reason === 'trial_already_claimed'),
    ).toHaveLength(24);
    expect(db.claims()).toHaveLength(1);
    expect(users.filter((u) => db.entitlement(u)?.trialStartedAt != null)).toHaveLength(1);
  });

  it('lets one account only win once when the same user claims twice at the same moment', async () => {
    const db = createInMemoryTrialDatabase();
    db.seedEntitlement('u1');
    const keys = keysFor('jane@example.com');

    const results = await Promise.all([
      claimTrial(db.runTransaction, { userId: 'u1', keys, now: NOW }),
      claimTrial(db.runTransaction, { userId: 'u1', keys, now: NOW }),
    ]);

    expect(results.filter((r) => r.status === 'started')).toHaveLength(1);
    expect(db.claims()).toHaveLength(1);
  });

  it('lets different emails all claim at once', async () => {
    const db = createInMemoryTrialDatabase();
    const users = Array.from({ length: 10 }, (_, i) => `user-${i}`);
    users.forEach((u) => db.seedEntitlement(u));

    const results = await Promise.all(
      users.map((userId) =>
        claimTrial(db.runTransaction, { userId, keys: keysFor(`${userId}@example.com`), now: NOW }),
      ),
    );

    expect(results.every((r) => r.status === 'started')).toBe(true);
    expect(db.claims()).toHaveLength(10);
  });

  it('rolls the claim back when the entitlement stops being eligible, so the email is not burned', async () => {
    const db = createInMemoryTrialDatabase();
    db.seedEntitlement('a');
    db.seedEntitlement('b');
    const keys = keysFor('shared@example.com');
    // Account A turns paid between being read and the trial being started.
    db.hooks.beforeStartTrial = (userId) => {
      if (userId === 'a')
        db.seedEntitlement('a', { tier: 'monthly', stripeSubscriptionId: 'sub_9' });
    };

    const [a, b] = await Promise.all([
      claimTrial(db.runTransaction, { userId: 'a', keys, now: NOW }),
      claimTrial(db.runTransaction, { userId: 'b', keys, now: NOW }),
    ]);

    expect(a).toEqual({ status: 'refused', reason: 'not_eligible' });
    expect(b.status).toBe('started'); // A's claim was rolled back; B proceeds, as Postgres would
    expect(db.claims()).toHaveLength(1);
    expect(db.claims()[0]!.userId).toBe('b');
    expect(db.entitlement('a')).toMatchObject({ tier: 'monthly', trialStartedAt: null });
  });
});

describe('claimTrial - key versions and rotation', () => {
  it('finds a claim made under an older key version and refuses', async () => {
    const db = createInMemoryTrialDatabase();
    db.seedEntitlement('a');
    db.seedEntitlement('b');
    await claimTrial(db.runTransaction, {
      userId: 'a',
      keys: keysFor('jane@example.com', V1),
      now: NOW,
    });

    const result = await claimTrial(db.runTransaction, {
      userId: 'b',
      keys: keysFor('jane@example.com', V2_WITH_V1),
      now: NOW,
    });
    expect(result).toEqual({ status: 'refused', reason: 'trial_already_claimed' });
  });

  it('re-keys an older-version claim to the current version when it is touched', async () => {
    const db = createInMemoryTrialDatabase();
    db.seedEntitlement('a');
    db.seedEntitlement('b');
    await claimTrial(db.runTransaction, {
      userId: 'a',
      keys: keysFor('jane@example.com', V1),
      now: NOW,
    });
    const rotated = keysFor('jane@example.com', V2_WITH_V1);

    await claimTrial(db.runTransaction, { userId: 'b', keys: rotated, now: NOW });

    expect(db.claims()).toHaveLength(1);
    expect(db.claims()[0]).toMatchObject({ emailKey: rotated.current.key, keyVersion: 2 });
  });

  it('keeps the claim valid after re-keying even once the old version is removed', async () => {
    const db = createInMemoryTrialDatabase();
    db.seedEntitlement('a');
    db.seedEntitlement('b');
    db.seedEntitlement('c');
    await claimTrial(db.runTransaction, {
      userId: 'a',
      keys: keysFor('jane@example.com', V1),
      now: NOW,
    });
    await claimTrial(db.runTransaction, {
      userId: 'b',
      keys: keysFor('jane@example.com', V2_WITH_V1),
      now: NOW,
    });

    const afterRetirement = await claimTrial(db.runTransaction, {
      userId: 'c',
      keys: keysFor('jane@example.com', V2_ONLY),
      now: NOW,
    });
    expect(afterRetirement).toEqual({ status: 'refused', reason: 'trial_already_claimed' });
  });

  it('documents the danger: dropping a version with un-migrated claims re-grants eligibility', async () => {
    const db = createInMemoryTrialDatabase();
    db.seedEntitlement('a');
    db.seedEntitlement('b');
    await claimTrial(db.runTransaction, {
      userId: 'a',
      keys: keysFor('jane@example.com', V1),
      now: NOW,
    });

    const result = await claimTrial(db.runTransaction, {
      userId: 'b',
      keys: keysFor('jane@example.com', V2_ONLY), // v1 dropped without re-keying
      now: NOW,
    });
    expect(result.status).toBe('started'); // so a version may only be retired at zero claims
  });
});

describe('claimTrialForUser - fails closed before any write', () => {
  const verifiedUser: ProviderUserEmails = {
    primaryEmailAddressId: 'e1',
    emailAddresses: [
      { id: 'e1', emailAddress: 'Jane@Example.com', verification: { status: 'verified' } },
    ],
  };

  it('starts a trial for a verified primary email with configured keys', async () => {
    const db = createInMemoryTrialDatabase();
    db.seedEntitlement('u1');
    const result = await claimTrialForUser(db.runTransaction, {
      userId: 'u1',
      providerUser: verifiedUser,
      now: NOW,
      keyConfig: V1,
    });
    expect(result.status).toBe('started');
    expect(db.claims()[0]!.emailKey).toBe(keysFor('jane@example.com').current.key);
  });

  it('throws and writes nothing when the secret is missing', async () => {
    const db = createInMemoryTrialDatabase();
    db.seedEntitlement('u1');
    await expect(
      claimTrialForUser(db.runTransaction, { userId: 'u1', providerUser: verifiedUser, env: {} }),
    ).rejects.toBeInstanceOf(TrialKeyConfigError);
    expect(db.claims()).toHaveLength(0);
    expect(db.entitlement('u1')?.trialStartedAt).toBeNull();
  });

  it('throws and writes nothing when the secret version is missing', async () => {
    const db = createInMemoryTrialDatabase();
    db.seedEntitlement('u1');
    await expect(
      claimTrialForUser(db.runTransaction, {
        userId: 'u1',
        providerUser: verifiedUser,
        env: { TRIAL_ELIGIBILITY_SECRET: SECRET_V1 },
      }),
    ).rejects.toBeInstanceOf(TrialKeyConfigError);
    expect(db.claims()).toHaveLength(0);
  });

  it('throws and writes nothing when the primary email is unverified', async () => {
    const db = createInMemoryTrialDatabase();
    db.seedEntitlement('u1');
    await expect(
      claimTrialForUser(db.runTransaction, {
        userId: 'u1',
        providerUser: {
          primaryEmailAddressId: 'e1',
          emailAddresses: [
            { id: 'e1', emailAddress: 'a@b.com', verification: { status: 'unverified' } },
          ],
        },
        keyConfig: V1,
      }),
    ).rejects.toBeInstanceOf(UnverifiedEmailError);
    expect(db.claims()).toHaveLength(0);
  });
});
