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

  it('describes the trial accurately: 30 days, no card, no charge at the end, returns to Free', () => {
    const { text } = render();
    expect(text).toContain('Create your account to get started');
    expect(text).toContain('free for 30 days');
    expect(text).toContain('No payment card is required');
    expect(text).toContain('nothing is charged when the trial ends');
    expect(text).toContain('returns to Free unless you choose a paid plan');
  });

  it('does not imply every account is eligible: says "eligible accounts" and one per verified email', () => {
    const { text } = render();
    expect(text).toContain('Eligible accounts can try');
    expect(text).toContain('One free trial is available per verified email address');
    expect(text).not.toMatch(/start your 30-day free trial/i);
  });

  it('states the approved prices and that paid membership is separate', () => {
    const { text } = render();
    expect(text).toContain('£5.99 per month');
    expect(text).toContain('£59.99 per year');
    expect(text).toContain('Paid membership is');
  });

  it('never says a payment is taken when the trial ends', () => {
    const { text } = render();
    expect(text.toLowerCase()).not.toContain('first payment');
    expect(text.toLowerCase()).not.toContain('after the trial, membership is');
  });

  it('the call to action only leads to account creation and the membership page - it starts nothing itself', () => {
    const { html } = render();
    expect(html).toContain('href="/sign-up?redirect_url=%2Fdashboard%2Fbilling"');
    expect(html).not.toContain('/api/');
  });

  it('does not offer Lifetime', () => {
    expect(render().text).not.toMatch(/lifetime membership/i);
  });
});
