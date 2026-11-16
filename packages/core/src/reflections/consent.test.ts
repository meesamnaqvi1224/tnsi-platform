import { describe, expect, it } from 'vitest';
import {
  JOURNAL_CONSENT_COPY,
  JOURNAL_CONSENT_REQUIRED_CODE,
  JOURNAL_CONSENT_VERSION,
} from './consent';
import { describeReflectionError } from './logic';

describe('the first-use acknowledgement (proposed wording)', () => {
  it('is marked as an unapproved draft in its version, so approved wording must get a new one', () => {
    expect(JOURNAL_CONSENT_VERSION).toBe('draft-1');
  });

  it('says what the decision requires: personal or health-related information may be written, it is stored in the account, and how to withdraw', () => {
    const text = [JOURNAL_CONSENT_COPY.intro, ...JOURNAL_CONSENT_COPY.points].join(' ');
    expect(text).toMatch(/health-related/);
    expect(text).toMatch(/stored in your TNSI account/);
    expect(text).toMatch(/Withdraw permission/);
    expect(JOURNAL_CONSENT_COPY.checkboxLabel).toMatch(/stored in my account/);
  });

  it('claims nothing that is not verified or decided: no lawful basis, encryption, staff access, hosting location, or outcomes', () => {
    const all = JSON.stringify(JOURNAL_CONSENT_COPY);
    expect(all).not.toMatch(/lawful|legitimate interest|article|gdpr|consent to processing/i);
    expect(all).not.toMatch(/encrypt|secure|safe|no one at|nobody at|never access|staff|employee/i);
    expect(all).not.toMatch(/united states|us region|neon|aws|vercel|clerk/i);
    expect(all).not.toMatch(/\bheal(s|ing|ed)?\b|recover|improve|therap|treat|diagnos|clinical/i);
  });

  it('keeps the agree step separate and never pre-ticked: it is a checkbox label plus a button', () => {
    expect(JOURNAL_CONSENT_COPY.checkboxLabel.length).toBeGreaterThan(20);
    expect(JOURNAL_CONSENT_COPY.agreeButton).toBe('Agree and continue');
    expect(JOURNAL_CONSENT_COPY.notNowButton).toBe('Not now');
  });
});

describe('describeReflectionError with a missing acknowledgement', () => {
  it('a 403 with the consent code is "consent_required" and says the writing is still there', () => {
    const described = describeReflectionError(
      { status: 403, code: JOURNAL_CONSENT_REQUIRED_CODE },
      'save',
    );
    expect(described.kind).toBe('consent_required');
    expect(described.message).toBe(JOURNAL_CONSENT_COPY.required);
    expect(described.message).toMatch(/still here/);
  });

  it('other 403s are not mistaken for it, and it never repeats server text', () => {
    expect(describeReflectionError({ status: 403, code: 'FORBIDDEN' }, 'save').kind).toBe('failed');
    const leaky = { status: 403, code: JOURNAL_CONSENT_REQUIRED_CODE, message: 'SECRET text' };
    expect(JSON.stringify(describeReflectionError(leaky, 'save'))).not.toContain('SECRET');
  });
});
