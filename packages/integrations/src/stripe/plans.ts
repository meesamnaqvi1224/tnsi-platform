/**
 * Regulation Suite™ commercial constants — Membership & Commercial Model v1
 * (owner-approved). The charged amounts live in Stripe (the Price IDs in the
 * environment); the figures here are the DISPLAY copy and must match those
 * Prices when they are created. Nothing else in the platform may hardcode a
 * price, trial length or plan name.
 */

/** Stripe-native subscription trial length, in days. */
export const MEMBERSHIP_TRIAL_DAYS = 30;

/** The two approved self-serve subscription plans (the only ones offered in the UI). */
export const MEMBERSHIP_PLANS = {
  monthly: { tier: 'monthly', label: 'Monthly', price: '£5.99', interval: 'month' },
  annual: { tier: 'annual', label: 'Annual', price: '£59', interval: 'year' },
} as const;

export type MembershipPlanTier = keyof typeof MEMBERSHIP_PLANS;
