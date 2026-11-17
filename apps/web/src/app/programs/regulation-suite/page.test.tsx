import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';

/**
 * The public Regulation Suite™ page: what it tells a visitor about membership.
 * The header and footer are not under test, so they are stubbed.
 */

vi.mock('@/components/layout/site-header', () => ({ SiteHeader: () => null }));
vi.mock('@/components/layout/site-footer', () => ({ SiteFooter: () => null }));
vi.mock('@/components/seo/json-ld', () => ({ JsonLd: () => null }));

const RegulationSuitePage = (await import('./page')).default;

const KEYS = [
  'REGULATION_SUITE_MEMBERSHIP_OPEN',
  'STRIPE_SECRET_KEY',
  'STRIPE_WEBHOOK_SECRET',
  'STRIPE_PRICE_ID_MONTHLY',
  'STRIPE_PRICE_ID_ANNUAL',
];
const saved = Object.fromEntries(KEYS.map((k) => [k, process.env[k]]));

function open() {
  process.env.REGULATION_SUITE_MEMBERSHIP_OPEN = 'true';
  process.env.STRIPE_SECRET_KEY = 'sk_test_x';
  process.env.STRIPE_WEBHOOK_SECRET = 'whsec_x';
  process.env.STRIPE_PRICE_ID_MONTHLY = 'price_m';
  process.env.STRIPE_PRICE_ID_ANNUAL = 'price_a';
}

const render = () => {
  const html = renderToStaticMarkup(RegulationSuitePage());
  const text = html
    .replace(/<[^>]+>/g, ' ')
    .replace(/&#x27;/g, "'")
    .replace(/&amp;/g, '&')
    .replace(/\s+/g, ' ');
  return { html, text };
};

beforeEach(() => {
  for (const k of KEYS) delete process.env[k];
});
afterEach(() => {
  for (const k of KEYS) {
    if (saved[k] === undefined) delete process.env[k];
    else process.env[k] = saved[k];
  }
});

describe('Regulation Suite page — membership closed (today)', () => {
  it('keeps the closed message and the Discovery Call link, offers no trial or sign-up, and only DESCRIBES the approved terms for when membership opens', () => {
    const { html, text } = render();
    expect(text).toContain('Not yet open for enrolment');
    expect(html).toContain('href="/book-a-call"');
    expect(text).not.toContain('Get started');
    // Owner-approved terms may be described, but only as a future state - never offered.
    expect(text).toContain('When membership opens');
    expect(text).toContain('£5.99 per month');
    expect(text).toContain('£59.99 per year');
    expect(text).not.toMatch(/start your|create your account|try the full|available now/i);
    expect(html).not.toContain('/sign-up');
  });
});

describe('Regulation Suite page — membership open', () => {
  beforeEach(open);

  it('carries the approved trial copy verbatim, under its own heading', () => {
    const { text } = render();
    expect(text).toContain('Try the Regulation Suite free for 30 days');
    expect(text).toContain(
      'Eligible accounts can try the Regulation Suite free for 30 days without entering payment card details. No paid subscription is created during the trial, and nothing is charged. When the trial ends, your account returns to Free unless you choose a paid plan.',
    );
    expect(text).toContain('One free trial is available per verified email address.');
    expect(text).toContain(
      'If you decide to become a member, you can choose a monthly or annual plan and complete checkout separately. A paid subscription starts only when you complete that purchase.',
    );
  });

  it('does not imply every account is eligible, and never offers the trial as a button that starts it', () => {
    const { text } = render();
    expect(text).toContain('Eligible accounts can try');
    expect(text).toContain('whether you are eligible for the free trial');
    expect(text).not.toMatch(/start your 30-day free trial/i);
  });

  it('keeps the trial and the paid plans in separate, labelled blocks', () => {
    const { html } = render();
    expect(html).toContain('id="rs-trial-heading"');
    expect(html).toContain('id="rs-plans-heading"');
    expect(html.indexOf('id="rs-trial-heading"')).toBeLessThan(
      html.indexOf('id="rs-plans-heading"'),
    );
  });

  it('states the approved prices and that paid membership is separate, with no saving quoted until approved', () => {
    const { text } = render();
    expect(text).toContain('£5.99 per month');
    expect(text).toContain('£59.99 per year');
    expect(text).toContain('Paid membership is');
    expect(text).not.toMatch(/save (approximately )?\d+\s?%|\d+\s?% saving/i);
  });

  it('never says a payment is taken when the trial ends, and never pairs a price with the trial', () => {
    const { text } = render();
    expect(text.toLowerCase()).not.toContain('first payment');
    expect(text.toLowerCase()).not.toContain('after the trial, membership is');
    expect(text.toLowerCase()).not.toMatch(/then £|after your trial/);
    expect(text.toLowerCase()).not.toMatch(/cancel before the trial/);
  });

  it('every call to action only leads to account creation and the membership page - nothing here starts a trial or a payment', () => {
    const { html } = render();
    expect(html).toContain('href="/sign-up?redirect_url=%2Fdashboard%2Fbilling"');
    expect(html).toContain('href="/sign-up?redirect_url=%2Fdashboard%2Fbilling%3Fplan%3Dmonthly"');
    expect(html).toContain('href="/sign-up?redirect_url=%2Fdashboard%2Fbilling%3Fplan%3Dannual"');
    expect(html).not.toContain('/api/');
    expect(html).not.toContain('<button');
    // The hero, the plans block and the closing panel each offer "Get started".
    expect((html.match(/Get started/g) ?? []).length).toBeGreaterThanOrEqual(3);
  });

  it('the plan links tell a screen-reader user an account comes first', () => {
    expect(render().text).toContain('Choose Monthly (you will create an account first)');
    expect(render().text).toContain('Choose Annual (you will create an account first)');
  });

  it('does not offer Lifetime', () => {
    expect(render().text).not.toMatch(/lifetime membership/i);
  });
});

describe('Regulation Suite page — closed state is unchanged by the membership section', () => {
  it('shows none of the open-state membership content while membership is closed', () => {
    const { html, text } = render();
    expect(text).not.toContain('Try the Regulation Suite free for 30 days');
    expect(text).not.toContain('Membership plans');
    expect(text).not.toContain('One free trial is available');
    expect(text).not.toContain('Choose Monthly');
    expect(html).not.toContain('/sign-up');
    expect(html).not.toContain('rs-trial-heading');
    expect(html).toContain('href="/book-a-call"');
  });

  it('is also closed when only the launch switch is set but billing is not configured', () => {
    process.env.REGULATION_SUITE_MEMBERSHIP_OPEN = 'true';
    const { text } = render();
    expect(text).toContain('Not yet open for enrolment');
    expect(text).not.toContain('Try the Regulation Suite free for 30 days');
  });
});
