import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { resolveMembership } from '@tnsi/auth/authorize/entitlements';

/**
 * Billing page copy and controls for every membership state, rendering the
 * real page with the resolved membership (computed by the same
 * `resolveMembership` the server's access checks use). Auth and the
 * database are mocked; no Stripe call is made.
 */

const mockRequireAuthOrRedirect = vi.fn();
vi.mock('@/lib/auth-api', () => ({
  requireAuthOrRedirect: () => mockRequireAuthOrRedirect(),
}));

const mockGetBillingState = vi.fn();
vi.mock('@/lib/billing', () => ({
  getBillingState: () => mockGetBillingState(),
}));

const BillingPage = (await import('./page')).default;

const NOW = Date.now();
const DAY = 24 * 60 * 60 * 1000;

function billing(overrides: {
  tier?: 'free' | 'monthly' | 'annual';
  status?: 'active' | 'trialing' | 'past_due' | 'canceled' | 'expired';
  paymentFailedAt?: Date | null;
  cancelAtPeriodEnd?: boolean;
  hasStripeCustomer?: boolean;
  hasHadSubscription?: boolean;
  currentPeriodEnd?: Date | null;
}) {
  const {
    tier = 'free',
    status = 'active',
    paymentFailedAt = null,
    cancelAtPeriodEnd = false,
    hasStripeCustomer = false,
    hasHadSubscription = false,
    currentPeriodEnd = null,
  } = overrides;
  return {
    tier,
    status,
    membership: resolveMembership({
      tier,
      status,
      programs: [],
      certifications: [],
      features: [],
      paymentFailedAt,
      cancelAtPeriodEnd,
    }),
    hasStripeCustomer,
    hasHadSubscription,
    currentPeriodEnd,
    cancelAtPeriodEnd,
    canceledAt: null,
  };
}

async function render(state: ReturnType<typeof billing>, search: Record<string, string> = {}) {
  mockRequireAuthOrRedirect.mockResolvedValue({ id: 'user-1' });
  mockGetBillingState.mockResolvedValue(state);
  return renderToStaticMarkup(await BillingPage({ searchParams: Promise.resolve(search) }));
}

const KEYS = [
  'REGULATION_SUITE_MEMBERSHIP_OPEN',
  'STRIPE_SECRET_KEY',
  'STRIPE_WEBHOOK_SECRET',
  'STRIPE_PRICE_ID_MONTHLY',
  'STRIPE_PRICE_ID_ANNUAL',
];
const saved = Object.fromEntries(KEYS.map((k) => [k, process.env[k]]));

function openMembership() {
  process.env.REGULATION_SUITE_MEMBERSHIP_OPEN = 'true';
  process.env.STRIPE_SECRET_KEY = 'sk_test_x';
  process.env.STRIPE_WEBHOOK_SECRET = 'whsec_x';
  process.env.STRIPE_PRICE_ID_MONTHLY = 'price_m';
  process.env.STRIPE_PRICE_ID_ANNUAL = 'price_a';
}

beforeEach(() => {
  vi.clearAllMocks();
  for (const k of KEYS) delete process.env[k];
});
afterEach(() => {
  for (const k of KEYS) {
    if (saved[k] === undefined) delete process.env[k];
    else process.env[k] = saved[k];
  }
});

describe('BillingPage — membership closed (today)', () => {
  it('shows the free account with NO checkout buttons and the not-open message', async () => {
    const html = await render(billing({}));
    expect(html).toContain('Free Member');
    expect(html).toContain('not open for enrolment yet');
    expect(html).not.toContain('Start free trial');
    expect(html).not.toContain('Subscribe');
    expect(html).not.toContain('lifetime');
  });
});

describe('BillingPage — membership open', () => {
  beforeEach(openMembership);

  it('free account, never subscribed: offers the 30-day trial on both approved plans, no lifetime', async () => {
    const html = await render(billing({}));
    expect(html).toContain('30-day free trial');
    expect(html).toContain('Start free trial — £5.99/month');
    expect(html).toContain('Start free trial — £59/year');
    expect(html).not.toMatch(/lifetime/i);
    expect(html).not.toContain('not open for enrolment');
  });

  it('a former subscriber is NOT offered a second trial', async () => {
    const html = await render(
      billing({
        tier: 'monthly',
        status: 'canceled',
        hasStripeCustomer: true,
        hasHadSubscription: true,
      }),
    );
    expect(html).toContain('Membership ended');
    expect(html).toContain('Subscribe — £5.99/month');
    expect(html).toContain('Subscribe — £59/year');
    expect(html).not.toContain('Start free trial');
    expect(html).toContain('Manage billing');
  });

  it('trialing: shows the trial and trial end, offers billing management, no subscribe buttons', async () => {
    const html = await render(
      billing({
        tier: 'monthly',
        status: 'trialing',
        hasStripeCustomer: true,
        hasHadSubscription: true,
        currentPeriodEnd: new Date(NOW + 20 * DAY),
      }),
    );
    expect(html).toContain('Free trial');
    expect(html).toContain('30-day free trial ends');
    expect(html).toContain('Manage billing');
    expect(html).not.toContain('Subscribe —');
    expect(html).not.toContain('Start free trial');
  });

  it('active monthly and annual: shows renewal date and billing management', async () => {
    for (const [tier, label] of [
      ['monthly', 'Monthly Member'],
      ['annual', 'Annual Member'],
    ] as const) {
      const html = await render(
        billing({
          tier,
          status: 'active',
          hasStripeCustomer: true,
          hasHadSubscription: true,
          currentPeriodEnd: new Date(NOW + 10 * DAY),
        }),
      );
      expect(html).toContain(label);
      expect(html).toContain('renews');
      expect(html).toContain('Manage billing');
    }
  });

  it('cancelled at period end: access continues to the end date, then will not renew', async () => {
    const html = await render(
      billing({
        tier: 'annual',
        status: 'active',
        cancelAtPeriodEnd: true,
        hasStripeCustomer: true,
        hasHadSubscription: true,
        currentPeriodEnd: new Date(NOW + 40 * DAY),
      }),
    );
    expect(html).toContain('access continues until');
    expect(html).toContain('then won&#x27;t renew');
    expect(html).not.toContain('Subscribe —');
  });

  it('payment failed, inside grace: warns, states when access ends, points to billing management', async () => {
    const html = await render(
      billing({
        tier: 'monthly',
        status: 'past_due',
        paymentFailedAt: new Date(NOW - 2 * DAY),
        hasStripeCustomer: true,
        hasHadSubscription: true,
      }),
    );
    expect(html).toContain('We could not take your latest payment');
    expect(html).toContain('Your access continues until');
    expect(html).toContain('Payment needs attention');
    expect(html).toContain('Manage billing');
  });

  it('payment failed, past the 7-day grace: shown as ended, with a way back', async () => {
    const html = await render(
      billing({
        tier: 'monthly',
        status: 'past_due',
        paymentFailedAt: new Date(NOW - 8 * DAY),
        hasStripeCustomer: true,
        hasHadSubscription: true,
      }),
    );
    expect(html).toContain('Membership ended');
    expect(html).not.toContain('We could not take your latest payment');
    expect(html).toContain('Subscribe — £5.99/month');
  });

  it('returning from checkout before the webhook lands does not claim the membership is active', async () => {
    const html = await render(billing({}), { success: 'true' });
    expect(html).toContain('confirming your membership');
    expect(html).not.toContain('Your membership is now active');
  });

  it('returning from checkout once the trial is recorded confirms the trial', async () => {
    const html = await render(
      billing({
        tier: 'monthly',
        status: 'trialing',
        hasStripeCustomer: true,
        hasHadSubscription: true,
      }),
      { success: 'true' },
    );
    expect(html).toContain('Your free trial has started');
  });

  it('never promises refunds', async () => {
    const html = await render(billing({}));
    expect(html.toLowerCase()).not.toContain('refund');
  });
});
