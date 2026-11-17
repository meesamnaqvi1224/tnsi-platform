import { describe, expect, it } from 'vitest';
import {
  authorizeEntitlement,
  assertEntitlement,
  canAccessContent,
  graceEndsAt,
  hasMemberAccess,
  hasPaidAccess,
  assertMemberAccess,
  resolveMembership,
  PAYMENT_GRACE_PERIOD_DAYS,
  type EntitlementRecord,
  type MembershipRecord,
} from './entitlements';
import { EntitlementRequiredError } from '../errors/auth';

function entitlement(overrides: Partial<EntitlementRecord> = {}): EntitlementRecord {
  return {
    status: 'active',
    programs: [],
    certifications: [],
    features: [],
    ...overrides,
  };
}

describe('authorizeEntitlement', () => {
  it('allows a free user when no protected requirement is given', () => {
    const result = authorizeEntitlement(entitlement({ status: 'active' }), { type: 'free' });
    expect(result).toEqual({ allowed: true, reason: null });
  });

  it('allows a free requirement even with no entitlement row at all', () => {
    const result = authorizeEntitlement(null, { type: 'free' });
    expect(result).toEqual({ allowed: true, reason: null });
  });

  it('denies a free user (empty programs array) a required programme', () => {
    const result = authorizeEntitlement(entitlement({ programs: [] }), {
      type: 'programme',
      programId: 'practitioner-certification',
    });
    expect(result.allowed).toBe(false);
    expect(result.reason).toBe('PROGRAMME_NOT_ENTITLED');
  });

  it('allows a user with the matching programme and active status', () => {
    const result = authorizeEntitlement(
      entitlement({ status: 'active', programs: ['practitioner-certification'] }),
      { type: 'programme', programId: 'practitioner-certification' },
    );
    expect(result).toEqual({ allowed: true, reason: null });
  });

  it('denies a user without the matching programme', () => {
    const result = authorizeEntitlement(
      entitlement({ status: 'active', programs: ['executive-advisory'] }),
      { type: 'programme', programId: 'practitioner-certification' },
    );
    expect(result.allowed).toBe(false);
    expect(result.reason).toBe('PROGRAMME_NOT_ENTITLED');
  });

  it('allows a user with the matching certification and active status', () => {
    const result = authorizeEntitlement(
      entitlement({ status: 'active', certifications: ['practitioner-certified'] }),
      { type: 'certification', certificationId: 'practitioner-certified' },
    );
    expect(result).toEqual({ allowed: true, reason: null });
  });

  it('denies a user without the matching certification', () => {
    const result = authorizeEntitlement(entitlement({ status: 'active', certifications: [] }), {
      type: 'certification',
      certificationId: 'practitioner-certified',
    });
    expect(result.allowed).toBe(false);
    expect(result.reason).toBe('CERTIFICATION_NOT_ENTITLED');
  });

  it('denies a matching programme when the entitlement has expired', () => {
    const result = authorizeEntitlement(
      entitlement({ status: 'expired', programs: ['practitioner-certification'] }),
      { type: 'programme', programId: 'practitioner-certification' },
    );
    expect(result.allowed).toBe(false);
    expect(result.reason).toBe('STATUS_NOT_ELIGIBLE');
  });

  it('allows a matching programme while the entitlement is trialing', () => {
    const result = authorizeEntitlement(
      entitlement({ status: 'trialing', programs: ['practitioner-certification'] }),
      { type: 'programme', programId: 'practitioner-certification' },
    );
    expect(result).toEqual({ allowed: true, reason: null });
  });

  it('does not grant access via an unrelated programme or certification', () => {
    const record = entitlement({
      status: 'active',
      programs: ['executive-advisory'],
      certifications: ['some-other-cert'],
    });

    expect(
      authorizeEntitlement(record, {
        type: 'programme',
        programId: 'practitioner-certification',
      }).allowed,
    ).toBe(false);

    expect(
      authorizeEntitlement(record, {
        type: 'certification',
        certificationId: 'practitioner-certified',
      }).allowed,
    ).toBe(false);
  });

  it('denies protected access when there is no entitlement row', () => {
    const result = authorizeEntitlement(null, {
      type: 'programme',
      programId: 'practitioner-certification',
    });
    expect(result.allowed).toBe(false);
    expect(result.reason).toBe('NO_ENTITLEMENT');
  });

  it('denies past_due status without assuming a grace period', () => {
    const result = authorizeEntitlement(
      entitlement({ status: 'past_due', programs: ['practitioner-certification'] }),
      { type: 'programme', programId: 'practitioner-certification' },
    );
    expect(result.allowed).toBe(false);
    expect(result.reason).toBe('STATUS_NOT_ELIGIBLE');
  });

  it('denies canceled status without assuming current-period access continues', () => {
    const result = authorizeEntitlement(
      entitlement({ status: 'canceled', programs: ['practitioner-certification'] }),
      { type: 'programme', programId: 'practitioner-certification' },
    );
    expect(result.allowed).toBe(false);
    expect(result.reason).toBe('STATUS_NOT_ELIGIBLE');
  });

  it('allows a feature when present and status-eligible, denies otherwise', () => {
    const withFeature = entitlement({ status: 'active', features: ['ai-guidance'] });
    expect(
      authorizeEntitlement(withFeature, { type: 'feature', featureId: 'ai-guidance' }).allowed,
    ).toBe(true);

    const withoutFeature = entitlement({ status: 'active', features: [] });
    expect(
      authorizeEntitlement(withoutFeature, { type: 'feature', featureId: 'ai-guidance' }).allowed,
    ).toBe(false);
  });

  it('is deterministic across repeated calls with the same input', () => {
    const record = entitlement({ status: 'active', programs: ['practitioner-certification'] });
    const requirement = { type: 'programme', programId: 'practitioner-certification' } as const;

    const results = Array.from({ length: 5 }, () => authorizeEntitlement(record, requirement));
    expect(new Set(results.map((r) => JSON.stringify(r))).size).toBe(1);
  });
});

describe('assertEntitlement', () => {
  it('returns normally (does not throw) when the requirement is satisfied', () => {
    expect(() =>
      assertEntitlement(entitlement({ status: 'active' }), { type: 'free' }),
    ).not.toThrow();
  });

  it('throws EntitlementRequiredError (403) when the requirement is not satisfied', () => {
    expect(() =>
      assertEntitlement(null, { type: 'programme', programId: 'practitioner-certification' }),
    ).toThrow(EntitlementRequiredError);
  });

  it('the thrown error carries the denial reason but never the raw entitlement contents', () => {
    try {
      assertEntitlement(entitlement({ status: 'expired', programs: ['x'] }), {
        type: 'programme',
        programId: 'x',
      });
      throw new Error('expected assertEntitlement to throw');
    } catch (err) {
      expect(err).toBeInstanceOf(EntitlementRequiredError);
      const authErr = err as EntitlementRequiredError;
      expect(authErr.statusCode).toBe(403);
      expect(authErr.details?.reason).toBe('STATUS_NOT_ELIGIBLE');
      // Only the requirement type and denial reason are carried - never the
      // full entitlement record (programs/certifications/features/status).
      expect(JSON.stringify(authErr.details)).not.toContain('expired');
    }
  });
});

describe('hasMemberAccess', () => {
  it('allows an active entitlement (Active user)', () => {
    expect(hasMemberAccess(entitlement({ status: 'active' }))).toBe(true);
  });

  it('allows a trialing entitlement', () => {
    expect(hasMemberAccess(entitlement({ status: 'trialing' }))).toBe(true);
  });

  it('still allows a canceled/expired/past_due entitlement — the free account remains when paid access ends', () => {
    // Approved model: Free account → Paid membership → Membership ends → Free account.
    // Losing paid access never costs the user their account; paid access itself is
    // `hasPaidAccess`' question (see the membership tests below).
    expect(hasMemberAccess(entitlement({ status: 'canceled' }))).toBe(true);
    expect(hasMemberAccess(entitlement({ status: 'expired' }))).toBe(true);
    expect(hasMemberAccess(entitlement({ status: 'past_due' }))).toBe(true);
  });

  it('denies when there is no entitlement row at all (fails closed)', () => {
    expect(hasMemberAccess(null)).toBe(false);
  });
});

describe('assertMemberAccess', () => {
  it('returns normally for an active entitlement', () => {
    expect(() => assertMemberAccess(entitlement({ status: 'active' }))).not.toThrow();
  });

  it('does not throw for an ended membership — the user is not locked out of their free account', () => {
    for (const status of ['canceled', 'expired', 'past_due'] as const) {
      expect(() => assertMemberAccess(entitlement({ status }))).not.toThrow();
    }
  });

  it('throws EntitlementRequiredError for a missing entitlement row', () => {
    expect(() => assertMemberAccess(null)).toThrow(EntitlementRequiredError);
  });

  it('thrown error is a 403 with a NO_ENTITLEMENT reason, distinct from an authentication (401) failure', () => {
    try {
      assertMemberAccess(null);
      throw new Error('expected assertMemberAccess to throw');
    } catch (err) {
      expect(err).toBeInstanceOf(EntitlementRequiredError);
      expect((err as EntitlementRequiredError).statusCode).toBe(403);
    }
  });
});

// ---------------------------------------------------------------------------
// Regulation Suite™ membership: grace period, membership state, content access
// ---------------------------------------------------------------------------

const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;
const FAILED_AT = new Date('2026-10-01T09:00:00.000Z');
const at = (msAfterFailure: number) => new Date(FAILED_AT.getTime() + msAfterFailure);

function membership(
  overrides: Partial<MembershipRecord & { cancelAtPeriodEnd: boolean }> = {},
): MembershipRecord & { cancelAtPeriodEnd?: boolean } {
  return {
    tier: 'monthly',
    status: 'active',
    programs: [],
    certifications: [],
    features: [],
    ...overrides,
  };
}

describe('payment-failure grace period (7 days, approved rule)', () => {
  it('is 7 days', () => {
    expect(PAYMENT_GRACE_PERIOD_DAYS).toBe(7);
    expect(graceEndsAt(FAILED_AT).getTime() - FAILED_AT.getTime()).toBe(7 * DAY);
  });

  const pastDue = membership({ status: 'past_due', paymentFailedAt: FAILED_AT });

  it('keeps paid access on day 1 (the failure moment itself and the first day after)', () => {
    expect(hasPaidAccess(pastDue, at(0))).toBe(true);
    expect(hasPaidAccess(pastDue, at(1 * DAY))).toBe(true);
  });

  it('keeps paid access throughout day 7 — until the 7 full days have elapsed', () => {
    expect(hasPaidAccess(pastDue, at(6 * DAY))).toBe(true);
    expect(hasPaidAccess(pastDue, at(7 * DAY - 1))).toBe(true);
  });

  it('removes paid access exactly when the 7 days elapse, and after — the account itself remains', () => {
    expect(hasPaidAccess(pastDue, at(7 * DAY))).toBe(false);
    expect(hasPaidAccess(pastDue, at(7 * DAY + 1))).toBe(false);
    expect(hasPaidAccess(pastDue, at(30 * DAY))).toBe(false);
    expect(hasMemberAccess(pastDue)).toBe(true);
  });

  it('fails closed for paid access when past_due has no recorded failure time (never assumes a grace period)', () => {
    expect(hasPaidAccess(membership({ status: 'past_due', paymentFailedAt: null }), at(0))).toBe(
      false,
    );
    expect(hasPaidAccess(membership({ status: 'past_due' }), at(0))).toBe(false);
  });

  it('grace applies to protected programme access the same way, and ends the same way', () => {
    const record = membership({
      status: 'past_due',
      paymentFailedAt: FAILED_AT,
      programs: ['some-programme'],
    });
    const requirement = { type: 'programme', programId: 'some-programme' } as const;
    expect(authorizeEntitlement(record, requirement, at(3 * DAY)).allowed).toBe(true);
    expect(authorizeEntitlement(record, requirement, at(8 * DAY)).allowed).toBe(false);
  });

  it('once grace is over the user is still admitted to the member area, as a free member', () => {
    const record = membership({ status: 'past_due', paymentFailedAt: FAILED_AT });
    expect(() => assertMemberAccess(record)).not.toThrow();
    expect(resolveMembership(record, at(2 * DAY)).hasPaidAccess).toBe(true);
    expect(resolveMembership(record, at(9 * DAY)).hasPaidAccess).toBe(false);
  });

  it('is deterministic for a fixed clock', () => {
    const record = membership({ status: 'past_due', paymentFailedAt: FAILED_AT });
    const results = Array.from({ length: 5 }, () => resolveMembership(record, at(2 * DAY)));
    expect(new Set(results.map((r) => JSON.stringify(r))).size).toBe(1);
  });
});

describe('resolveMembership — every approved membership state', () => {
  const now = at(2 * DAY);

  it('free user: member access, no paid access', () => {
    const result = resolveMembership(membership({ tier: 'free', status: 'active' }), now);
    // `toMatchObject`: the resolved membership has since gained further
    // fields (trial, paid-through, reconciliation); these four are unchanged.
    expect(result).toMatchObject({
      state: 'free',
      hasPaidAccess: false,
      graceEndsAt: null,
      cancelsAtPeriodEnd: false,
    });
    expect(hasMemberAccess(membership({ tier: 'free' }))).toBe(true);
  });

  it('trialing user: paid access', () => {
    const result = resolveMembership(membership({ status: 'trialing' }), now);
    expect(result.state).toBe('trialing');
    expect(result.hasPaidAccess).toBe(true);
  });

  it('active monthly user: paid access', () => {
    const result = resolveMembership(membership({ tier: 'monthly', status: 'active' }), now);
    expect(result.state).toBe('active');
    expect(result.hasPaidAccess).toBe(true);
    expect(result.cancelsAtPeriodEnd).toBe(false);
  });

  it('active annual user: paid access', () => {
    const result = resolveMembership(membership({ tier: 'annual', status: 'active' }), now);
    expect(result.state).toBe('active');
    expect(result.hasPaidAccess).toBe(true);
  });

  it('payment failed, inside grace: paid access continues, with the grace end exposed', () => {
    const result = resolveMembership(
      membership({ status: 'past_due', paymentFailedAt: FAILED_AT }),
      now,
    );
    expect(result.state).toBe('grace');
    expect(result.hasPaidAccess).toBe(true);
    expect(result.graceEndsAt).toEqual(graceEndsAt(FAILED_AT));
  });

  it('payment failed, past grace: inactive, no paid access', () => {
    const result = resolveMembership(
      membership({ status: 'past_due', paymentFailedAt: FAILED_AT }),
      at(8 * DAY),
    );
    expect(result.state).toBe('inactive');
    expect(result.hasPaidAccess).toBe(false);
    expect(result.graceEndsAt).toBeNull();
  });

  it('cancelled-at-period-end: still active with paid access, flagged as not renewing', () => {
    const result = resolveMembership(
      membership({ status: 'active', cancelAtPeriodEnd: true }),
      now,
    );
    expect(result.state).toBe('active');
    expect(result.hasPaidAccess).toBe(true);
    expect(result.cancelsAtPeriodEnd).toBe(true);
  });

  it('cancelled after the period ended (Stripe reports canceled): inactive', () => {
    const result = resolveMembership(membership({ status: 'canceled' }), now);
    expect(result.state).toBe('inactive');
    expect(result.hasPaidAccess).toBe(false);
  });

  it('expired subscription: inactive', () => {
    const result = resolveMembership(membership({ status: 'expired' }), now);
    expect(result.state).toBe('inactive');
    expect(result.hasPaidAccess).toBe(false);
  });

  it('no entitlement row at all: inactive (fails closed)', () => {
    expect(resolveMembership(null, now).state).toBe('inactive');
    expect(hasPaidAccess(null, now)).toBe(false);
    expect(hasMemberAccess(null)).toBe(false);
  });

  it('a free-tier row with a leftover non-active status is simply a free account, not an ended membership', () => {
    for (const status of ['canceled', 'expired', 'past_due'] as const) {
      expect(resolveMembership(membership({ tier: 'free', status }), now).state).toBe('free');
    }
  });

  it('an ended paid membership keeps the member area (as a free member) but not paid access', () => {
    for (const record of [
      membership({ tier: 'monthly', status: 'canceled' }),
      membership({ tier: 'annual', status: 'expired' }),
      membership({ status: 'past_due', paymentFailedAt: FAILED_AT }),
    ]) {
      const when = at(8 * DAY);
      expect(hasMemberAccess(record)).toBe(true);
      expect(resolveMembership(record, when).hasPaidAccess).toBe(false);
      expect(resolveMembership(record, when).state).toBe('inactive');
    }
  });
});

describe('canAccessContent — free vs paid Regulation Suite™ content', () => {
  const now = at(2 * DAY);
  const freeContent = { isFree: true };
  const paidContent = { isFree: false };

  it('before membership is open (gating off), every member sees everything — nothing is locked early', () => {
    expect(canAccessContent(membership({ tier: 'free' }), paidContent, false, now)).toBe(true);
    expect(canAccessContent(membership({ tier: 'free' }), freeContent, false, now)).toBe(true);
  });

  it('gating off still never lets through someone with no account at all', () => {
    expect(canAccessContent(null, freeContent, false, now)).toBe(false);
  });

  it('gating on: a free user gets free-designated content only', () => {
    const free = membership({ tier: 'free' });
    expect(canAccessContent(free, freeContent, true, now)).toBe(true);
    expect(canAccessContent(free, paidContent, true, now)).toBe(false);
  });

  it.each([
    ['trialing', membership({ status: 'trialing' })],
    ['active monthly', membership({ tier: 'monthly', status: 'active' })],
    ['active annual', membership({ tier: 'annual', status: 'active' })],
    ['in payment grace', membership({ status: 'past_due', paymentFailedAt: FAILED_AT })],
    ['cancelled at period end', membership({ status: 'active', cancelAtPeriodEnd: true })],
  ])('gating on: %s member opens paid and free content', (_label, record) => {
    expect(canAccessContent(record, paidContent, true, now)).toBe(true);
    expect(canAccessContent(record, freeContent, true, now)).toBe(true);
  });

  it.each([
    ['past grace', membership({ status: 'past_due', paymentFailedAt: FAILED_AT }), at(8 * DAY)],
    ['canceled', membership({ status: 'canceled' }), now],
    ['expired', membership({ status: 'expired' }), now],
  ])('gating on: %s member falls back to the free account', (_label, record, when) => {
    // Free-designated content stays open; paid-only content does not.
    expect(canAccessContent(record, freeContent, true, when)).toBe(true);
    expect(canAccessContent(record, paidContent, true, when)).toBe(false);
  });
});

describe('approved access matrix (membership open)', () => {
  const now = at(2 * DAY);
  const rows: [string, MembershipRecord & { cancelAtPeriodEnd?: boolean }, Date, boolean][] = [
    // label, record, clock, paid access expected
    ['free', membership({ tier: 'free', status: 'active' }), now, false],
    ['trialing', membership({ status: 'trialing' }), now, true],
    ['active', membership({ status: 'active' }), now, true],
    [
      'cancelled but still within the paid period',
      membership({ cancelAtPeriodEnd: true }),
      now,
      true,
    ],
    [
      'past_due within the 7-day grace',
      membership({ status: 'past_due', paymentFailedAt: FAILED_AT }),
      at(6 * DAY),
      true,
    ],
    ['cancelled and ended', membership({ status: 'canceled' }), now, false],
    ['expired', membership({ status: 'expired' }), now, false],
    [
      'past_due beyond the grace period',
      membership({ status: 'past_due', paymentFailedAt: FAILED_AT }),
      at(8 * DAY),
      false,
    ],
  ];

  it.each(rows)('%s', (_label, record, when, paid) => {
    // Everyone with an account keeps the member area and the free content…
    expect(hasMemberAccess(record)).toBe(true);
    expect(canAccessContent(record, { isFree: true }, true, when)).toBe(true);
    // …and only paid access opens paid-only content.
    expect(hasPaidAccess(record, when)).toBe(paid);
    expect(canAccessContent(record, { isFree: false }, true, when)).toBe(paid);
  });
});
