import { describe, expect, it } from 'vitest';
import {
  checkoutModeForTier,
  ENTITLEMENT_TIERS,
  isPurchasableTier,
  mapPriceIdToTier,
  mapStripeSubscriptionStatus,
  PURCHASABLE_TIERS,
  resolvePriceId,
  type PurchasableTier,
} from './tier-mapping';

const priceIds: Record<PurchasableTier, string | undefined> = {
  monthly: 'price_monthly_123',
  annual: 'price_annual_456',
};

describe('isPurchasableTier', () => {
  it('accepts the two purchasable plans', () => {
    expect(PURCHASABLE_TIERS).toEqual(['monthly', 'annual']);
    expect(isPurchasableTier('monthly')).toBe(true);
    expect(isPurchasableTier('annual')).toBe(true);
  });

  it('rejects "lifetime" — it is closed to new purchases, though stored Lifetime rows stay valid', () => {
    expect(isPurchasableTier('lifetime')).toBe(false);
    expect(PURCHASABLE_TIERS as readonly string[]).not.toContain('lifetime');
    // The tier itself still exists, so legacy Lifetime memberships remain representable.
    expect(ENTITLEMENT_TIERS as readonly string[]).toContain('lifetime');
  });

  it('rejects "free" — it has no Stripe price and is never a checkout target', () => {
    expect(isPurchasableTier('free')).toBe(false);
  });

  it('rejects an arbitrary client-supplied string — this is the guard a checkout request body passes through', () => {
    expect(isPurchasableTier('platinum')).toBe(false);
    expect(isPurchasableTier('')).toBe(false);
  });
});

describe('checkoutModeForTier', () => {
  it('uses subscription mode for the two recurring tiers', () => {
    expect(checkoutModeForTier('monthly')).toBe('subscription');
    expect(checkoutModeForTier('annual')).toBe('subscription');
  });

  it('has no one-time mode: every purchasable plan is a subscription', () => {
    for (const tier of PURCHASABLE_TIERS) expect(checkoutModeForTier(tier)).toBe('subscription');
  });
});

describe('resolvePriceId', () => {
  it('resolves a configured tier to its price id', () => {
    expect(resolvePriceId('monthly', priceIds)).toBe('price_monthly_123');
  });

  it('returns null — never a fabricated id — for a tier with no configured price', () => {
    expect(resolvePriceId('annual', { monthly: 'price_m', annual: undefined })).toBeNull();
  });
});

describe('mapPriceIdToTier', () => {
  it('finds the tier matching a real configured price id', () => {
    expect(mapPriceIdToTier('price_annual_456', priceIds)).toBe('annual');
  });

  it('returns null for a price id that matches no configured tier', () => {
    expect(mapPriceIdToTier('price_unknown_999', priceIds)).toBeNull();
  });

  it('returns null when the tier exists but has no price id configured', () => {
    expect(mapPriceIdToTier('anything', { monthly: undefined, annual: undefined })).toBeNull();
  });
});

describe('mapStripeSubscriptionStatus', () => {
  it('maps active and trialing 1:1', () => {
    expect(mapStripeSubscriptionStatus('active')).toBe('active');
    expect(mapStripeSubscriptionStatus('trialing')).toBe('trialing');
  });

  it('maps past_due and unpaid to past_due', () => {
    expect(mapStripeSubscriptionStatus('past_due')).toBe('past_due');
    expect(mapStripeSubscriptionStatus('unpaid')).toBe('past_due');
  });

  it('maps canceled 1:1', () => {
    expect(mapStripeSubscriptionStatus('canceled')).toBe('canceled');
  });

  it('fails safe to expired for incomplete, incomplete_expired, paused, and any unrecognised status', () => {
    expect(mapStripeSubscriptionStatus('incomplete')).toBe('expired');
    expect(mapStripeSubscriptionStatus('incomplete_expired')).toBe('expired');
    expect(mapStripeSubscriptionStatus('paused')).toBe('expired');
    expect(mapStripeSubscriptionStatus('some_future_stripe_status')).toBe('expired');
  });
});
