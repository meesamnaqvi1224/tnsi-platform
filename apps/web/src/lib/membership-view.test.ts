import { describe, expect, it } from 'vitest';
import { resolveMembership } from '@tnsi/auth/authorize/entitlements';
import type { BillingState } from '@/lib/billing';
import { buildMembershipView, wholeDaysUntil } from './membership-view';

const NOW = new Date('2026-10-08T12:00:00.000Z');
const DAY = 24 * 60 * 60 * 1000;
const at = (days: number) => new Date(NOW.getTime() + days * DAY);

function state(over: {
  tier?: BillingState['tier'];
  status?: BillingState['status'];
  paymentFailedAt?: Date | null;
  cancelAtPeriodEnd?: boolean;
  hasStripeCustomer?: boolean;
  hasHadSubscription?: boolean;
  currentPeriodEnd?: Date | null;
  trialStartedAt?: Date | null;
  trialEndsAt?: Date | null;
  /** What the SERVER says (`BillingState.trialAvailable`); the view only mirrors it. */
  trialAvailable?: boolean;
  stripeUnreachable?: boolean;
  noRow?: boolean;
}): BillingState {
  const {
    tier = 'free',
    status = 'active',
    paymentFailedAt = null,
    cancelAtPeriodEnd = false,
    hasStripeCustomer = false,
    hasHadSubscription = false,
    currentPeriodEnd = null,
    trialStartedAt = null,
    trialEndsAt = null,
    trialAvailable = false,
    stripeUnreachable = false,
    noRow = false,
  } = over;
  return {
    tier,
    status,
    // The same full row `getBillingState` resolves from: trial window,
    // paid-through date and Stripe subscription all included.
    membership: resolveMembership(
      noRow
        ? null
        : {
            tier,
            status,
            programs: [],
            certifications: [],
            features: [],
            paymentFailedAt,
            cancelAtPeriodEnd,
            currentPeriodEnd,
            trialStartedAt,
            trialEndsAt,
            stripeSubscriptionId: hasHadSubscription ? 'sub_1' : null,
            stripeUnreachable,
          },
      NOW,
    ),
    hasStripeCustomer,
    hasHadSubscription,
    trialAvailable,
    currentPeriodEnd,
    cancelAtPeriodEnd,
    canceledAt: null,
  };
}

describe('buildMembershipView — the six states', () => {
  it('free', () => {
    const v = buildMembershipView(state({}), NOW);
    expect(v).toMatchObject({
      kind: 'free',
      statusLabel: 'Free Member',
      hasPaidAccess: false,
      plan: null,
      trialExpired: false,
      trialAvailable: false,
    });
  });

  it('trialing (app-managed free trial): real days left from the server’s trial end, no billing claimed', () => {
    const v = buildMembershipView(
      state({ tier: 'free', trialStartedAt: at(-18), trialEndsAt: at(12) }),
      NOW,
    );
    expect(v).toMatchObject({
      kind: 'trialing',
      statusLabel: 'Trial Membership',
      hasPaidAccess: true,
      trialDaysRemaining: 12,
      billingStatus: 'Free trial — no payment card on file',
      trialAvailable: false,
    });
    expect(v.trialEndsAt).toEqual(at(12));
    expect(v.nextBillingDate).toBeNull();
    expect(v.plan).toBeNull(); // no plan: nothing is subscribed, nothing will convert
    expect(v.canManageBilling).toBe(false);
  });

  it('a pre-existing Stripe-run trial is still shown as a trial, ending at its recorded date', () => {
    const v = buildMembershipView(
      state({
        tier: 'monthly',
        status: 'trialing',
        hasHadSubscription: true,
        currentPeriodEnd: at(12),
      }),
      NOW,
    );
    expect(v).toMatchObject({ kind: 'trialing', trialDaysRemaining: 12 });
    expect(v.trialEndsAt).toEqual(at(12));
  });

  it('an expired trial is a Free Member again, flagged as expired, with no plan and no charge', () => {
    const v = buildMembershipView(
      state({ tier: 'free', trialStartedAt: at(-40), trialEndsAt: at(-10) }),
      NOW,
    );
    expect(v).toMatchObject({
      kind: 'free',
      statusLabel: 'Free Member',
      hasPaidAccess: false,
      trialExpired: true,
      trialEndsAt: null,
      plan: null,
    });
  });

  it('inconsistent trial dates give no trial and no expiry claim', () => {
    const v = buildMembershipView(
      state({ tier: 'free', trialStartedAt: at(-1), trialEndsAt: null }),
      NOW,
    );
    expect(v).toMatchObject({ kind: 'free', hasPaidAccess: false, trialExpired: false });
  });

  it('active: next billing date from the stored period end', () => {
    const v = buildMembershipView(
      state({
        tier: 'annual',
        status: 'active',
        hasHadSubscription: true,
        currentPeriodEnd: at(100),
      }),
      NOW,
    );
    expect(v).toMatchObject({
      kind: 'active',
      statusLabel: 'Active Membership',
      billingStatus: 'Active',
    });
    expect(v.nextBillingDate).toEqual(at(100));
    expect(v.plan).toEqual({ label: 'Annual', price: '£59/year' });
  });

  it('cancelled but still active: ending, with the access end date and still paid access', () => {
    for (const status of ['active', 'trialing'] as const) {
      const v = buildMembershipView(
        state({
          tier: 'monthly',
          status,
          cancelAtPeriodEnd: true,
          hasHadSubscription: true,
          currentPeriodEnd: at(9),
        }),
        NOW,
      );
      expect(v).toMatchObject({
        kind: 'ending',
        statusLabel: 'Membership ending',
        hasPaidAccess: true,
      });
      expect(v.accessEndsAt).toEqual(at(9));
      expect(v.nextBillingDate).toBeNull();
    }
  });

  it('payment failure inside the 7-day window: payment issue, with the real grace end and days left', () => {
    const failedAt = at(-2);
    const v = buildMembershipView(
      state({
        tier: 'monthly',
        status: 'past_due',
        paymentFailedAt: failedAt,
        hasHadSubscription: true,
      }),
      NOW,
    );
    expect(v).toMatchObject({
      kind: 'payment_issue',
      statusLabel: 'Payment issue',
      hasPaidAccess: true,
    });
    expect(v.graceEndsAt).toEqual(at(5));
    expect(v.graceDaysRemaining).toBe(5);
  });

  it('past due with no recorded failure time is not given a grace period', () => {
    const v = buildMembershipView(
      state({
        tier: 'monthly',
        status: 'past_due',
        paymentFailedAt: null,
        hasHadSubscription: true,
      }),
      NOW,
    );
    expect(v.kind).toBe('ended');
    expect(v.graceEndsAt).toBeNull();
  });

  it('payment unresolved past grace, cancelled, and expired all read as ended', () => {
    for (const s of [
      state({
        tier: 'monthly',
        status: 'past_due',
        paymentFailedAt: at(-8),
        hasHadSubscription: true,
      }),
      state({ tier: 'monthly', status: 'canceled', hasHadSubscription: true }),
      state({ tier: 'annual', status: 'expired', hasHadSubscription: true }),
    ]) {
      const v = buildMembershipView(s, NOW);
      expect(v).toMatchObject({
        kind: 'ended',
        statusLabel: 'Membership ended',
        hasPaidAccess: false,
      });
      expect(v.plan).toBeNull();
    }
  });
});

describe('buildMembershipView — edge cases', () => {
  it('an account with no entitlement row and no history is free, not ended', () => {
    expect(buildMembershipView(state({ noRow: true }), NOW).kind).toBe('free');
  });

  it('mirrors the server’s trial availability and never derives it from subscription history', () => {
    // The server says yes -> yes, even for an account with a subscription history; no -> no.
    expect(buildMembershipView(state({ trialAvailable: true }), NOW).trialAvailable).toBe(true);
    expect(buildMembershipView(state({ trialAvailable: false }), NOW).trialAvailable).toBe(false);
    expect(
      buildMembershipView(state({ hasHadSubscription: true, trialAvailable: false }), NOW)
        .trialAvailable,
    ).toBe(false);
    expect(
      buildMembershipView(state({ hasHadSubscription: false, trialAvailable: false }), NOW)
        .trialAvailable,
    ).toBe(false);
  });

  it('a renewal the server could not confirm is shown as such, with its bounded end date', () => {
    const end = at(-0.25); // ended 6 hours ago
    const v = buildMembershipView(
      state({
        tier: 'monthly',
        status: 'active',
        hasHadSubscription: true,
        hasStripeCustomer: true,
        currentPeriodEnd: end,
        stripeUnreachable: true,
      }),
      NOW,
    );
    expect(v).toMatchObject({
      kind: 'payment_issue',
      hasPaidAccess: true,
      graceReason: 'renewal_unconfirmed',
      billingStatus: 'Confirming your renewal',
    });
    expect(v.graceEndsAt).toEqual(new Date(end.getTime() + 7 * DAY));
  });

  it('a failed payment is shown as a payment issue with its reason', () => {
    const v = buildMembershipView(
      state({
        tier: 'monthly',
        status: 'past_due',
        hasHadSubscription: true,
        currentPeriodEnd: at(-1),
        paymentFailedAt: at(-2),
      }),
      NOW,
    );
    expect(v).toMatchObject({ kind: 'payment_issue', graceReason: 'payment_failed' });
  });

  it('uses the server’s paid-through date for a membership that is ending', () => {
    const v = buildMembershipView(
      state({
        tier: 'annual',
        status: 'active',
        hasHadSubscription: true,
        cancelAtPeriodEnd: true,
        currentPeriodEnd: at(40),
      }),
      NOW,
    );
    expect(v).toMatchObject({ kind: 'ending' });
    expect(v.accessEndsAt).toEqual(at(40));
  });

  it('exposes whether the billing portal can be opened', () => {
    expect(
      buildMembershipView(state({ tier: 'monthly', hasStripeCustomer: true }), NOW)
        .canManageBilling,
    ).toBe(true);
    expect(
      buildMembershipView(state({ tier: 'monthly', hasStripeCustomer: false }), NOW)
        .canManageBilling,
    ).toBe(false);
  });

  it('names a lifetime tier without pricing it', () => {
    const v = buildMembershipView(state({ tier: 'lifetime', status: 'active' }), NOW);
    expect(v.plan).toEqual({ label: 'Lifetime', price: null });
  });
});

describe('wholeDaysUntil', () => {
  it('rounds up to whole days', () => {
    expect(wholeDaysUntil(new Date(NOW.getTime() + 1), NOW)).toBe(1);
    expect(wholeDaysUntil(at(1), NOW)).toBe(1);
    expect(wholeDaysUntil(new Date(NOW.getTime() + DAY + 1), NOW)).toBe(2);
  });

  it('is null when there is no end or it is not in the future', () => {
    expect(wholeDaysUntil(null, NOW)).toBeNull();
    expect(wholeDaysUntil(NOW, NOW)).toBeNull();
    expect(wholeDaysUntil(at(-1), NOW)).toBeNull();
  });
});
