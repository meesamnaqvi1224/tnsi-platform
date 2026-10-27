/**
 * Regulation Suite™ commercial constants — Membership & Commercial Model v1
 * (owner-approved). The charged amounts live in Stripe (the Price IDs in the
 * environment); the figures here are the DISPLAY copy and must match those
 * Prices when they are created. Nothing else in the platform may hardcode a
 * price, trial length or plan name.
 */

/**
 * The free trial's length, in days - DISPLAY copy. The trial is app-managed
 * (POST /api/v1/billing/trial, enforced from the account's own trial dates), not
 * a Stripe trial: it needs no payment card, creates no subscription, and when it
 * ends the account returns to Free with no charge and no automatic conversion.
 * The enforced length is `TRIAL_DURATION_DAYS` in @tnsi/auth; a test keeps the
 * two equal.
 */
export const MEMBERSHIP_TRIAL_DAYS = 30;

/** The two approved self-serve subscription plans (the only ones offered in the UI). */
export const MEMBERSHIP_PLANS = {
  monthly: { tier: 'monthly', label: 'Monthly', price: '£5.99', interval: 'month' },
  annual: { tier: 'annual', label: 'Annual', price: '£59.99', interval: 'year' },
} as const;

export type MembershipPlanTier = keyof typeof MEMBERSHIP_PLANS;

/**
 * Display copy for the annual saving ("approximately 17%"):
 * £5.99 x 12 = £71.88 against £59.99 is a 16.5% saving, shown as 17%. Kept next to the prices
 * so the two cannot drift apart (a test recomputes it from `MEMBERSHIP_PLANS`).
 */
export const MEMBERSHIP_ANNUAL_SAVING_PERCENT = 17;

/**
 * The approved number of PowerDrops™ a free account can open. Which three is
 * an editorial choice made in Sanity (`freeAccess` on each PowerDrop), not
 * here — this is only the figure shown to members.
 */
export const MEMBERSHIP_FREE_POWERDROPS = 3;
