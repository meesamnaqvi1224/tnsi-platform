import { describe, expect, it } from 'vitest';
import { FLOWI_FIELD } from '@tnsi/integrations';
import {
  appSignupPayload,
  crmMembershipState,
  membershipChange,
  membershipPayload,
  type CrmMembershipRecord,
} from './crm-membership';

const NOW = new Date('2026-11-10T12:00:00Z');
const DAY = 24 * 60 * 60 * 1000;
const inDays = (n: number) => new Date(NOW.getTime() + n * DAY);

function record(overrides: Partial<CrmMembershipRecord> = {}): CrmMembershipRecord {
  return {
    tier: 'free',
    status: 'active',
    programs: [],
    certifications: [],
    features: [],
    cancelAtPeriodEnd: false,
    ...overrides,
  };
}

const freeAccount = record();
const trialling = record({ trialStartedAt: inDays(-3), trialEndsAt: inDays(27) });
const trialEnded = record({ trialStartedAt: inDays(-40), trialEndsAt: inDays(-10) });
const member = record({
  tier: 'monthly',
  stripeSubscriptionId: 'sub_1',
  currentPeriodEnd: inDays(20),
});
const cancelling = { ...member, cancelAtPeriodEnd: true };
const paymentIssue = {
  ...member,
  status: 'past_due' as const,
  paymentFailedAt: inDays(-1),
};
const ended = record({
  tier: 'monthly',
  status: 'canceled',
  stripeSubscriptionId: 'sub_1',
  currentPeriodEnd: inDays(-5),
});

const value = (payload: { customFields?: { id: string; value: string }[] }, id: string) =>
  payload.customFields?.find((f) => f.id === id)?.value;

describe('crmMembershipState', () => {
  it.each([
    ['a free account', freeAccount, 'Free'],
    ['an unexpired trial', trialling, 'Trial'],
    ['a trial that has run out', trialEnded, 'Free (trial ended)'],
    ['a paying member', member, 'Member'],
    ['a member who has cancelled but is paid up', cancelling, 'Member Cancelling'],
    ['a failed payment inside the 7-day grace', paymentIssue, 'Payment Issue'],
    ['a cancelled membership whose period is over', ended, 'Free (ended)'],
    ['a legacy lifetime membership', record({ tier: 'lifetime' }), 'Lifetime'],
  ] as const)('reads %s as %s', (_label, input, expected) => {
    expect(crmMembershipState(input, NOW)).toBe(expected);
  });

  it('says nothing about a paid row whose renewal still has to be confirmed with Stripe', () => {
    const unconfirmed = record({
      tier: 'monthly',
      stripeSubscriptionId: 'sub_1',
      currentPeriodEnd: inDays(-30),
    });
    expect(crmMembershipState(unconfirmed, NOW)).toBeNull();
  });
});

describe('membershipPayload', () => {
  it('writes the state, plan and paid-through date for a member', () => {
    const payload = membershipPayload('Member', member);
    expect(payload.tags).toEqual(['TNSI Member']);
    expect(value(payload, FLOWI_FIELD.membershipState.id)).toBe('Member');
    expect(value(payload, FLOWI_FIELD.plan.id)).toBe('Monthly');
    expect(value(payload, FLOWI_FIELD.paidThrough.id)).toBe('2026-11-30');
  });

  it('writes "Annual" in full for an annual plan', () => {
    const annual = { ...member, tier: 'annual' as const };
    expect(value(membershipPayload('Member', annual), FLOWI_FIELD.plan.id)).toBe('Annual');
  });

  it('writes the trial end date, and no plan, for a trial', () => {
    const payload = membershipPayload('Trial', trialling);
    expect(payload.tags).toEqual(['TNSI Trial Started']);
    expect(value(payload, FLOWI_FIELD.plan.id)).toBe('None');
    expect(value(payload, FLOWI_FIELD.trialEnds.id)).toBe('2026-12-07');
  });

  it('adds the tag for each state, and only that tag', () => {
    expect(membershipPayload('Member Cancelling', cancelling).tags).toEqual([
      'TNSI Membership Cancelling',
    ]);
    expect(membershipPayload('Payment Issue', paymentIssue).tags).toEqual(['TNSI Payment Issue']);
    expect(membershipPayload('Free (trial ended)', trialEnded).tags).toEqual(['TNSI Trial Ended']);
    expect(membershipPayload('Free (ended)', ended).tags).toEqual(['TNSI Membership Ended']);
  });

  it('shows no plan once a membership has ended', () => {
    expect(value(membershipPayload('Free (ended)', ended), FLOWI_FIELD.plan.id)).toBe('None');
  });

  it('never sends tags that remove anything, answers, or health data', () => {
    const payload = membershipPayload('Member', member, { fullName: 'Ada Lovelace' });
    expect(Object.keys(payload).sort()).toEqual(
      ['customFields', 'firstName', 'lastName', 'source', 'tags'].sort(),
    );
    expect(payload.firstName).toBe('Ada');
    expect(payload.lastName).toBe('Lovelace');
  });

  it('leaves the name out when there is none', () => {
    const payload = membershipPayload('Member', member, { fullName: null });
    expect(payload).not.toHaveProperty('firstName');
  });
});

describe('appSignupPayload', () => {
  it('tags the new account and marks it Free with no plan', () => {
    const payload = appSignupPayload({ fullName: 'Ada' });
    expect(payload.tags).toEqual(['TNSI App Signup']);
    expect(value(payload, FLOWI_FIELD.membershipState.id)).toBe('Free');
    expect(value(payload, FLOWI_FIELD.plan.id)).toBe('None');
    expect(payload.firstName).toBe('Ada');
    expect(payload).not.toHaveProperty('lastName');
  });
});

describe('membershipChange', () => {
  it('sends nothing when the state has not changed (a duplicate or replayed event)', () => {
    expect(membershipChange(member, { ...member, currentPeriodEnd: inDays(50) }, NOW)).toBeNull();
  });

  it('sends the member update when a free account starts paying', () => {
    const change = membershipChange(freeAccount, member, NOW);
    expect(change?.tags).toEqual(['TNSI Member']);
  });

  it('sends the cancelling update when a member cancels', () => {
    expect(membershipChange(member, cancelling, NOW)?.tags).toEqual(['TNSI Membership Cancelling']);
  });

  it('sends the payment issue update when a payment fails', () => {
    expect(membershipChange(member, paymentIssue, NOW)?.tags).toEqual(['TNSI Payment Issue']);
  });

  it('moves the state back to Member when the payment recovers', () => {
    const change = membershipChange(paymentIssue, member, NOW);
    expect(value(change!, FLOWI_FIELD.membershipState.id)).toBe('Member');
  });

  it('moves the state back to Member when a cancellation is undone', () => {
    const change = membershipChange(cancelling, member, NOW);
    expect(value(change!, FLOWI_FIELD.membershipState.id)).toBe('Member');
  });

  it('sends the ended update when a membership ends', () => {
    expect(membershipChange(cancelling, ended, NOW)?.tags).toEqual(['TNSI Membership Ended']);
  });

  it('never touches a legacy lifetime membership', () => {
    expect(membershipChange(null, record({ tier: 'lifetime' }), NOW)).toBeNull();
  });

  it('sends nothing when the new state cannot be trusted yet', () => {
    const unconfirmed = record({
      tier: 'monthly',
      stripeSubscriptionId: 'sub_1',
      currentPeriodEnd: inDays(-30),
    });
    expect(membershipChange(member, unconfirmed, NOW)).toBeNull();
  });
});
