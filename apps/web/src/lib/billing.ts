import { db, entitlements } from '@tnsi/db';
import { eq } from 'drizzle-orm';
import type { EntitlementStatus, EntitlementTier } from '@tnsi/integrations';
import { resolveMembership, type ResolvedMembership } from '@tnsi/auth/authorize/entitlements';
import { isMembershipOpen, trialAvailableFor } from '@/lib/membership';
import { reconcileMembership } from '@/lib/reconcile-subscription';

export interface BillingState {
  tier: EntitlementTier;
  status: EntitlementStatus;
  /**
   * Where the member stands in the commercial model (free / trialing /
   * active / grace / inactive), resolved by the same pure function
   * (`resolveMembership`, @tnsi/auth) every access check uses, from the same
   * full row (trial window, paid-through date, Stripe subscription) - so what
   * the billing page says and what the server enforces cannot disagree.
   */
  membership: ResolvedMembership;
  hasStripeCustomer: boolean;
  /** Whether this account has ever had a Stripe subscription. Used only to tell an ENDED membership from a never-subscribed Free account; it does not decide trial eligibility. */
  hasHadSubscription: boolean;
  /** Whether the server offers this account the free trial right now (`trialAvailableFor`) - authoritative; the page never derives it. */
  trialAvailable: boolean;
  currentPeriodEnd: Date | null;
  cancelAtPeriodEnd: boolean;
  canceledAt: Date | null;
}

/**
 * Reads the authenticated member's own billing state directly from
 * Postgres, for display only - this never itself decides what content a
 * user can access (that stays `@tnsi/auth`'s job, via `resolveMembership` /
 * `canAccessContent`). Every user has an `entitlements` row from the moment
 * their account is created (see `DEFAULT_ENTITLEMENTS`), so this normally
 * returns a value built from a real row.
 *
 * An unconfirmed Stripe renewal is refreshed from Stripe first, exactly as
 * `getAuthUser` does, so this page and every access check agree.
 */
export async function getBillingState(userId: string): Promise<BillingState> {
  const load = async () =>
    (await db.select().from(entitlements).where(eq(entitlements.userId, userId)).limit(1))[0];

  let row:
    (NonNullable<Awaited<ReturnType<typeof load>>> & { stripeUnreachable?: boolean }) | undefined =
    await load();

  if (row) {
    const outcome = await reconcileMembership({ userId, record: row });
    if (outcome.status === 'refreshed') row = (await load()) ?? row;
    else if (outcome.status === 'unreachable') row = { ...row, stripeUnreachable: true };
  }

  const tier = row?.tier ?? 'free';
  const status = row?.status ?? 'active';

  return {
    tier,
    status,
    membership: resolveMembership(row ?? null),
    hasStripeCustomer: Boolean(row?.stripeCustomerId),
    hasHadSubscription: Boolean(row?.stripeSubscriptionId),
    trialAvailable: trialAvailableFor(row ?? null, isMembershipOpen()),
    currentPeriodEnd: row?.currentPeriodEnd ?? null,
    cancelAtPeriodEnd: row?.cancelAtPeriodEnd ?? false,
    canceledAt: row?.canceledAt ?? null,
  };
}
