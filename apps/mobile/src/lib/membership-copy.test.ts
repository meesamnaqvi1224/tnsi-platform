import { describe, expect, it } from 'vitest';
import type { Entitlements, MembershipSummary } from '@/api/types';
import { formatDay, membershipDetailLines } from './membership-copy';

function entitlements(
  membership: Partial<MembershipSummary> & Pick<MembershipSummary, 'state'>,
  over: Partial<Entitlements> = {},
): Entitlements {
  return {
    tier: 'free',
    status: 'active',
    programs: [],
    certifications: [],
    features: [],
    currentPeriodEnd: null,
    cancelAtPeriodEnd: false,
    canceledAt: null,
    membership: {
      hasPaidAccess: false,
      graceEndsAt: null,
      cancelsAtPeriodEnd: false,
      contentLocking: true,
      ...membership,
    },
    ...over,
  } as Entitlements;
}

const text = (e: Entitlements) => membershipDetailLines(e).join(' ');

describe('formatDay', () => {
  it('formats a date with the day', () => {
    expect(formatDay('2026-10-14T09:00:00.000Z')).toBe('14 October 2026');
  });
  it('returns an empty string for anything that is not a date', () => {
    expect(formatDay('')).toBe('');
    expect(formatDay('not a date')).toBe('');
  });
});

describe('free account', () => {
  it('says what a free account includes while locking is on, and nothing about a trial by default', () => {
    const t = text(entitlements({ state: 'free' }));
    expect(t).toContain('free access to selected practices and PowerDrops™');
    expect(t).not.toMatch(/trial/i);
  });

  it('before membership opens, just says free access', () => {
    expect(text(entitlements({ state: 'free', contentLocking: false }))).toBe(
      'You currently have free access to TNSI.',
    );
  });

  it('mentions a trial ONLY when the server says one is available, with no card and no charge', () => {
    const t = text(entitlements({ state: 'free', trialAvailable: true }));
    expect(t).toContain('A 30-day free trial is available for your account');
    expect(t).toContain('start it on the TNSI website');
    expect(t).toContain('No payment card is required');
    expect(t).toContain('nothing is charged when it ends');
  });

  it.each([false, undefined])(
    'never claims a trial is available when the server says %s',
    (flag) => {
      const t = text(entitlements({ state: 'free', trialAvailable: flag as never }));
      expect(t).not.toContain('trial is available');
    },
  );

  it('says the trial has ended - Free again, nothing charged - and offers no second trial', () => {
    const t = text(entitlements({ state: 'free', trialExpired: true, trialAvailable: false }));
    expect(t).toContain('Your 30-day free trial has ended');
    expect(t).toContain('Free account again');
    expect(t).toContain('Nothing has been charged');
    expect(t).not.toContain('is available for your account');
  });
});

describe('free trial', () => {
  it('shows the server’s trial end, full access, no card, nothing charged, and a return to Free', () => {
    const t = text(
      entitlements({
        state: 'trialing',
        hasPaidAccess: true,
        trialEndsAt: '2026-11-13T09:00:00.000Z',
      }),
    );
    expect(t).toContain('Your free trial runs until 13 November 2026.');
    expect(t).toContain('full access');
    expect(t).toContain('No payment card is held');
    expect(t).toContain('nothing is charged when it ends');
    expect(t).toContain('returns to Free unless you choose a paid plan');
  });

  it('never says a plan begins or a payment is taken when the trial ends', () => {
    const t = text(
      entitlements({
        state: 'trialing',
        hasPaidAccess: true,
        trialEndsAt: '2026-11-13T00:00:00.000Z',
      }),
    ).toLowerCase();
    expect(t).not.toContain('after which your plan begins');
    expect(t).not.toContain('first payment');
    expect(t).not.toContain('will be charged');
  });

  it('falls back to the billing period end from an older server, and to a plain line with no date', () => {
    expect(
      text(
        entitlements(
          { state: 'trialing', hasPaidAccess: true },
          { currentPeriodEnd: '2026-11-01T00:00:00.000Z' },
        ),
      ),
    ).toContain('runs until 1 November 2026');
    expect(text(entitlements({ state: 'trialing', hasPaidAccess: true }))).toContain(
      'Your free trial is active.',
    );
  });
});

describe('payment grace and unconfirmed renewal', () => {
  it('a failed payment: access continues until the grace end, update on the website', () => {
    const t = text(
      entitlements({
        state: 'grace',
        hasPaidAccess: true,
        graceReason: 'payment_failed',
        graceEndsAt: '2026-10-20T00:00:00.000Z',
      }),
    );
    expect(t).toContain("We couldn't take your latest payment.");
    expect(t).toContain('until 20 October 2026');
    expect(t).toContain('Update your payment method on the website');
  });

  it('an older server that sends no reason is treated as a failed payment', () => {
    const t = text(entitlements({ state: 'grace', hasPaidAccess: true, graceEndsAt: null }));
    expect(t).toContain("We couldn't take your latest payment.");
  });

  it('a renewal the server could not confirm is described as temporary, with its bounded end', () => {
    const t = text(
      entitlements({
        state: 'grace',
        hasPaidAccess: true,
        graceReason: 'renewal_unconfirmed',
        graceEndsAt: '2026-10-21T00:00:00.000Z',
      }),
    );
    expect(t).toContain("couldn't confirm your latest renewal");
    expect(t).toContain('This is temporary.');
    expect(t).toContain('until 21 October 2026 at the latest');
    expect(t).not.toContain('update your payment method');
  });
});

describe('ended, paid and cancelling members', () => {
  it('ended: points to the website to restart', () => {
    expect(text(entitlements({ state: 'inactive' }))).toContain('restart it from the TNSI website');
  });

  it('cancelling: access continues to the server’s paid-through date', () => {
    const t = text(
      entitlements(
        { state: 'active', hasPaidAccess: true, paidThrough: '2026-12-01T00:00:00.000Z' },
        { tier: 'monthly', cancelAtPeriodEnd: true },
      ),
    );
    expect(t).toContain(
      'Your access continues until 1 December 2026, after which your membership will not renew.',
    );
  });

  it('active: shows the next renewal from the paid-through date', () => {
    const t = text(
      entitlements(
        { state: 'active', hasPaidAccess: true, paidThrough: '2026-12-01T00:00:00.000Z' },
        { tier: 'annual' },
      ),
    );
    expect(t).toBe('Renews 1 December 2026.');
  });

  it('a legacy Lifetime member shows no renewal or end date', () => {
    expect(text(entitlements({ state: 'active', hasPaidAccess: true }, { tier: 'lifetime' }))).toBe(
      '',
    );
  });

  it('with no resolved membership (an older server) it falls back to the stored fields', () => {
    const e = {
      ...entitlements(
        { state: 'active' },
        { tier: 'monthly', currentPeriodEnd: '2026-12-05T00:00:00.000Z' },
      ),
      membership: undefined,
    } as Entitlements;
    expect(text(e)).toBe('Renews 5 December 2026.');
  });
});
