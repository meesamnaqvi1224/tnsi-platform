import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { resolveMembership } from '@tnsi/auth/authorize/entitlements';

/**
 * The membership page's copy and controls for every state, rendering the real
 * page with the resolved membership (computed by the same `resolveMembership`
 * the server's access checks use). Auth and the database are mocked; no Stripe
 * call is made.
 */

// The trial button is a client component that refreshes the page after the
// server confirms; there is no app router in a static render.
vi.mock('next/navigation', () => ({ useRouter: () => ({ refresh: () => undefined }) }));

const mockRequireAuthOrRedirect = vi.fn();
vi.mock('@/lib/auth-api', () => ({
  requireAuthOrRedirect: () => mockRequireAuthOrRedirect(),
}));

const mockGetBillingState = vi.fn();
vi.mock('@/lib/billing', () => ({
  getBillingState: () => mockGetBillingState(),
}));

const mockReconcile = vi.fn();
vi.mock('@/lib/reconcile-checkout-session', () => ({
  reconcileCheckoutReturn: (...args: unknown[]) => mockReconcile(...args),
}));

const BillingPage = (await import('./page')).default;

const NOW = Date.now();
const DAY = 24 * 60 * 60 * 1000;

function billing(overrides: {
  tier?: 'free' | 'monthly' | 'annual' | 'lifetime';
  status?: 'active' | 'trialing' | 'past_due' | 'canceled' | 'expired';
  paymentFailedAt?: Date | null;
  cancelAtPeriodEnd?: boolean;
  hasStripeCustomer?: boolean;
  hasHadSubscription?: boolean;
  currentPeriodEnd?: Date | null;
  trialStartedAt?: Date | null;
  trialEndsAt?: Date | null;
  /** What the server says (`BillingState.trialAvailable`); the page only mirrors it. */
  trialAvailable?: boolean;
  stripeUnreachable?: boolean;
}) {
  const {
    tier = 'free',
    status = 'active',
    paymentFailedAt = null,
    cancelAtPeriodEnd = false,
    hasStripeCustomer = false,
    hasHadSubscription = false,
    currentPeriodEnd = null,
    trialStartedAt = null,
    trialEndsAt = null,
    trialAvailable = false,
    stripeUnreachable = false,
  } = overrides;
  return {
    tier,
    status,
    // Resolved from the same full row the real `getBillingState` uses.
    membership: resolveMembership({
      tier,
      status,
      programs: [],
      certifications: [],
      features: [],
      paymentFailedAt,
      cancelAtPeriodEnd,
      currentPeriodEnd,
      trialStartedAt,
      trialEndsAt,
      stripeSubscriptionId: hasHadSubscription ? 'sub_1' : null,
      stripeUnreachable,
    }),
    hasStripeCustomer,
    hasHadSubscription,
    trialAvailable,
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

/** The visible text only — so assertions are about what a member reads, not markup. */
function text(html: string): string {
  return html
    .replace(/<[^>]+>/g, ' ')
    .replace(/&#x27;/g, "'")
    .replace(/&amp;/g, '&')
    .replace(/\s+/g, ' ');
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

const PAID_INCLUDES = [
  'Full Practice Library',
  'Full PowerDrops™',
  'Guided nervous-system exercises',
  'Somatic practices',
  'Meditation & visualisation',
  'Reflective tools',
  'Body-based practices',
  'Educational resources',
  'State-based support',
  'Practice history',
  'Progress',
  'Ongoing additions to the library',
];

describe('MembershipPage — membership not open (today)', () => {
  it('free member: shows the free account and pricing, but no working checkout and the not-open reason', async () => {
    const html = await render(billing({}));
    const t = text(html);
    expect(t).toContain('Regulation Suite™');
    expect(t).toContain('Free Member');
    expect(t).toContain('Explore the foundations of nervous-system support');
    expect(t).toContain('not open for enrolment yet');
    // The call to action exists but cannot be used, and says why.
    expect(html).toMatch(/<button[^>]*\sdisabled=""[^>]*>[^<]*Start Membership/);
    expect(t).toContain('£5.99 / month');
    expect(t).toContain('£59.99 / year');
  });

  it('never offers Lifetime: no Lifetime plan, price or choice - only a note that it is unavailable', async () => {
    const html = await render(billing({}));
    const t = text(html);
    expect(html).not.toMatch(/value="lifetime"/i);
    expect(html).not.toMatch(/<input[^>]*lifetime/i);
    expect(t).toContain('Lifetime membership is unavailable for new purchases');
    // Every mention of Lifetime is that single statement.
    expect(t.match(/lifetime/gi)).toHaveLength(1);
  });

  it('does not advertise a free trial while membership is closed, even if the account would qualify', async () => {
    const t = text(await render(billing({ trialAvailable: true })));
    expect(t).not.toContain('Try it free');
    expect(t).not.toContain('Start your 30-day free trial');
  });
});

describe('MembershipPage — free member (membership open)', () => {
  beforeEach(openMembership);

  it('shows Your Access with the approved free contents', async () => {
    const t = text(await render(billing({})));
    expect(t).toContain('Your Access');
    for (const item of [
      'Daily Check-In',
      'Selected Practices',
      'Selected Resources',
      '3 selected PowerDrops™',
      'Explore Regulation Suite™',
    ]) {
      expect(t).toContain(item);
    }
  });

  it('links only to real destinations (PowerDrops™ has no web page, so it is not a link)', async () => {
    const html = await render(billing({}));
    expect(html).toContain('href="/dashboard"');
    expect(html).toContain('href="/dashboard/practices"');
    expect(html).toContain('href="/programs/regulation-suite"');
    expect(html).not.toMatch(/<a[^>]*>[^<]*selected PowerDrops/);
  });

  it('explains the upgrade and shows both approved prices and the saving', async () => {
    const t = text(await render(billing({})));
    expect(t).toContain('Explore Full Membership');
    expect(t).toContain('£5.99 / month');
    expect(t).toContain('£59.99 / year');
    expect(t).toContain('Save approximately 17%');
    expect(t).toContain('Start Membership');
    expect(t).toContain('Choose Annual');
    expect(t).toContain('Paid membership begins when you choose a plan and complete checkout');
    for (const item of PAID_INCLUDES) expect(t).toContain(item);
  });

  it('when the SERVER says a trial is available: offers it, saying no card, no charge, and one per verified email', async () => {
    const html = await render(billing({ trialAvailable: true }));
    const t = text(html);
    expect(t).toContain('Try it free');
    expect(t).toContain('Eligible accounts can start a 30-day free trial with full member access');
    expect(t).toContain('No payment card is required');
    expect(t).toContain('nothing is charged when the trial ends');
    expect(t).toContain('returns to Free unless you choose a paid plan');
    expect(t).toContain('One free trial is available per verified email address');
    expect(html).toMatch(/<button[^>]*>[^<]*Start your 30-day free trial/);
    // Paid checkout stays a separate, explicit action.
    expect(t).toContain('Start Membership');
  });

  it('never says a payment is taken when the trial ends (it is not)', async () => {
    for (const state of [billing({ trialAvailable: true }), billing({})]) {
      const t = text(await render(state)).toLowerCase();
      expect(t).not.toContain('first payment');
      expect(t).not.toContain('payment is taken');
      expect(t).not.toContain('when the trial ends, your membership continues');
    }
  });

  it('when the server does NOT offer a trial, no trial is mentioned as available', async () => {
    const t = text(await render(billing({ trialAvailable: false })));
    expect(t).not.toContain('Try it free');
    expect(t).not.toContain('Start your 30-day free trial');
    expect(t).not.toContain('Eligible accounts can start');
  });

  it('does not decide eligibility itself: a never-subscribed account the server does not offer a trial is not offered one', async () => {
    const t = text(await render(billing({ hasHadSubscription: false, trialAvailable: false })));
    expect(t).not.toContain('Try it free');
  });

  it('a working checkout (membership open) is not disabled and the not-open message is gone', async () => {
    const html = await render(billing({}));
    expect(html).not.toMatch(/<button[^>]*\sdisabled=""[^>]*>[^<]*Start Membership/);
    expect(text(html)).not.toContain('not open for enrolment');
  });

  it('does not show Manage Membership to someone with no membership', async () => {
    expect(text(await render(billing({})))).not.toContain('Manage Membership');
  });

  it('an account with no entitlement row is a free account, not an ended membership', async () => {
    const t = text(
      await render({
        ...billing({}),
        membership: resolveMembership(null),
      }),
    );
    expect(t).toContain('Free Member');
    expect(t).not.toContain('Membership ended');
  });
});

describe('MembershipPage — free trial (app-managed)', () => {
  beforeEach(openMembership);

  const trialing = (daysLeft: number) =>
    billing({
      tier: 'free',
      trialStartedAt: new Date(NOW - (30 - daysLeft) * DAY),
      trialEndsAt: new Date(NOW + daysLeft * DAY),
    });

  it('shows the real days left, the end date, full access - and that nothing is charged or converted', async () => {
    const t = text(await render(trialing(20)));
    expect(t).toContain('Trial Membership');
    expect(t).toContain('20 days remaining');
    expect(t).toContain('full member access during your 30-day free trial');
    expect(t).toContain('Trial ends');
    expect(t).toContain('No payment card is held and nothing is charged when it ends');
    expect(t).toContain('returns to Free unless you choose a paid plan');
    expect(t).toContain('Your Membership Includes');
    expect(t).not.toContain('continues on the');
    expect(t).not.toContain('first payment');
  });

  it('has no billing to manage (no Stripe customer, no plan) and shows no Manage Membership', async () => {
    const t = text(await render(trialing(20)));
    expect(t).not.toContain('Manage Membership');
    expect(t).not.toContain('Next billing date');
  });

  it('lets a member in their trial choose a paid plan - an explicit checkout, never automatic', async () => {
    const t = text(await render(trialing(20)));
    expect(t).toContain('Start Membership');
    expect(t).toContain('£5.99 / month');
    expect(t).toContain('£59.99 / year');
    expect(t).not.toContain('Try it free'); // the trial is already running
  });

  it('does not invent a countdown when the stored end is unusable', async () => {
    const t = text(
      await render(billing({ tier: 'free', trialStartedAt: new Date(NOW), trialEndsAt: null })),
    );
    expect(t).toContain('Free Member');
    expect(t).not.toMatch(/\d+ days? remaining/);
  });

  it('after the trial: says it has ended, the account is Free, nothing was charged - and offers no second trial', async () => {
    const t = text(
      await render(
        billing({
          tier: 'free',
          trialStartedAt: new Date(NOW - 40 * DAY),
          trialEndsAt: new Date(NOW - 10 * DAY),
          trialAvailable: false,
        }),
      ),
    );
    expect(t).toContain('Free Member');
    expect(t).toContain('Your 30-day free trial has ended.');
    expect(t).toContain('Your account is a Free account again.');
    expect(t).toContain('Nothing has been charged');
    expect(t).toContain('Start Membership');
    expect(t).not.toContain('Try it free');
    expect(t).not.toContain('Start your 30-day free trial');
  });

  it('a pre-existing Stripe-run trial is still shown, with its end date', async () => {
    const t = text(
      await render(
        billing({
          tier: 'monthly',
          status: 'trialing',
          hasStripeCustomer: true,
          hasHadSubscription: true,
          currentPeriodEnd: new Date(NOW + 20 * DAY),
        }),
      ),
    );
    expect(t).toContain('Trial Membership');
    expect(t).toContain('20 days remaining');
  });
});

describe('MembershipPage — active paid member', () => {
  beforeEach(openMembership);

  it('monthly and annual: plan, billing status, next billing date, inclusions and Manage Membership', async () => {
    for (const [tier, plan] of [
      ['monthly', 'Monthly · £5.99/month'],
      ['annual', 'Annual · £59.99/year'],
    ] as const) {
      const t = text(
        await render(
          billing({
            tier,
            status: 'active',
            hasStripeCustomer: true,
            hasHadSubscription: true,
            currentPeriodEnd: new Date(NOW + 10 * DAY),
          }),
        ),
      );
      expect(t).toContain('Active Membership');
      expect(t).toContain(plan);
      expect(t).toContain('Billing status Active');
      expect(t).toContain('Next billing date');
      for (const item of PAID_INCLUDES) expect(t).toContain(item);
      expect(t).toContain('Manage Membership');
      expect(t).not.toContain('Try it free');
      expect(t).not.toContain('Explore Full Membership');
    }
  });

  it('omits the next billing date rather than invent one when none is stored', async () => {
    const t = text(
      await render(
        billing({
          tier: 'monthly',
          status: 'active',
          hasStripeCustomer: true,
          hasHadSubscription: true,
          currentPeriodEnd: null,
        }),
      ),
    );
    expect(t).not.toContain('Next billing date');
  });

  it('a member with no Stripe customer is not given a billing portal button that cannot work', async () => {
    const t = text(
      await render(billing({ tier: 'monthly', status: 'active', hasStripeCustomer: false })),
    );
    expect(t).not.toContain('Manage Membership');
    expect(t).toContain('please contact us');
  });
});

describe('MembershipPage — cancelled, access continues', () => {
  beforeEach(openMembership);

  it('says membership is ending, states the date, keeps full access and offers Resume Membership', async () => {
    const end = new Date(NOW + 40 * DAY);
    const t = text(
      await render(
        billing({
          tier: 'annual',
          status: 'active',
          cancelAtPeriodEnd: true,
          hasStripeCustomer: true,
          hasHadSubscription: true,
          currentPeriodEnd: end,
        }),
      ),
    );
    expect(t).toContain('Membership ending');
    expect(t).toContain(
      `Your membership remains active until ${end.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}.`,
    );
    expect(t).toContain('You keep full member access until then');
    expect(t).toContain('Your Membership Includes');
    expect(t).toContain('Resume Membership');
    expect(t).not.toContain('Membership ended');
  });
});

describe('MembershipPage — payment failure (grace)', () => {
  beforeEach(openMembership);

  it('calmly states the issue, that membership continues, the real grace end, and offers Update Payment Method', async () => {
    const t = text(
      await render(
        billing({
          tier: 'monthly',
          status: 'past_due',
          paymentFailedAt: new Date(NOW - 2 * DAY),
          hasStripeCustomer: true,
          hasHadSubscription: true,
        }),
      ),
    );
    expect(t).toContain('Payment issue');
    expect(t).toContain("We couldn't process your latest membership payment.");
    expect(t).toContain('Your membership remains active for now.');
    expect(t).toContain('Please update your payment method to keep uninterrupted access.');
    expect(t).toMatch(/Your access continues until .+ — 5 days remaining/);
    expect(t).toContain('Update Payment Method');
    expect(t).toContain('Your Membership Includes');
  });

  it('a renewal we could not confirm says so, is temporary, and shows the bounded end date', async () => {
    const end = new Date(NOW - 6 * 60 * 60 * 1000);
    const html = await render(
      billing({
        tier: 'monthly',
        status: 'active',
        hasStripeCustomer: true,
        hasHadSubscription: true,
        currentPeriodEnd: end,
        stripeUnreachable: true,
      }),
    );
    const t = text(html);
    expect(t).toContain("We're confirming your renewal.");
    expect(t).toContain('This is temporary.');
    expect(t).toContain('at the latest');
    expect(t).not.toContain("We couldn't process your latest membership payment.");
  });

  it('past the 7-day grace period it is shown as ended, with no payment warning', async () => {
    const t = text(
      await render(
        billing({
          tier: 'monthly',
          status: 'past_due',
          paymentFailedAt: new Date(NOW - 8 * DAY),
          hasStripeCustomer: true,
          hasHadSubscription: true,
        }),
      ),
    );
    expect(t).toContain('Membership ended');
    expect(t).not.toContain("We couldn't process your latest membership payment.");
  });
});

describe('MembershipPage — ended', () => {
  beforeEach(openMembership);

  const ended = () =>
    billing({
      tier: 'monthly',
      status: 'canceled',
      hasStripeCustomer: true,
      hasHadSubscription: true,
    });

  it('says the free account remains active and lists what is still available', async () => {
    const html = await render(ended());
    const t = text(html);
    // The free account really is open to them now, so the list links to it.
    expect(html).toContain('href="/dashboard"');
    expect(html).toContain('href="/dashboard/practices"');
    expect(t).toContain('Membership ended');
    expect(t).toContain('The free account remains active.');
    expect(t).toContain('Still Available');
    for (const item of [
      'Daily Check-In',
      'Selected Practices',
      'Selected Resources',
      '3 selected PowerDrops™',
    ]) {
      expect(t).toContain(item);
    }
    expect(t).not.toContain('Your Membership Includes');
  });

  it('offers a way back and a restart — and no second trial', async () => {
    const html = await render(ended());
    const t = text(html);
    expect(t).toContain('Return to the Regulation Suite');
    expect(html).toContain('href="/programs/regulation-suite"');
    expect(t).toContain('Start Membership');
    expect(t).not.toContain('Try it free');
    expect(t).not.toContain('free trial');
  });
});

describe('MembershipPage — returning from Stripe', () => {
  beforeEach(openMembership);

  it('before the webhook lands, does not claim the membership is active', async () => {
    const t = text(await render(billing({}), { success: 'true' }));
    expect(t).toContain('confirming your payment');
    expect(t).not.toContain('Your membership is now active');
  });

  describe('verifying the returning session with the server', () => {
    const SID = 'cs_test_a1B2c3D4e5F6';
    const paid = () =>
      billing({
        tier: 'monthly',
        status: 'active',
        hasStripeCustomer: true,
        hasHadSubscription: true,
        currentPeriodEnd: new Date(NOW + 30 * DAY),
      });

    beforeEach(() => mockReconcile.mockReset());

    it('hands the session id to the server-side check for THIS member only', async () => {
      mockReconcile.mockResolvedValue({ status: 'confirmed' });
      await render(paid(), { success: 'true', session_id: SID });
      expect(mockReconcile).toHaveBeenCalledWith({ userId: 'user-1', sessionId: SID });
    });

    it('does not verify anything without ?success, or without a session id', async () => {
      await render(billing({}), { session_id: SID });
      await render(billing({}), { success: 'true' });
      await render(billing({}), { canceled: 'true', session_id: SID });
      expect(mockReconcile).not.toHaveBeenCalled();
    });

    it('ignores a repeated ?session_id parameter (an array) rather than guessing', async () => {
      mockRequireAuthOrRedirect.mockResolvedValue({ id: 'user-1' });
      mockGetBillingState.mockResolvedValue(billing({}));
      await BillingPage({
        searchParams: Promise.resolve({ success: 'true', session_id: [SID, SID] }),
      });
      expect(mockReconcile).not.toHaveBeenCalled();
    });

    it('confirmed + a paid plan recorded: says the membership is active', async () => {
      mockReconcile.mockResolvedValue({ status: 'confirmed' });
      const t = text(await render(paid(), { success: 'true', session_id: SID }));
      expect(t).toContain('Your membership is now active');
    });

    it('a member in their free trial is never told they are a paying member by a redirect alone', async () => {
      mockReconcile.mockResolvedValue({ status: 'pending' });
      const t = text(
        await render(
          billing({
            tier: 'free',
            trialStartedAt: new Date(NOW - 5 * DAY),
            trialEndsAt: new Date(NOW + 25 * DAY),
          }),
          { success: 'true', session_id: SID },
        ),
      );
      expect(t).not.toContain('Your membership is now active');
      expect(t).toContain('confirming your payment');
    });

    it.each([
      ['pending', 'confirming your payment'],
      ['unavailable', 'confirming your payment'],
      ['expired', 'expired before payment'],
      ['review', 'check your membership by hand'],
      ['not_found', 'could not match that checkout'],
      ['invalid', 'could not match that checkout'],
    ])(
      'outcome %s: tells the truth and never claims an active membership',
      async (status, words) => {
        mockReconcile.mockResolvedValue({ status });
        const t = text(await render(billing({}), { success: 'true', session_id: SID }));
        expect(t).toContain(words);
        expect(t).not.toContain('Your membership is now active');
      },
    );

    it('never puts the session id on the page', async () => {
      mockReconcile.mockResolvedValue({ status: 'confirmed' });
      const html = await render(paid(), { success: 'true', session_id: SID });
      expect(html).not.toContain(SID);
    });
  });

  it('once the paid membership is recorded, confirms it', async () => {
    const t = text(
      await render(
        billing({
          tier: 'monthly',
          status: 'active',
          hasStripeCustomer: true,
          hasHadSubscription: true,
          currentPeriodEnd: new Date(NOW + 30 * DAY),
        }),
        { success: 'true' },
      ),
    );
    expect(t).toContain('Your membership is now active');
    expect(t).not.toContain('free trial has started'); // checkout never starts a trial
  });

  it('checkout cancelled: says nothing was charged', async () => {
    expect(text(await render(billing({}), { canceled: 'true' }))).toContain(
      'you have not been charged',
    );
  });
});

describe('MembershipPage — language', () => {
  beforeEach(openMembership);

  it('never promises refunds or makes treatment claims, in any state', async () => {
    const states = [
      billing({}),
      billing({
        tier: 'free',
        trialStartedAt: new Date(NOW - 29 * DAY),
        trialEndsAt: new Date(NOW + DAY),
      }),
      billing({ trialAvailable: true }),
      billing({
        tier: 'annual',
        status: 'active',
        hasStripeCustomer: true,
        currentPeriodEnd: new Date(NOW + DAY),
      }),
      billing({ tier: 'monthly', status: 'canceled', hasHadSubscription: true }),
    ];
    for (const state of states) {
      const t = text(await render(state)).toLowerCase();
      expect(t).not.toContain('refund');
      for (const claim of [
        /\bcure\b/,
        /heal trauma/,
        /fix your nervous system/,
        /eliminate anxiety/,
        /guarantee/,
      ]) {
        expect(t).not.toMatch(claim);
      }
    }
  });
});

describe('MembershipPage - plan preselection from ?plan=', () => {
  /** Whether the radio for `plan` is the selected one (attribute order is not fixed, so read the whole tag). */
  const checked = (html: string, plan: string) => {
    const tags = html.match(/<input[^>]*name="membership-plan"[^>]*>/g) ?? [];
    const tag = tags.find((t) => t.includes(`value="${plan}"`));
    return Boolean(tag && /\schecked(=|\s|\/|>)/.test(tag));
  };

  it('starts with the plan named in the link selected, without starting checkout', async () => {
    openMembership();
    const html = await render(billing({}), { plan: 'annual' });
    expect(checked(html, 'annual')).toBe(true);
    expect(checked(html, 'monthly')).toBe(false);
    expect(html).not.toContain('/api/');
  });

  it('falls back to monthly for anything that is not one of the two plans', async () => {
    openMembership();
    for (const plan of ['lifetime', 'ANNUAL', '', 'x']) {
      const html = await render(billing({}), { plan });
      expect(checked(html, 'monthly')).toBe(true);
      expect(checked(html, 'annual')).toBe(false);
    }
  });

  it('does not change what a member who already pays sees', async () => {
    openMembership();
    const html = await render(
      billing({
        tier: 'monthly',
        hasStripeCustomer: true,
        hasHadSubscription: true,
        currentPeriodEnd: new Date(NOW + 20 * DAY),
      }),
      { plan: 'annual' },
    );
    expect(html).not.toContain('name="membership-plan"');
  });
});
