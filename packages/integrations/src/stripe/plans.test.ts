import { describe, expect, it } from 'vitest';
import {
  MEMBERSHIP_ANNUAL_SAVING_PERCENT,
  MEMBERSHIP_FREE_POWERDROPS,
  MEMBERSHIP_PLANS,
  MEMBERSHIP_TRIAL_DAYS,
} from './plans';

const amount = (price: string) => Number(price.replace(/[^0-9.]/g, ''));

describe('Regulation Suite™ commercial constants (Membership & Commercial Model v1)', () => {
  it('matches the approved prices, trial and free PowerDrops™ count', () => {
    expect(MEMBERSHIP_PLANS.monthly.price).toBe('£5.99');
    expect(MEMBERSHIP_PLANS.annual.price).toBe('£59.99');
    expect(MEMBERSHIP_TRIAL_DAYS).toBe(30);
    expect(MEMBERSHIP_FREE_POWERDROPS).toBe(3);
  });

  it('the displayed annual saving is the real saving, rounded', () => {
    const yearlyAtMonthly = amount(MEMBERSHIP_PLANS.monthly.price) * 12;
    const saving = (1 - amount(MEMBERSHIP_PLANS.annual.price) / yearlyAtMonthly) * 100;
    expect(Math.round(saving)).toBe(MEMBERSHIP_ANNUAL_SAVING_PERCENT);
  });
});
