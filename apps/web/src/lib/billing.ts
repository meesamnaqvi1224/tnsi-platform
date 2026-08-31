import { db, entitlements } from '@tnsi/db';
import { eq } from 'drizzle-orm';
import type { EntitlementStatus, EntitlementTier } from '@tnsi/integrations';

export interface BillingState {
  tier: EntitlementTier;
  status: EntitlementStatus;
  /** Whether this status currently grants paid access — the same rule `authorizeEntitlement` (@tnsi/auth) applies; duplicated as a read-only display fact here, not a second authorization path. */
  isEligible: boolean;
  hasStripeCustomer: boolean;
  currentPeriodEnd: Date | null;
  cancelAtPeriodEnd: boolean;
  canceledAt: Date | null;
}

/**
 * The same statuses `authorizeEntitlement` (packages/auth/src/authorize/entitlements.ts)
 * treats as eligible. Duplicated as a plain constant rather than importing
 * that function, since this module only needs the *display* fact "is this
 * currently active," not to make an access decision — the real
 * authorization check for gating content stays exactly where it already
 * is. Keep these two lists in sync if that ever changes.
 */
const ELIGIBLE_STATUSES: ReadonlySet<EntitlementStatus> = new Set(['active', 'trialing']);

/**
 * Reads the authenticated member's own billing state directly from
 * Postgres, for display only — this never itself decides what content a
 * user can access (that stays `authorizeEntitlement`'s job). Every user
 * has an `entitlements` row from the moment their account is created (see
 * `DEFAULT_ENTITLEMENTS`), so this always returns a value, never `null`.
 */
export async function getBillingState(userId: string): Promise<BillingState> {
  const [row] = await db
    .select({
      tier: entitlements.tier,
      status: entitlements.status,
      stripeCustomerId: entitlements.stripeCustomerId,
      currentPeriodEnd: entitlements.currentPeriodEnd,
      cancelAtPeriodEnd: entitlements.cancelAtPeriodEnd,
      canceledAt: entitlements.canceledAt,
    })
    .from(entitlements)
    .where(eq(entitlements.userId, userId))
    .limit(1);

  const tier = row?.tier ?? 'free';
  const status = row?.status ?? 'active';

  return {
    tier,
    status,
    isEligible: ELIGIBLE_STATUSES.has(status),
    hasStripeCustomer: Boolean(row?.stripeCustomerId),
    currentPeriodEnd: row?.currentPeriodEnd ?? null,
    cancelAtPeriodEnd: row?.cancelAtPeriodEnd ?? false,
    canceledAt: row?.canceledAt ?? null,
  };
}
