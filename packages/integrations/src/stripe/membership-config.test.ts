import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  getPortalConfigurationId,
  isMembershipCheckoutConfigured,
  isMembershipOpen,
} from './config';
import { CHECKOUT_TIERS, isCheckoutTier } from './tier-mapping';

const KEYS = [
  'STRIPE_SECRET_KEY',
  'STRIPE_WEBHOOK_SECRET',
  'STRIPE_PRICE_ID_MONTHLY',
  'STRIPE_PRICE_ID_ANNUAL',
  'STRIPE_PRICE_ID_LIFETIME',
];
const saved = Object.fromEntries(KEYS.map((k) => [k, process.env[k]]));

function configure() {
  process.env.STRIPE_SECRET_KEY = 'sk_test_placeholder';
  process.env.STRIPE_WEBHOOK_SECRET = 'whsec_placeholder';
  process.env.STRIPE_PRICE_ID_MONTHLY = 'price_monthly_placeholder';
  process.env.STRIPE_PRICE_ID_ANNUAL = 'price_annual_placeholder';
}

beforeEach(() => {
  for (const k of KEYS) delete process.env[k];
});
afterEach(() => {
  for (const k of KEYS) {
    if (saved[k] === undefined) delete process.env[k];
    else process.env[k] = saved[k];
  }
});

describe('isMembershipCheckoutConfigured', () => {
  it('is false with nothing configured', () => {
    expect(isMembershipCheckoutConfigured()).toBe(false);
  });

  it('is true with the secret, webhook secret and both approved prices', () => {
    configure();
    expect(isMembershipCheckoutConfigured()).toBe(true);
  });

  it.each(KEYS.slice(0, 4))('is false when %s is missing', (missing) => {
    configure();
    delete process.env[missing];
    expect(isMembershipCheckoutConfigured()).toBe(false);
  });

  it('does not depend on a Lifetime price', () => {
    configure();
    process.env.STRIPE_PRICE_ID_LIFETIME = 'price_lifetime_placeholder';
    expect(isMembershipCheckoutConfigured()).toBe(true);
    delete process.env.STRIPE_PRICE_ID_LIFETIME;
    expect(isMembershipCheckoutConfigured()).toBe(true);
  });
});

describe('checkout tiers', () => {
  it('are exactly the approved plans, with no Lifetime', () => {
    expect([...CHECKOUT_TIERS]).toEqual(['monthly', 'annual']);
    expect(isCheckoutTier('lifetime')).toBe(false);
    expect(isCheckoutTier('free')).toBe(false);
    expect(isCheckoutTier('monthly')).toBe(true);
  });
});

describe('isMembershipOpen', () => {
  const original = process.env.REGULATION_SUITE_MEMBERSHIP_OPEN;
  afterEach(() => {
    if (original === undefined) delete process.env.REGULATION_SUITE_MEMBERSHIP_OPEN;
    else process.env.REGULATION_SUITE_MEMBERSHIP_OPEN = original;
  });

  it('is closed by default and when billing is not configured', () => {
    delete process.env.REGULATION_SUITE_MEMBERSHIP_OPEN;
    expect(isMembershipOpen()).toBe(false);
    process.env.REGULATION_SUITE_MEMBERSHIP_OPEN = 'true';
    expect(isMembershipOpen()).toBe(false);
  });

  it.each(['TRUE', 'True', '1', 'yes', 'on', ' true', 'true ', 'false', '', 'truee'])(
    'is closed for the launch value %j even with billing configured',
    (value) => {
      configure();
      process.env.REGULATION_SUITE_MEMBERSHIP_OPEN = value;
      expect(isMembershipOpen()).toBe(false);
    },
  );

  it('is open only for exactly "true" with billing configured', () => {
    configure();
    process.env.REGULATION_SUITE_MEMBERSHIP_OPEN = 'true';
    expect(isMembershipOpen()).toBe(true);
  });
});

describe('getPortalConfigurationId', () => {
  const original = process.env.STRIPE_PORTAL_CONFIGURATION_ID;
  afterEach(() => {
    if (original === undefined) delete process.env.STRIPE_PORTAL_CONFIGURATION_ID;
    else process.env.STRIPE_PORTAL_CONFIGURATION_ID = original;
  });

  it('is undefined when unset or empty, and the id when set', () => {
    delete process.env.STRIPE_PORTAL_CONFIGURATION_ID;
    expect(getPortalConfigurationId()).toBeUndefined();
    process.env.STRIPE_PORTAL_CONFIGURATION_ID = '';
    expect(getPortalConfigurationId()).toBeUndefined();
    process.env.STRIPE_PORTAL_CONFIGURATION_ID = 'bpc_placeholder';
    expect(getPortalConfigurationId()).toBe('bpc_placeholder');
  });
});
