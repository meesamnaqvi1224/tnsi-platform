import { describe, expect, it } from 'vitest';
import { accessibilityContent } from './legal/accessibility';
import { contactContent } from './contact';
import { discoveryCallContent } from './discovery-call';
import { practitionerCertificationContent } from './practitioner-certification';
import { researchContent } from './research';
import { NEWSLETTER_PRIVACY_NOTE } from './shared';

/**
 * Regression checks for public-copy fixes from the W-02 audit.
 */
describe('public copy', () => {
  it('states the real Discovery Call length (the booking calendar is 20 minutes)', () => {
    const text = JSON.stringify(discoveryCallContent);
    expect(text).toContain('20 minutes');
    expect(text).not.toMatch(/thirty minutes|30[- ]minutes?/i);
  });

  it('publishes no placeholder text on the contact page', () => {
    const text = JSON.stringify(contactContent);
    expect(text).not.toMatch(/forthcoming|map placeholder|coming soon/i);
  });

  it('does not offer to "request" a prospectus that is not delivered', () => {
    const text = JSON.stringify(practitionerCertificationContent);
    expect(text).not.toMatch(/Request Prospectus/);
  });

  it('does not tell newsletter subscribers their data is never shared (the privacy policy names service providers)', () => {
    expect(NEWSLETTER_PRIVACY_NOTE).not.toMatch(/never share/i);
  });

  it('does not claim sufficient colour contrast while measured failures exist', () => {
    expect(JSON.stringify(accessibilityContent)).not.toMatch(/sufficient colou?r contrast/i);
  });

  it('does not present research initiatives as active studies without evidence', () => {
    const statuses = researchContent.initiatives.items.map((item) => item.status).join(' ');
    expect(statuses).not.toMatch(/active|longitudinal|data collection|cohort forming/i);
  });
});
