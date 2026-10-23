import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { isMembershipCheckoutConfigured } from './config';
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
