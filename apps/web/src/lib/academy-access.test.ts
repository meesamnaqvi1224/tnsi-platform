import { describe, expect, it } from 'vitest';
import { summariseAccess } from './academy-access';

const DAY = 24 * 60 * 60 * 1000;
const NOW = new Date('2026-10-31T12:00:00Z');

const base = { hasPaidAccess: false, trialEndsAt: null, trialExpired: false } as const;

describe('summariseAccess', () => {
  it('calls a trial member a Trial Membership, not a Free Member', () => {
    const summary = summariseAccess(
      { ...base, state: 'trialing', hasPaidAccess: true, trialEndsAt: new Date(+NOW + 27 * DAY) },
      'free',
      NOW,
    );
    expect(summary.label).toBe('Trial Membership');
    expect(summary.chip).toBe('Trial · Day 4 of 30');
    expect(summary.description).toContain('Your free trial ends on');
  });

  it('is day 1 on the first day and never past day 30', () => {
    const first = summariseAccess(
      { ...base, state: 'trialing', hasPaidAccess: true, trialEndsAt: new Date(+NOW + 30 * DAY) },
      'free',
      NOW,
    );
    expect(first.chip).toBe('Trial · Day 1 of 30');
    const last = summariseAccess(
      { ...base, state: 'trialing', hasPaidAccess: true, trialEndsAt: new Date(+NOW + 1000) },
      'free',
      NOW,
    );
    expect(last.chip).toBe('Trial · Day 30 of 30');
  });

  it('a paying member sees their plan and no extra sentence', () => {
    const summary = summariseAccess({ ...base, state: 'active', hasPaidAccess: true }, 'annual');
    expect(summary).toEqual({ label: 'Annual Member', chip: 'Annual Member', description: null });
  });

  it('a member in payment grace keeps their plan and is pointed to the membership page', () => {
    const summary = summariseAccess({ ...base, state: 'grace', hasPaidAccess: true }, 'monthly');
    expect(summary.label).toBe('Monthly Member');
    expect(summary.description).toContain('membership page');
  });

  it('an ended membership is a Free Member whatever plan the row last held', () => {
    const summary = summariseAccess({ ...base, state: 'inactive' }, 'monthly');
    expect(summary.label).toBe('Free Member');
    expect(summary.description).toBe(
      'Your paid membership has ended. Your free account remains active.',
    );
  });

  it('a free member whose trial has ended is told so, with no invented dates', () => {
    const summary = summariseAccess({ ...base, state: 'free', trialExpired: true }, 'free');
    expect(summary.description).toContain('trial has ended');
    expect(summariseAccess({ ...base, state: 'free' }, 'free').description).toBeNull();
  });
});
