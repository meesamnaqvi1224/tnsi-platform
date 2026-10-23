import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';

/**
 * The billing page must not offer a purchase while membership is closed, and
 * must never offer Lifetime. Auth and the database are mocked.
 */

vi.mock('@/lib/auth-api', () => ({
  requireAuthOrRedirect: async () => ({ id: 'user-1' }),
}));

vi.mock('@/lib/billing', () => ({
  getBillingState: async () => ({
    tier: 'free',
    status: 'active',
    hasStripeCustomer: false,
    currentPeriodEnd: null,
    cancelAtPeriodEnd: false,
  }),
}));

const BillingPage = (await import('./page')).default;

const KEYS = [
  'REGULATION_SUITE_MEMBERSHIP_OPEN',
  'STRIPE_SECRET_KEY',
  'STRIPE_WEBHOOK_SECRET',
  'STRIPE_PRICE_ID_MONTHLY',
  'STRIPE_PRICE_ID_ANNUAL',
];
const saved = Object.fromEntries(KEYS.map((k) => [k, process.env[k]]));

async function render() {
  return renderToStaticMarkup(await BillingPage({ searchParams: Promise.resolve({}) }));
}

beforeEach(() => {
  for (const k of KEYS) delete process.env[k];
});

afterEach(() => {
  for (const k of KEYS) {
    if (saved[k] === undefined) delete process.env[k];
    else process.env[k] = saved[k];
  }
});

describe('billing page', () => {
  it('offers no purchase while membership is closed', async () => {
    const html = await render();
    expect(html).toContain('Membership is not open yet.');
    expect(html).not.toMatch(/Subscribe|lifetime access/i);
  });

  it('offers monthly and annual - and never Lifetime - once membership is open and configured', async () => {
    process.env.REGULATION_SUITE_MEMBERSHIP_OPEN = 'true';
    process.env.STRIPE_SECRET_KEY = 'sk_test_placeholder';
    process.env.STRIPE_WEBHOOK_SECRET = 'whsec_placeholder';
    process.env.STRIPE_PRICE_ID_MONTHLY = 'price_monthly_placeholder';
    process.env.STRIPE_PRICE_ID_ANNUAL = 'price_annual_placeholder';
    const html = await render();
    expect(html).toContain('Subscribe monthly');
    expect(html).toContain('Subscribe annually');
    expect(html).not.toMatch(/lifetime access/i);
    expect(html).not.toContain('Membership is not open yet.');
  });

  it('stays closed when the launch variable is set but billing is not configured', async () => {
    process.env.REGULATION_SUITE_MEMBERSHIP_OPEN = 'true';
    const html = await render();
    expect(html).toContain('Membership is not open yet.');
    expect(html).not.toContain('Subscribe monthly');
  });
});
