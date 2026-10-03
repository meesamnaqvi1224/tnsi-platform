import { db, entitlements } from '@tnsi/db';
import { eq } from 'drizzle-orm';
import type { EntitlementStatus, EntitlementTier } from '@tnsi/integrations';
import { resolveMembership, type ResolvedMembership } from '@tnsi/auth/authorize/entitlements';

export interface BillingState {
  tier: EntitlementTier;
  status: EntitlementStatus;
  /**
   * Where the member stands in the commercial model (free / trialing /
   * active / grace / inactive), resolved by the same pure function
   * (`resolveMembership`, @tnsi/auth) every access check uses — so what the
   * billing page says and what the server enforces cannot disagree.
   */
  membership: ResolvedMembership;
  hasStripeCustomer: boolean;
  /** Whether this account has ever had a Stripe subscription — a first-time subscriber is the only one offered the 30-day trial. */
  hasHadSubscription: boolean;
  currentPeriodEnd: Date | null;
  cancelAtPeriodEnd: boolean;
  canceledAt: Date | null;
}

/**
 * Reads the authenticated member's own billing state directly from
 * Postgres, for display only — this never itself decides what content a
 * user can access (that stays `@tnsi/auth`'s job, via `resolveMembership` /
 * `canAccessContent`). Every user has an `entitlements` row from the moment
 * their account is created (see `DEFAULT_ENTITLEMENTS`), so this always
 * returns a value, never `null`.
 */
export async function getBillingState(userId: string): Promise<BillingState> {
  const [row] = await db
    .select({
      tier: entitlements.tier,
      status: entitlements.status,
      stripeCustomerId: entitlements.stripeCustomerId,
      stripeSubscriptionId: entitlements.stripeSubscriptionId,
      currentPeriodEnd: entitlements.currentPeriodEnd,
      cancelAtPeriodEnd: entitlements.cancelAtPeriodEnd,
      canceledAt: entitlements.canceledAt,
      paymentFailedAt: entitlements.paymentFailedAt,
    })
    .from(entitlements)
    .where(eq(entitlements.userId, userId))
    .limit(1);

  const tier = row?.tier ?? 'free';
  const status = row?.status ?? 'active';

  return {
    tier,
    status,
    membership: resolveMembership(
      row
        ? {
            tier,
            status,
            programs: [],
            certifications: [],
            features: [],
            paymentFailedAt: row.paymentFailedAt,
            cancelAtPeriodEnd: row.cancelAtPeriodEnd,
          }
        : null,
    ),
    hasStripeCustomer: Boolean(row?.stripeCustomerId),
    hasHadSubscription: Boolean(row?.stripeSubscriptionId),
    currentPeriodEnd: row?.currentPeriodEnd ?? null,
    cancelAtPeriodEnd: row?.cancelAtPeriodEnd ?? false,
    canceledAt: row?.canceledAt ?? null,
  };
}
