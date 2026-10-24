/**
 * Server-side membership resolution after the trial policy: the app-managed
 * free trial, paid-through dates, cancellation, the 7-day payment grace, the
 * bounded outage policy for an unconfirmed renewal, and legacy Lifetime.
 * Existing behaviour is covered in entitlements.test.ts; this file adds the
 * date-driven rules.
 */
import { describe, expect, it } from 'vitest';
import {
  authorizeEntitlement,
  canAccessContent,
  graceEndsAt,
  needsStripeReconciliation,
  PAYMENT_GRACE_PERIOD_DAYS,
  renewalUnconfirmedUntil,
  resolveMembership,
  type EntitlementRecord,
  type MembershipRecord,
} from './entitlements';

const DAY = 24 * 60 * 60 * 1000;
const HOUR = 60 * 60 * 1000;
const NOW = new Date('2026-10-14T09:00:00.000Z');
const at = (offsetMs: number) => new Date(NOW.getTime() + offsetMs);

type Row = MembershipRecord & { cancelAtPeriodEnd?: boolean };

function row(overrides: Partial<Row> = {}): Row {
  return {
    tier: 'free',
    status: 'active',
    programs: [],
    certifications: [],
    features: [],
    ...overrides,
  };
}

/** A Stripe-backed monthly membership with `daysLeft` days of paid period remaining. */
function paid(daysLeft: number, overrides: Partial<Row> = {}): Row {
  return row({
    tier: 'monthly',
    status: 'active',
    stripeSubscriptionId: 'sub_123',
    currentPeriodEnd: at(daysLeft * DAY),
    ...overrides,
  });
}

describe('Free account', () => {
  it('is Free with no paid access and no trial', () => {
    expect(resolveMembership(row(), NOW)).toMatchObject({
      state: 'free',
      hasPaidAccess: false,
      trialEndsAt: null,
      trialExpired: false,
      reconciliation: 'none',
    });
  });
});

describe('unexpired free trial', () => {
  const trial = (started: Date, ends: Date) => row({ trialStartedAt: started, trialEndsAt: ends });

  it('has full paid access and reports its end', () => {
    const r = resolveMembership(trial(at(-5 * DAY), at(25 * DAY)), NOW);
    expect(r).toMatchObject({ state: 'trialing', hasPaidAccess: true, trialExpired: false });
    expect(r.trialEndsAt).toEqual(at(25 * DAY));
  });

  it('starts at the start instant (inclusive)', () => {
    expect(resolveMembership(trial(NOW, at(30 * DAY)), NOW).state).toBe('trialing');
  });

  it('opens paid content when locking is on, and free content always', () => {
    const r = trial(at(-1 * DAY), at(29 * DAY));
    expect(canAccessContent(r, { isFree: false }, true, NOW)).toBe(true);
    expect(canAccessContent(r, { isFree: true }, true, NOW)).toBe(true);
  });

  it('keeps full access on the last millisecond before the end', () => {
    const r = trial(at(-30 * DAY), at(1));
    expect(resolveMembership(r, NOW).hasPaidAccess).toBe(true);
  });
});

describe('expired free trial returns to Free - no charge, no conversion', () => {
  const expired = row({ trialStartedAt: at(-40 * DAY), trialEndsAt: at(-10 * DAY) });

  it('is Free with no paid access, flagged as expired', () => {
    expect(resolveMembership(expired, NOW)).toMatchObject({
      state: 'free',
      hasPaidAccess: false,
      trialEndsAt: null,
      trialExpired: true,
    });
  });

  it('ends exactly at the end instant (access is not granted at it)', () => {
    const r = row({ trialStartedAt: at(-30 * DAY), trialEndsAt: NOW });
    expect(resolveMembership(r, NOW)).toMatchObject({ state: 'free', trialExpired: true });
  });

  it('closes paid content and keeps free content (member area intact)', () => {
    expect(canAccessContent(expired, { isFree: false }, true, NOW)).toBe(false);
    expect(canAccessContent(expired, { isFree: true }, true, NOW)).toBe(true);
  });

  it('never asks for Stripe: nothing to reconcile', () => {
    expect(resolveMembership(expired, NOW).reconciliation).toBe('none');
    expect(needsStripeReconciliation(expired, NOW)).toBe(false);
  });

  it('is a pure read: resolving never changes the record (no tier change, no subscription)', () => {
    const frozen = Object.freeze({ ...expired });
    resolveMembership(frozen, NOW);
    expect(frozen.tier).toBe('free');
    expect(frozen.stripeSubscriptionId).toBeUndefined();
  });
});

describe('inconsistent trial dates fail closed', () => {
  it.each([
    ['only a start date', { trialStartedAt: at(-1 * DAY), trialEndsAt: null }],
    ['only an end date', { trialStartedAt: null, trialEndsAt: at(5 * DAY) }],
    ['end equal to start', { trialStartedAt: at(-1 * DAY), trialEndsAt: at(-1 * DAY) }],
    ['end before start', { trialStartedAt: at(5 * DAY), trialEndsAt: at(-5 * DAY) }],
    ['start in the future', { trialStartedAt: at(1 * DAY), trialEndsAt: at(31 * DAY) }],
    ['an invalid start Date', { trialStartedAt: new Date('nope'), trialEndsAt: at(5 * DAY) }],
    ['an invalid end Date', { trialStartedAt: at(-1 * DAY), trialEndsAt: new Date(NaN) }],
  ])('grants no access with %s', (_label, dates) => {
    const r = resolveMembership(row(dates), NOW);
    expect(r).toMatchObject({ state: 'free', hasPaidAccess: false, trialEndsAt: null });
  });

  it('never lets a trial window rescue a lapsed paid membership', () => {
    const lapsed = row({
      tier: 'monthly',
      status: 'canceled',
      stripeSubscriptionId: 'sub_1',
      currentPeriodEnd: at(-5 * DAY),
      trialStartedAt: at(-1 * DAY),
      trialEndsAt: at(29 * DAY),
    });
    expect(resolveMembership(lapsed, NOW)).toMatchObject({
      state: 'inactive',
      hasPaidAccess: false,
    });
  });
});

describe('paid membership and the paid-through date', () => {
  it('is active with paid access until the paid period ends', () => {
    const r = resolveMembership(paid(10), NOW);
    expect(r).toMatchObject({ state: 'active', hasPaidAccess: true, reconciliation: 'none' });
    expect(r.paidThrough).toEqual(at(10 * DAY));
  });

  it('is not granted at the paid-through instant itself', () => {
    const r = resolveMembership(paid(0), NOW);
    expect(r.hasPaidAccess).toBe(false);
    expect(r.reconciliation).toBe('required');
  });

  it('a renewal that moves the paid-through date forward restores a normal active state', () => {
    const stale = paid(-1);
    expect(resolveMembership(stale, NOW).hasPaidAccess).toBe(false);
    const renewed = paid(30);
    expect(resolveMembership(renewed, NOW)).toMatchObject({
      state: 'active',
      hasPaidAccess: true,
      reconciliation: 'none',
    });
  });

  it('paid state outranks any trial dates on the row', () => {
    const r = resolveMembership(
      paid(10, { trialStartedAt: at(-40 * DAY), trialEndsAt: at(-10 * DAY) }),
      NOW,
    );
    expect(r).toMatchObject({ state: 'active', hasPaidAccess: true, trialExpired: false });
  });
});

describe('cancellation retains access through the paid-through date', () => {
  it('stays active with paid access, flagged as not renewing, until the end', () => {
    const r = resolveMembership(paid(12, { cancelAtPeriodEnd: true }), NOW);
    expect(r).toMatchObject({ state: 'active', hasPaidAccess: true, cancelsAtPeriodEnd: true });
    expect(r.paidThrough).toEqual(at(12 * DAY));
  });

  it('keeps access to the very last millisecond, with no webhook needed', () => {
    const row1 = paid(0, { cancelAtPeriodEnd: true, currentPeriodEnd: at(1) });
    expect(resolveMembership(row1, NOW).hasPaidAccess).toBe(true);
  });

  it('ends at the paid-through date', () => {
    const r = resolveMembership(paid(0, { cancelAtPeriodEnd: true }), NOW);
    expect(r.hasPaidAccess).toBe(false);
  });

  it('after Stripe records the cancellation (status canceled) the account is ended, not paid', () => {
    const r = resolveMembership(paid(-2, { status: 'canceled', cancelAtPeriodEnd: true }), NOW);
    expect(r).toMatchObject({ state: 'inactive', hasPaidAccess: false });
  });
});

describe('seven-day payment-failure grace', () => {
  const failed = (daysAgo: number, overrides: Partial<Row> = {}) =>
    paid(-1, {
      status: 'past_due',
      paymentFailedAt: at(-daysAgo * DAY),
      ...overrides,
    });

  it('keeps full access, flagged as a payment grace, with the end date', () => {
    const r = resolveMembership(failed(2), NOW);
    expect(r).toMatchObject({
      state: 'grace',
      hasPaidAccess: true,
      graceReason: 'payment_failed',
    });
    expect(r.graceEndsAt).toEqual(graceEndsAt(at(-2 * DAY)));
  });

  it('is 7 days from the first failure', () => {
    expect(PAYMENT_GRACE_PERIOD_DAYS).toBe(7);
    expect(resolveMembership(failed(6.99), NOW).hasPaidAccess).toBe(true);
    expect(resolveMembership(failed(7), NOW).hasPaidAccess).toBe(false);
    expect(resolveMembership(failed(30), NOW).hasPaidAccess).toBe(false);
  });

  it('fails closed with no recorded failure time', () => {
    expect(resolveMembership(failed(1, { paymentFailedAt: null }), NOW).hasPaidAccess).toBe(false);
  });

  it('is not an unconfirmed renewal: nothing to reconcile', () => {
    expect(resolveMembership(failed(2), NOW).reconciliation).toBe('none');
  });
});

describe('unconfirmed renewal - bounded outage policy', () => {
  // The row says active, but its paid period ended 6 hours ago.
  const stale = paid(0, { currentPeriodEnd: at(-6 * HOUR) });

  it('is flagged for reconciliation', () => {
    expect(needsStripeReconciliation(stale, NOW)).toBe(true);
  });

  it('without a Stripe answer or an outage report, access is NOT granted', () => {
    const r = resolveMembership(stale, NOW);
    expect(r).toMatchObject({
      state: 'inactive',
      hasPaidAccess: false,
      reconciliation: 'required',
    });
  });

  it('adds no arbitrary extension when Stripe is reachable: the row simply decides', () => {
    // 1 hour, 24 hours and 48 hours past the end: all denied unless Stripe is unreachable.
    for (const hours of [1, 24, 48, 72]) {
      const r = resolveMembership(paid(0, { currentPeriodEnd: at(-hours * HOUR) }), NOW);
      expect(r.hasPaidAccess).toBe(false);
    }
  });

  it('holds access while Stripe cannot be reached, as a grace ending 7 days after the period end', () => {
    const r = resolveMembership(stale, NOW, { stripeUnreachable: true });
    expect(r).toMatchObject({
      state: 'grace',
      hasPaidAccess: true,
      graceReason: 'renewal_unconfirmed',
      reconciliation: 'required',
    });
    expect(r.graceEndsAt).toEqual(renewalUnconfirmedUntil(at(-6 * HOUR)));
    expect(r.graceEndsAt!.getTime() - at(-6 * HOUR).getTime()).toBe(7 * DAY);
  });

  it('never leaves access open-ended: it stops 7 days after the period end even with Stripe down', () => {
    const justInside = paid(0, { currentPeriodEnd: new Date(NOW.getTime() - 7 * DAY + 1) });
    const exactly = paid(0, { currentPeriodEnd: new Date(NOW.getTime() - 7 * DAY) });
    expect(resolveMembership(justInside, NOW, { stripeUnreachable: true }).hasPaidAccess).toBe(
      true,
    );
    expect(resolveMembership(exactly, NOW, { stripeUnreachable: true }).hasPaidAccess).toBe(false);
    expect(resolveMembership(paid(-30), NOW, { stripeUnreachable: true }).hasPaidAccess).toBe(
      false,
    );
  });

  it('does not touch a membership whose period has not ended, whatever the outage flag says', () => {
    const r = resolveMembership(paid(5), NOW, { stripeUnreachable: true });
    expect(r).toMatchObject({ state: 'active', reconciliation: 'none' });
  });

  it('is never granted to a lapsed or cancelled membership just because Stripe is down', () => {
    const cancelled = paid(-1, { status: 'canceled' });
    expect(resolveMembership(cancelled, NOW, { stripeUnreachable: true }).hasPaidAccess).toBe(
      false,
    );
  });
});

describe('missing or inconsistent subscription dates', () => {
  it.each([
    ['no period end', { currentPeriodEnd: null }],
    ['undefined period end', { currentPeriodEnd: undefined }],
    ['an invalid period end', { currentPeriodEnd: new Date('garbage') }],
  ])('a Stripe-backed active row with %s fails closed and asks for a refresh', (_label, patch) => {
    const r = resolveMembership(paid(5, patch), NOW);
    expect(r).toMatchObject({ hasPaidAccess: false, reconciliation: 'required' });
    // With no anchor date there is nothing to bound an outage hold with: still closed.
    expect(resolveMembership(paid(5, patch), NOW, { stripeUnreachable: true }).hasPaidAccess).toBe(
      false,
    );
  });

  it('a membership granted by hand (no Stripe subscription) stays paid on status alone', () => {
    const manual = row({ tier: 'annual', status: 'active' });
    expect(resolveMembership(manual, NOW)).toMatchObject({ state: 'active', hasPaidAccess: true });
    expect(needsStripeReconciliation(manual, NOW)).toBe(false);
  });

  it('a manual grant with a recorded end date ends at it, and Stripe is never consulted', () => {
    const expired = row({ tier: 'annual', status: 'active', currentPeriodEnd: at(-1 * DAY) });
    const r = resolveMembership(expired, NOW, { stripeUnreachable: true });
    expect(r).toMatchObject({ hasPaidAccess: false, reconciliation: 'none' });
  });
});

describe('legacy Lifetime membership is preserved', () => {
  const lifetime = (overrides: Partial<Row> = {}) =>
    row({ tier: 'lifetime', status: 'active', ...overrides });

  it('is active with paid access and no dates', () => {
    expect(resolveMembership(lifetime(), NOW)).toMatchObject({
      state: 'active',
      hasPaidAccess: true,
    });
  });

  it('is never cut off by a past period end, a cancel flag, a subscription id or trial dates', () => {
    const odd = lifetime({
      currentPeriodEnd: at(-500 * DAY),
      cancelAtPeriodEnd: true,
      stripeSubscriptionId: 'sub_legacy',
      trialStartedAt: at(-40 * DAY),
      trialEndsAt: at(-10 * DAY),
    });
    const r = resolveMembership(odd, NOW);
    expect(r).toMatchObject({ state: 'active', hasPaidAccess: true, reconciliation: 'none' });
    expect(resolveMembership(odd, NOW, { stripeUnreachable: true }).hasPaidAccess).toBe(true);
    expect(needsStripeReconciliation(odd, NOW)).toBe(false);
  });

  it('keeps access far in the future', () => {
    expect(resolveMembership(lifetime(), at(3650 * DAY)).hasPaidAccess).toBe(true);
  });

  it('opens paid content and still satisfies programme requirements it holds', () => {
    const l = lifetime({ programs: ['p1'] });
    expect(canAccessContent(l, { isFree: false }, true, NOW)).toBe(true);
    expect(authorizeEntitlement(l, { type: 'programme', programId: 'p1' }, NOW).allowed).toBe(true);
  });

  it('is not given a trial and cannot be mistaken for a Free account', () => {
    const r = resolveMembership(lifetime(), NOW);
    expect(r.state).not.toBe('free');
    expect(r.trialEndsAt).toBeNull();
  });
});

describe('authorizeEntitlement uses the same paid-through rules', () => {
  const withProgramme = (r: Row): Row => ({ ...r, programs: ['p1'] });
  const requirement = { type: 'programme', programId: 'p1' } as const;

  it('allows a Stripe-backed member inside the paid period', () => {
    expect(authorizeEntitlement(withProgramme(paid(5)), requirement, NOW).allowed).toBe(true);
  });

  it('denies one whose paid period has ended', () => {
    expect(authorizeEntitlement(withProgramme(paid(-1)), requirement, NOW)).toEqual({
      allowed: false,
      reason: 'STATUS_NOT_ELIGIBLE',
    });
  });

  it('is unchanged for a status-only record with no tier', () => {
    const noTier: EntitlementRecord = {
      status: 'active',
      programs: ['p1'],
      certifications: [],
      features: [],
      currentPeriodEnd: at(-30 * DAY),
    };
    expect(authorizeEntitlement(noTier, requirement, NOW).allowed).toBe(true);
  });
});

describe('Stripe reconciliation flag', () => {
  it.each([
    ['active, inside the period', paid(5), false],
    ['active, period ended', paid(-1), true],
    ['active, no period end', paid(5, { currentPeriodEnd: null }), true],
    ['past_due', paid(-1, { status: 'past_due', paymentFailedAt: at(-1 * DAY) }), false],
    ['canceled', paid(-1, { status: 'canceled' }), false],
    ['free', row(), false],
    ['lifetime', row({ tier: 'lifetime' }), false],
  ])('%s -> %s', (_label, record, expected) => {
    expect(needsStripeReconciliation(record, NOW)).toBe(expected);
  });
});
