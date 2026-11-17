import { describe, expect, it } from 'vitest';
import { TRIAL_DURATION_DAYS } from '@tnsi/auth/trial/eligibility';
import { MEMBERSHIP_TRIAL_DAYS } from '@tnsi/integrations';

describe('trial length', () => {
  it('the displayed trial length equals the enforced one', () => {
    expect(MEMBERSHIP_TRIAL_DAYS).toBe(30);
    expect(TRIAL_DURATION_DAYS).toBe(MEMBERSHIP_TRIAL_DAYS);
  });
});
