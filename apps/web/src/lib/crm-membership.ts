import { FLOWI_FIELD } from '@tnsi/integrations';
import { resolveMembership, type MembershipRecord } from '@tnsi/auth/authorize/entitlements';
import type { OutboxPayload } from './crm-outbox';

/**
 * What the CRM is told about a member's membership. Pure: the decision lives
 * here, the database and network calls live elsewhere (crm-membership-sync.ts).
 *
 * The state is NOT worked out a second time. It is read from `resolveMembership`,
 * the one server-side decision behind every access check and the account page,
 * and only then translated into the wording of the Flowi "TNSI Membership State"
 * field. So the CRM cannot disagree with what the member sees in the app.
 *
 * Only a change of state sends anything, so a duplicate or replayed Stripe event
 * (or a read-time refresh that finds nothing new) sends nothing. Tags are only
 * ever ADDED (see flowi.ts); Flowi's own workflows remove an entry tag when they
 * start, so that the same tag can trigger them again later.
 *
 * Nothing here is health data: only the state, the plan and two dates.
 */

/** The exact options of the Flowi "TNSI Membership State" dropdown. */
export type CrmMembershipState =
  | 'Free'
  | 'Trial'
  | 'Member'
  | 'Member Cancelling'
  | 'Payment Issue'
  | 'Free (trial ended)'
  | 'Free (ended)'
  | 'Lifetime';

/** The tag each state adds. `Free` is a sign-up (see `appSignupPayload`); `Lifetime` is never sent. */
const STATE_TAG: Record<Exclude<CrmMembershipState, 'Lifetime'>, string> = {
  Free: 'TNSI App Signup',
  Trial: 'TNSI Trial Started',
  Member: 'TNSI Member',
  'Member Cancelling': 'TNSI Membership Cancelling',
  'Payment Issue': 'TNSI Payment Issue',
  'Free (trial ended)': 'TNSI Trial Ended',
  'Free (ended)': 'TNSI Membership Ended',
};

/** The exact options of the Flowi "TNSI Plan" dropdown. */
type CrmPlan = 'None' | 'Monthly' | 'Annual' | 'Lifetime';

export type CrmMembershipRecord = MembershipRecord & { cancelAtPeriodEnd?: boolean };

/**
 * The state to show in the CRM, or `null` when it cannot be trusted yet (a paid
 * row whose renewal still has to be confirmed with Stripe): nothing is sent then,
 * rather than wrongly telling the CRM that a member has left.
 */
export function crmMembershipState(
  record: CrmMembershipRecord,
  now: Date,
): CrmMembershipState | null {
  if (record.tier === 'lifetime') return 'Lifetime';
  const membership = resolveMembership(record, now);

  switch (membership.state) {
    case 'trialing':
      return 'Trial';
    case 'active':
      return membership.cancelsAtPeriodEnd ? 'Member Cancelling' : 'Member';
    case 'grace':
      // A failed payment is something to tell the member about. A renewal Stripe
      // could not be asked about is not: they are still a member as far as they know.
      if (membership.graceReason === 'payment_failed') return 'Payment Issue';
      return membership.cancelsAtPeriodEnd ? 'Member Cancelling' : 'Member';
    case 'inactive':
      return membership.reconciliation === 'required' ? null : 'Free (ended)';
    case 'free':
      return membership.trialExpired ? 'Free (trial ended)' : 'Free';
  }
}

function planFor(state: CrmMembershipState, tier: CrmMembershipRecord['tier']): CrmPlan {
  if (state === 'Lifetime') return 'Lifetime';
  if (state === 'Free' || state === 'Trial' || state.startsWith('Free (')) return 'None';
  return tier === 'annual' ? 'Annual' : 'Monthly';
}

/** A DATE field takes a plain calendar date. */
function dateOnly(value: Date | null | undefined): string {
  if (!value || Number.isNaN(value.getTime())) return '';
  return value.toISOString().slice(0, 10);
}

/** Splits a full name the same way the contact form does. */
function nameParts(fullName: string | null | undefined): { firstName?: string; lastName?: string } {
  const [firstName, ...rest] = (fullName ?? '').trim().split(/\s+/);
  if (!firstName) return {};
  return { firstName, ...(rest.length > 0 ? { lastName: rest.join(' ') } : {}) };
}

/** What goes to Flowi when a membership's state changes to `state`. */
export function membershipPayload(
  state: Exclude<CrmMembershipState, 'Lifetime'>,
  record: CrmMembershipRecord,
  person: { fullName?: string | null } = {},
): OutboxPayload {
  const paid = state === 'Member' || state === 'Member Cancelling' || state === 'Payment Issue';
  return {
    source: 'TNSI app — membership',
    tags: [STATE_TAG[state]],
    ...nameParts(person.fullName),
    customFields: [
      { id: FLOWI_FIELD.membershipState.id, value: state },
      { id: FLOWI_FIELD.plan.id, value: planFor(state, record.tier) },
      // Kept as history after a trial ends; blank values are never sent.
      { id: FLOWI_FIELD.trialEnds.id, value: dateOnly(record.trialEndsAt) },
      {
        id: FLOWI_FIELD.paidThrough.id,
        value: paid || state === 'Free (ended)' ? dateOnly(record.currentPeriodEnd) : '',
      },
    ],
  };
}

/** The first thing the CRM hears about a new account. */
export function appSignupPayload(person: { fullName?: string | null }): OutboxPayload {
  return {
    source: 'TNSI app — sign-up',
    tags: [STATE_TAG.Free],
    ...nameParts(person.fullName),
    customFields: [
      { id: FLOWI_FIELD.membershipState.id, value: 'Free' },
      { id: FLOWI_FIELD.plan.id, value: 'None' },
    ],
  };
}

/**
 * Compares the membership before and after a change. Returns what to send, or
 * `null` when nothing the CRM shows has changed (or the new state is unknown).
 */
export function membershipChange(
  before: CrmMembershipRecord | null,
  after: CrmMembershipRecord,
  now: Date,
  person: { fullName?: string | null } = {},
): OutboxPayload | null {
  const next = crmMembershipState(after, now);
  // A legacy Lifetime membership is never touched by this sync.
  if (next === null || next === 'Lifetime') return null;
  const previous = before ? crmMembershipState(before, now) : null;
  if (previous === next) return null;
  return membershipPayload(next, after, person);
}
