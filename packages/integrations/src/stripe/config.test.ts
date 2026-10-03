import { afterEach, describe, expect, it } from 'vitest';
import { isMembershipCheckoutConfigured } from './config';

const KEYS = [
  'STRIPE_SECRET_KEY',
  'STRIPE_WEBHOOK_SECRET',
  'STRIPE_PRICE_ID_MONTHLY',
  'STRIPE_PRICE_ID_ANNUAL',
] as const;
const saved = Object.fromEntries(KEYS.map((k) => [k, process.env[k]]));

function setAll(values: Partial<Record<(typeof KEYS)[number], string | undefined>>) {
  for (const key of KEYS) {
    const value = values[key];
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
}

afterEach(() => {
  for (const key of KEYS) {
    if (saved[key] === undefined) delete process.env[key];
    else process.env[key] = saved[key];
  }
});

describe('isMembershipCheckoutConfigured', () => {
  const full = {
    STRIPE_SECRET_KEY: 'sk_test_x',
    STRIPE_WEBHOOK_SECRET: 'whsec_x',
    STRIPE_PRICE_ID_MONTHLY: 'price_m',
    STRIPE_PRICE_ID_ANNUAL: 'price_a',
  };

  it('is true only when the key, webhook secret and BOTH plan prices are set', () => {
    setAll(full);
    expect(isMembershipCheckoutConfigured()).toBe(true);
  });

  it("is false with nothing configured (today's state — membership stays closed)", () => {
    setAll({});
    expect(isMembershipCheckoutConfigured()).toBe(false);
  });

  it.each(KEYS)('is false when %s is missing', (missing) => {
    setAll({ ...full, [missing]: undefined });
    expect(isMembershipCheckoutConfigured()).toBe(false);
  });
});
