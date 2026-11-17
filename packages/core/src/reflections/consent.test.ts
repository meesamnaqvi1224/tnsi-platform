import { describe, expect, it } from 'vitest';
import {
  JOURNAL_CONSENT_COPY,
  JOURNAL_CONSENT_REQUIRED_CODE,
  JOURNAL_CONSENT_VERSION,
} from './consent';
import { describeReflectionError } from './logic';

describe('the first-use acknowledgement (proposed wording)', () => {
  it('is marked as an unapproved draft in its version, so approved wording must get a new one', () => {
    expect(JOURNAL_CONSENT_VERSION).toBe('draft-2');
  });

  it('says what the decision requires: personal or health-related information may be written, it is stored in the account, and how to withdraw', () => {
    const text = [JOURNAL_CONSENT_COPY.intro, ...JOURNAL_CONSENT_COPY.points].join(' ');
    expect(text).toMatch(/health-related/);
    expect(text).toMatch(/stored in your TNSI account/);
    expect(text).toMatch(/Withdraw permission/);
    expect(JOURNAL_CONSENT_COPY.checkboxLabel).toMatch(/stored in my account/);
  });

  it('claims nothing that is not verified or decided: no lawful basis, encryption, absolute access claims, hosting location, or outcomes', () => {
    const all = JSON.stringify(JOURNAL_CONSENT_COPY);
    expect(all).not.toMatch(/lawful|legitimate interest|article|gdpr|consent to processing/i);
    expect(all).not.toMatch(
      /encrypt|certif|only you|no one|nobody|never access|cannot be accessed/i,
    );
    expect(all).not.toMatch(/united states|us region|neon|aws|vercel|clerk/i);
    expect(all).not.toMatch(/\bheal(s|ing|ed)?\b|recover|improve|therap|treat|diagnos|clinical/i);
  });

  it('follows decision Q2: other members cannot see entries, no routine review, and limited authorised technical access is acknowledged', () => {
    const text = JOURNAL_CONSENT_COPY.points.join(' ');
    expect(text).toMatch(/Other members can’t see it/);
    expect(text).toMatch(/don’t routinely read reflections/);
    expect(text).toMatch(/authorised technical access/);
  });

  it('tells the member a record of their agreement is kept, and that it holds nothing they wrote', () => {
    const text = JOURNAL_CONSENT_COPY.points.join(' ');
    expect(text).toMatch(/record that you agreed to this notice, and when/);
    expect(text).toMatch(/does not include anything you wrote/);
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
