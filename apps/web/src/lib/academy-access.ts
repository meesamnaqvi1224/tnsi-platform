import { MEMBERSHIP_TRIAL_DAYS } from '@tnsi/integrations';
import type { Entitlement } from '@tnsi/db/schema';
import { wholeDaysUntil } from '@/lib/membership-view';

/** What the member is called on Academy Home, by plan. */
const TIER_LABELS: Record<Entitlement['tier'], string> = {
  free: 'Free Member',
  monthly: 'Monthly Member',
  annual: 'Annual Member',
  lifetime: 'Lifetime Member',
};

export interface AccessSummary {
  /** The member's standing: "Free Member", "Trial Membership", "Annual Member", ... */
  label: string;
  /** The short chip under the greeting, e.g. "Trial · Day 3 of 30". */
  chip: string;
  /** One honest sentence for the states that need explaining; `null` when the chip says it all. */
  description: string | null;
}

interface MembershipLike {
  state: 'free' | 'trialing' | 'active' | 'grace' | 'inactive';
  hasPaidAccess: boolean;
  trialEndsAt: Date | null;
  trialExpired: boolean;
}

function formatDate(date: Date): string {
  return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
}

/**
 * How Academy Home describes the member's access. It follows the resolved
 * membership (the same `resolveMembership` every access check uses), not the
 * stored plan: during the free trial the stored plan is still "free" while the
 * member has full access, so labelling by plan alone called a trial member a
 * "Free Member". Pure, and nothing is shown that the dates do not support.
 */
export function summariseAccess(
  membership: MembershipLike,
  tier: Entitlement['tier'],
  now: Date = new Date(),
): AccessSummary {
  if (membership.state === 'trialing') {
    const remaining = wholeDaysUntil(membership.trialEndsAt, now);
    const day =
      remaining === null
        ? null
        : Math.min(Math.max(MEMBERSHIP_TRIAL_DAYS - remaining + 1, 1), MEMBERSHIP_TRIAL_DAYS);
    return {
      label: 'Trial Membership',
      chip: day === null ? 'Trial membership' : `Trial · Day ${day} of ${MEMBERSHIP_TRIAL_DAYS}`,
      description: membership.trialEndsAt
        ? `Your free trial ends on ${formatDate(membership.trialEndsAt)}.`
        : null,
    };
  }

  if (membership.hasPaidAccess) {
    const label = TIER_LABELS[tier];
    return {
      label,
      chip: label,
      description:
        membership.state === 'grace'
          ? 'Your membership needs your attention. Open your membership page for details.'
          : null,
    };
  }

  if (membership.state === 'inactive') {
    return {
      label: TIER_LABELS.free,
      chip: TIER_LABELS.free,
      description: 'Your paid membership has ended. Your free account remains active.',
    };
  }

  return {
    label: TIER_LABELS.free,
    chip: TIER_LABELS.free,
    description: membership.trialExpired
      ? 'Your free trial has ended. Your account is a Free account again.'
      : null,
  };
}
