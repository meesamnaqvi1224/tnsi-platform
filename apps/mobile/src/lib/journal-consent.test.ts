import { describe, expect, it } from 'vitest';
import {
  JOURNAL_CONSENT_COPY,
  JOURNAL_CONSENT_REQUIRED_CODE,
  JOURNAL_CONSENT_VERSION,
} from '@tnsi/core';
import { describeReflectionError } from './reflections';

/**
 * The app shows the same acknowledgement wording and reads the same server error as the website (both come
 * from @tnsi/core). These pin the parts the screens depend on.
 */
describe('first-use acknowledgement in the app', () => {
  it('the notice has everything a screen renders: a title, an unticked-checkbox label and both buttons', () => {
    expect(JOURNAL_CONSENT_COPY.title).toBeTruthy();
    expect(JOURNAL_CONSENT_COPY.checkboxLabel).toBeTruthy();
    expect(JOURNAL_CONSENT_COPY.agreeButton).toBe('Agree and continue');
    expect(JOURNAL_CONSENT_COPY.notNowButton).toBe('Not now');
    expect(JOURNAL_CONSENT_COPY.points.length).toBeGreaterThanOrEqual(4);
  });

  it('withdrawal asks before it acts and says nothing is deleted', () => {
    const w = JOURNAL_CONSENT_COPY.withdraw;
    expect(w.confirmTitle).toBeTruthy();
    expect(w.confirmMessage).toMatch(/stay in your account/);
    expect(w.cancelButton).toBe('Cancel');
  });

  it('a save the server refuses for a missing acknowledgement says why and that the writing is still there', () => {
    const described = describeReflectionError(
      { status: 403, code: JOURNAL_CONSENT_REQUIRED_CODE },
      'save',
    );
    expect(described.kind).toBe('consent_required');
    expect(described.message).toMatch(/still here/);
  });

  it('the notice version is the draft marker, so approved wording must change it', () => {
    expect(JOURNAL_CONSENT_VERSION).toBe('draft-2');
  });
});
