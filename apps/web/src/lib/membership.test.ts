import { describe, expect, it } from 'vitest';
import { contentAccessFor, isMembershipOpen, withPracticeAccess } from './membership';

const FAILED_AT = new Date('2026-10-01T09:00:00.000Z');
const NOW = new Date('2026-10-03T09:00:00.000Z');
const DAY = 24 * 60 * 60 * 1000;

function entitlement(overrides: Record<string, unknown> = {}) {
  return {
    tier: 'monthly' as const,
    status: 'active' as const,
    programs: [],
    certifications: [],
    features: [],
    ...overrides,
  };
}

const practice = (isFree: boolean) => ({
  id: 'p1',
  title: 'Practice',
  isFree,
  mediaUrl: 'https://media.example/secret.mp3',
  sanityData: { mediaUrl: 'https://media.example/secret.mp3' },
});

describe('isMembershipOpen', () => {
  const keys = [
    'REGULATION_SUITE_MEMBERSHIP_OPEN',
    'STRIPE_SECRET_KEY',
    'STRIPE_WEBHOOK_SECRET',
    'STRIPE_PRICE_ID_MONTHLY',
    'STRIPE_PRICE_ID_ANNUAL',
  ];

  function withEnv(values: Record<string, string | undefined>, run: () => void) {
    const saved = Object.fromEntries(keys.map((k) => [k, process.env[k]]));
    for (const k of keys) {
      if (values[k] === undefined) delete process.env[k];
      else process.env[k] = values[k];
    }
    try {
      run();
    } finally {
      for (const k of keys) {
        if (saved[k] === undefined) delete process.env[k];
        else process.env[k] = saved[k];
      }
    }
  }

  const stripe = {
    STRIPE_SECRET_KEY: 'sk_test_x',
    STRIPE_WEBHOOK_SECRET: 'whsec_x',
    STRIPE_PRICE_ID_MONTHLY: 'price_m',
    STRIPE_PRICE_ID_ANNUAL: 'price_a',
  };

  it('is closed by default — nothing configured, nothing launched', () => {
    withEnv({}, () => expect(isMembershipOpen()).toBe(false));
  });

  it('stays closed when launched without billing configured (no broken checkout)', () => {
    withEnv({ REGULATION_SUITE_MEMBERSHIP_OPEN: 'true' }, () =>
      expect(isMembershipOpen()).toBe(false),
    );
  });

  it('stays closed when billing is configured but launch has not been switched on', () => {
    withEnv(stripe, () => expect(isMembershipOpen()).toBe(false));
  });

  it('only a value of exactly "true" opens it', () => {
    withEnv({ ...stripe, REGULATION_SUITE_MEMBERSHIP_OPEN: '1' }, () =>
      expect(isMembershipOpen()).toBe(false),
    );
  });

  it('opens only with the launch switch AND complete billing configuration', () => {
    withEnv({ ...stripe, REGULATION_SUITE_MEMBERSHIP_OPEN: 'true' }, () =>
      expect(isMembershipOpen()).toBe(true),
    );
  });
});

describe('contentAccessFor — all membership states, gating on', () => {
  const open = { gatingActive: true, now: NOW };

  it('free user: free content yes, paid content no', () => {
    const access = contentAccessFor(entitlement({ tier: 'free' }), open);
    expect(access.canOpen({ isFree: true })).toBe(true);
    expect(access.canOpen({ isFree: false })).toBe(false);
    expect(access.membership.state).toBe('free');
  });

  it('trialing user: everything', () => {
    const access = contentAccessFor(entitlement({ status: 'trialing' }), open);
    expect(access.canOpen({ isFree: false })).toBe(true);
    expect(access.membership.state).toBe('trialing');
  });

  it('active monthly and annual users: everything', () => {
    for (const tier of ['monthly', 'annual'] as const) {
      const access = contentAccessFor(entitlement({ tier }), open);
      expect(access.canOpen({ isFree: false })).toBe(true);
    }
  });

  it('payment failed day 1 and day 7 (inside grace): everything, state is grace', () => {
    const day1 = contentAccessFor(entitlement({ status: 'past_due', paymentFailedAt: FAILED_AT }), {
      gatingActive: true,
      now: new Date(FAILED_AT.getTime() + 1 * DAY),
    });
    const day7 = contentAccessFor(entitlement({ status: 'past_due', paymentFailedAt: FAILED_AT }), {
      gatingActive: true,
      now: new Date(FAILED_AT.getTime() + 7 * DAY - 1000),
    });
    for (const access of [day1, day7]) {
      expect(access.canOpen({ isFree: false })).toBe(true);
      expect(access.membership.state).toBe('grace');
    }
  });

  it('payment failed, after the grace period: nothing (existing inactive rule)', () => {
    const access = contentAccessFor(
      entitlement({ status: 'past_due', paymentFailedAt: FAILED_AT }),
      {
        gatingActive: true,
        now: new Date(FAILED_AT.getTime() + 8 * DAY),
      },
    );
    expect(access.canOpen({ isFree: false })).toBe(false);
    expect(access.canOpen({ isFree: true })).toBe(false);
    expect(access.membership.state).toBe('inactive');
  });

  it('cancelled at period end: still full access, flagged as not renewing', () => {
    const access = contentAccessFor(
      entitlement({ status: 'active', cancelAtPeriodEnd: true }),
      open,
    );
    expect(access.canOpen({ isFree: false })).toBe(true);
    expect(access.membership.cancelsAtPeriodEnd).toBe(true);
  });

  it('expired / canceled: nothing', () => {
    for (const status of ['expired', 'canceled'] as const) {
      const access = contentAccessFor(entitlement({ status }), open);
      expect(access.canOpen({ isFree: false })).toBe(false);
      expect(access.membership.state).toBe('inactive');
    }
  });
});

describe('contentAccessFor — membership not open (today)', () => {
  it('locks nothing: a free member opens every practice and PowerDrop', () => {
    const access = contentAccessFor(entitlement({ tier: 'free' }), {
      gatingActive: false,
      now: NOW,
    });
    expect(access.canOpen({ isFree: false })).toBe(true);
    expect(access.canOpen({ isFree: true })).toBe(true);
  });
});

describe('withPracticeAccess — the server withholds paid media', () => {
  const free = contentAccessFor(entitlement({ tier: 'free' }), { gatingActive: true, now: NOW });
  const paid = contentAccessFor(entitlement({ tier: 'annual' }), { gatingActive: true, now: NOW });

  it('strips mediaUrl and the raw CMS document from a locked practice, and marks it locked', () => {
    const result = withPracticeAccess(practice(false), free);
    expect(result.locked).toBe(true);
    expect(result.mediaUrl).toBeNull();
    expect(result.sanityData).toEqual({});
    expect(JSON.stringify(result)).not.toContain('secret.mp3');
    expect(result.title).toBe('Practice');
  });

  it('keeps a free-designated practice fully open to a free member', () => {
    const result = withPracticeAccess(practice(true), free);
    expect(result.locked).toBe(false);
    expect(result.mediaUrl).toContain('secret.mp3');
  });

  it('keeps everything open for a paid member', () => {
    const result = withPracticeAccess(practice(false), paid);
    expect(result.locked).toBe(false);
    expect(result.mediaUrl).toContain('secret.mp3');
  });

  it('locks nothing while membership is closed', () => {
    const closed = contentAccessFor(entitlement({ tier: 'free' }), {
      gatingActive: false,
      now: NOW,
    });
    expect(withPracticeAccess(practice(false), closed).locked).toBe(false);
  });
});
