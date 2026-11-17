import { describe, expect, it } from 'vitest';
import {
  CHECKOUT_ABANDONED_SESSION_TTL_MINUTES,
  CHECKOUT_RECONCILIATION_LOOKBACK_MS,
} from './checkout-windows';

describe('checkout engineering windows', () => {
  it('reconciliation lookback is 24 hours (a technical lookback, not an entitlement window)', () => {
    expect(CHECKOUT_RECONCILIATION_LOOKBACK_MS).toBe(24 * 60 * 60 * 1000);
  });

  it('abandoned sessions expire within Stripe’s allowed range (30 minutes to 24 hours)', () => {
    expect(CHECKOUT_ABANDONED_SESSION_TTL_MINUTES).toBeGreaterThanOrEqual(30);
    expect(CHECKOUT_ABANDONED_SESSION_TTL_MINUTES).toBeLessThanOrEqual(24 * 60);
  });
});
