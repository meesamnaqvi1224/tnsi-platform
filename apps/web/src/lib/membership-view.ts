import { MEMBERSHIP_PLANS } from '@tnsi/integrations';
import type { BillingState } from '@/lib/billing';

/**
 * What the membership page says, derived from the member's real billing
 * state. Pure: a function of the entitlement-derived `BillingState` (whose
 * `membership` is resolved by `resolveMembership`, @tnsi/auth — the same
 * function every server-side access check uses) and `now`. Nothing is
 * invented: a date or a count is only present when the stored data supports
 * it, and nothing here decides what content a member may open.
 *
 * The six conceptual states in the approved model map onto the existing
 * entitlement vocabulary as:
 *
 *   free           <- membership.state `free` (or an account that never held a plan)
 *   trialing       <- `trialing`, not cancelled
 *   active         <- `active`, not cancelled
 *   ending         <- `trialing` or `active` with `cancelAtPeriodEnd` (access runs to period end)
 *   payment_issue  <- `grace` (past_due inside the 7-day window counted from the first failure)
 *   ended          <- `inactive` for an account that did hold a plan
 */
export type MembershipViewKind =
  'free' | 'trialing' | 'active' | 'ending' | 'payment_issue' | 'ended';

export interface MembershipView {
  kind: MembershipViewKind;
  /** The headline: "Free Member", "Trial Membership", … */
  statusLabel: string;
  /** Full Regulation Suite™ library (trialing, active, or inside payment grace). */
  hasPaidAccess: boolean;
  /** Current plan, only for a member who holds one. */
  plan: { label: string; price: string | null } | null;
  /** Short billing-status line for the details list; `null` when there is nothing real to say. */
  billingStatus: string | null;
  /** End of the free trial (while trialing) - the server's `trialEndsAt`, never inferred from a billing period. */
  trialEndsAt: Date | null;
  /** A Free account whose 30-day trial has ended. It is Free again, nothing was charged, and there is no second trial. */
  trialExpired: boolean;
  /** Whole days left in the trial (while trialing and the end is still in the future). */
  trialDaysRemaining: number | null;
  /** Next renewal (an active, non-cancelling member with a recorded period end). */
  nextBillingDate: Date | null;
  /** Last day of access for a member who has cancelled renewal. */
  accessEndsAt: Date | null;
  /** End of the payment grace period (from the first failed payment). */
  graceEndsAt: Date | null;
  /** Whole days left in the grace period. */
  graceDaysRemaining: number | null;
  /** The Stripe portal can only be opened for an account that has a Stripe customer. */
  canManageBilling: boolean;
  /**
   * The server offers this account the free trial right now. Read straight
   * from the server (`BillingState.trialAvailable`, decided by
   * `trialAvailableFor`) - never derived here - so the page can only advertise a
   * trial the server will actually start. False while membership is closed.
   */
  trialAvailable: boolean;
  /** Why access is being held while `kind` is `payment_issue`: a failed payment, or a renewal we could not confirm yet. */
  graceReason: 'payment_failed' | 'renewal_unconfirmed' | null;
}

const MS_PER_DAY = 24 * 60 * 60 * 1000;

/** Whole days between `now` and a future `end`; `null` when `end` is absent or not in the future. */
export function wholeDaysUntil(end: Date | null, now: Date): number | null {
  if (!end) return null;
  const ms = end.getTime() - now.getTime();
  if (ms <= 0) return null;
  return Math.ceil(ms / MS_PER_DAY);
}

function planFor(tier: BillingState['tier']): MembershipView['plan'] {
  if (tier === 'monthly' || tier === 'annual') {
    const plan = MEMBERSHIP_PLANS[tier];
    return { label: plan.label, price: `${plan.price}/${plan.interval}` };
  }
  // A legacy/manually granted tier outside the approved offer: name it, never price it.
  if (tier === 'lifetime') return { label: 'Lifetime', price: null };
  return null;
}

const STATUS_LABEL: Record<MembershipViewKind, string> = {
  free: 'Free Member',
  trialing: 'Trial Membership',
  active: 'Active Membership',
  ending: 'Membership ending',
  payment_issue: 'Payment issue',
  ended: 'Membership ended',
};

export function buildMembershipView(billing: BillingState, now: Date = new Date()): MembershipView {
  const { membership } = billing;

  let kind: MembershipViewKind;
  if (membership.state === 'grace') {
    kind = 'payment_issue';
  } else if (membership.state === 'trialing' || membership.state === 'active') {
    kind = membership.cancelsAtPeriodEnd
      ? 'ending'
      : membership.state === 'trialing'
        ? 'trialing'
        : 'active';
  } else if (membership.state === 'inactive') {
    // `inactive` also covers an account with no entitlement row at all. That
    // is a free account, not an ended membership — only an account that
    // actually held a plan (or a Stripe subscription) has one to end.
    kind = billing.tier !== 'free' || billing.hasHadSubscription ? 'ended' : 'free';
  } else {
    kind = 'free';
  }

  const periodEnd = billing.currentPeriodEnd;
  const paid = membership.hasPaidAccess;
  const holdsPlan =
    kind === 'trialing' || kind === 'active' || kind === 'ending' || kind === 'payment_issue';

  const trialEndsAt = membership.trialEndsAt;
  // The paid-through date is the server's (`paidThrough`), falling back to the stored period end.
  const paidThrough = membership.paidThrough ?? periodEnd;
  const graceEndsAt = kind === 'payment_issue' ? membership.graceEndsAt : null;

  let billingStatus: string | null = null;
  if (kind === 'trialing') billingStatus = 'Free trial — no payment card on file';
  else if (kind === 'active') billingStatus = 'Active';
  else if (kind === 'ending') billingStatus = 'Renewal cancelled';
  else if (kind === 'payment_issue') {
    billingStatus =
      membership.graceReason === 'renewal_unconfirmed'
        ? 'Confirming your renewal'
        : 'Payment needs attention';
  }

  return {
    kind,
    statusLabel: STATUS_LABEL[kind],
    hasPaidAccess: paid,
    plan: holdsPlan ? planFor(billing.tier) : null,
    billingStatus,
    trialEndsAt,
    trialExpired: kind === 'free' && membership.trialExpired,
    trialDaysRemaining: kind === 'trialing' ? wholeDaysUntil(trialEndsAt, now) : null,
    nextBillingDate: kind === 'active' ? paidThrough : null,
    accessEndsAt: kind === 'ending' ? paidThrough : null,
    graceEndsAt,
    graceDaysRemaining: wholeDaysUntil(graceEndsAt, now),
    canManageBilling: billing.hasStripeCustomer,
    trialAvailable: billing.trialAvailable,
    graceReason: kind === 'payment_issue' ? membership.graceReason : null,
  };
}
