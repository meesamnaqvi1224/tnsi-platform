import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { accessibilityContent } from './legal/accessibility';
import { contactContent } from './contact';
import { discoveryCallContent } from './discovery-call';
import { practitionerCertificationContent } from './practitioner-certification';
import { researchContent } from './research';
import { NEWSLETTER_PRIVACY_NOTE } from './shared';
import { programsOverviewContent } from './programs';

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

  it('describes the owner-approved Regulation Suite terms and nothing else', () => {
    const regulation = programsOverviewContent.pathways.find((p) => p.id === 'regulation-suite')!;
    const text = regulation.paragraphs.join(' ');
    expect(text).toContain('£5.99 per month');
    expect(text).toContain('£59.99 per year');
    expect(text).toContain('30-day free trial');
    expect(text).toContain('no payment card');
    expect(text).toContain('Payments are not refunded');
    expect(text).not.toMatch(/lifetime/i);
    expect(text).toMatch(/When membership opens/);
  });
});

/** Every public-copy source file (content and components), excluding tests. */
function publicCopyFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return publicCopyFiles(path);
    return /\.(ts|tsx)$/.test(name) && !/\.test\./.test(name) ? [path] : [];
  });
}

describe('claims withdrawn by owner decision (23 Oct 2026)', () => {
  const root = join(__dirname, '..');
  const files = [
    ...publicCopyFiles(join(root, 'content')),
    ...publicCopyFiles(join(root, 'components')),
    ...publicCopyFiles(join(root, 'app')),
  ];

  it.each([
    ['a Practitioner Registry', /practitioner registry/i],
    ['annual reapproval', /annual reapproval/i],
    ['a 16-module curriculum', /16[- ]module|sixteen[- ]module/i],
    ['"40+" source counts', /40\+ peer-reviewed/i],
    ['a longitudinal study', /longitudinal/i],
    [
      'plan switching in the billing portal (not approved)',
      /change your plan|switch (your )?plan/i,
    ],
    [
      '15 / 20 year biography durations',
      /fifteen years|twenty years|\b15 years|\b20\+ years|two decades/i,
    ],
  ])('no public copy claims %s', (_name, pattern) => {
    const offenders = files.filter((file) => pattern.test(readFileSync(file, 'utf8')));
    expect(offenders).toEqual([]);
  });

  it('uses the approved experience wording', () => {
    expect(readFileSync(join(root, 'content/discovery-call.ts'), 'utf8')).toContain('25+ years');
  });
});
