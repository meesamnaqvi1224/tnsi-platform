import { describe, expect, it } from 'vitest';
import { ASSESSMENT_EMAIL_NOTE, ASSESSMENT_NO_RESULT_MESSAGE } from './assessment-experience';

/**
 * No outbound email is implemented for assessments, so the page must not
 * promise one. If an email workflow is built later, update these deliberately.
 */
describe('assessment copy', () => {
  it.each([
    ['email note', ASSESSMENT_EMAIL_NOTE],
    ['no-result message', ASSESSMENT_NO_RESULT_MESSAGE],
  ])('the %s does not promise an email or follow-up', (_name, text) => {
    expect(text).not.toMatch(/send you|email you|emailed|follow up|follow-up|shortly|resources/i);
  });

  it('tells the visitor where the result appears', () => {
    expect(ASSESSMENT_EMAIL_NOTE).toMatch(/next screen/i);
  });
});
