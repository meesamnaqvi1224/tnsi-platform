import { isMembershipOpen } from '@tnsi/integrations';

/**
 * Whether Regulation Suite membership is open for purchase. The single
 * definition lives in `@tnsi/integrations` (`isMembershipOpen`): open only when
 * `REGULATION_SUITE_MEMBERSHIP_OPEN` is exactly "true" AND Stripe is fully
 * configured (secret key, webhook secret, monthly and annual Prices). The safe
 * default - the variable unset - is closed.
 *
 * Re-exported here so the web app has one import point for "is membership open?".
 */
export { isMembershipOpen };

/** The slice of an entitlement row the duplicate-subscription check needs. */
export interface MembershipEntitlement {
  tier: 'free' | 'monthly' | 'annual' | 'lifetime';
  status: 'active' | 'past_due' | 'canceled' | 'trialing' | 'expired';
}

/**
 * Whether this entitlement already holds paid membership: a paid or legacy
 * Lifetime tier that is active, in a trial, or in payment grace (past due). Such
 * a member must manage their plan in the billing portal, never start another
 * subscription. Free accounts, and ended (canceled/expired) memberships, may buy.
 */
export function holdsPaidMembership(
  entitlement: MembershipEntitlement | null | undefined,
): boolean {
  if (!entitlement) return false;
  if (entitlement.tier === 'free') return false;
  return (
    entitlement.status === 'active' ||
    entitlement.status === 'trialing' ||
    entitlement.status === 'past_due'
  );
}
