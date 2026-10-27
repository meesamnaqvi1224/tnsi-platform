import { describe, expect, it } from 'vitest';
import { parsePreselectedPlan, signUpToMembershipHref } from '@/lib/membership-links';

describe('signUpToMembershipHref', () => {
  it('sends a visitor to account creation and then the membership page, and nothing else', () => {
    expect(signUpToMembershipHref()).toBe('/sign-up?redirect_url=%2Fdashboard%2Fbilling');
  });

  it('can carry a plan to preselect, encoded so the redirect target stays one value', () => {
    expect(signUpToMembershipHref('monthly')).toBe(
      '/sign-up?redirect_url=%2Fdashboard%2Fbilling%3Fplan%3Dmonthly',
    );
    expect(signUpToMembershipHref('annual')).toBe(
      '/sign-up?redirect_url=%2Fdashboard%2Fbilling%3Fplan%3Dannual',
    );
  });

  it('never points at an API route or an external address', () => {
    for (const href of [
      signUpToMembershipHref(),
      signUpToMembershipHref('monthly'),
      signUpToMembershipHref('annual'),
    ]) {
      expect(href.startsWith('/sign-up?redirect_url=')).toBe(true);
      expect(href).not.toContain('/api/');
      expect(href).not.toContain('http');
    }
  });
});

describe('parsePreselectedPlan', () => {
  it('accepts exactly the two purchasable plans', () => {
    expect(parsePreselectedPlan('monthly')).toBe('monthly');
    expect(parsePreselectedPlan('annual')).toBe('annual');
  });

  it('rejects everything else, including Lifetime, odd casing, lists and nothing', () => {
    for (const value of [
      'lifetime',
      'Monthly',
      'ANNUAL',
      '',
      ' monthly',
      'monthly,annual',
      '<script>',
    ]) {
      expect(parsePreselectedPlan(value)).toBeUndefined();
    }
    expect(parsePreselectedPlan(['monthly', 'annual'])).toBeUndefined();
    expect(parsePreselectedPlan(undefined)).toBeUndefined();
  });
});
