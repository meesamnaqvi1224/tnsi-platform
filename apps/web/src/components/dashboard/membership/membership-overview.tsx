import * as React from 'react';
import NextLink from 'next/link';
import { Alert, cn } from '@tnsi/ui';
import {
  MEMBERSHIP_ANNUAL_SAVING_PERCENT,
  MEMBERSHIP_FREE_POWERDROPS,
  MEMBERSHIP_PLANS,
  MEMBERSHIP_TRIAL_DAYS,
} from '@tnsi/integrations';
import {
  ManageBillingButton,
  MembershipCheckout,
  StartTrialButton,
  type MembershipPlanOption,
} from '@/components/dashboard/billing-actions';
import type { MembershipView } from '@/lib/membership-view';

/**
 * The member's Regulation Suite™ membership page — the body of
 * `/dashboard/billing`. It answers five questions, in this order:
 *   what membership do I have · what can I use · what would membership add ·
 *   what does it cost · how do I manage it.
 * It renders a `MembershipView` (see `@/lib/membership-view`) and nothing
 * else: no billing figure, date or count appears unless the stored billing
 * state supports it, and every billing action is a handoff to the existing
 * Stripe checkout / portal endpoints.
 */

const eyebrowClass = 'text-muted-foreground font-mono text-xs tracking-[0.25em] uppercase';
const sectionHeadingClass = eyebrowClass;
const bodyClass = 'text-muted-foreground max-w-[60ch] text-base leading-[1.8]';

/** A restrained bronze, derived from the brand's bronze accent the way the site's other editorial bands derive theirs. */
const bronzeStyle = {
  '--membership-bronze': 'color-mix(in oklch, var(--accent-bronze) 80%, var(--neutral-700))',
} as React.CSSProperties;

interface AccessItem {
  label: string;
  /** Present only where a real destination exists and the member can open it. */
  href?: string;
}

/**
 * What a free account includes. `Daily Check-In`, `Practices`, `Resources`
 * and the Regulation Suite™ page are real destinations on the website;
 * PowerDrops™ have no web library page today (they live in the app), so
 * they are listed without a link rather than pointing somewhere that does
 * not exist.
 */
const FREE_ACCESS: AccessItem[] = [
  { label: 'Daily Check-In', href: '/dashboard' },
  { label: 'Selected Practices', href: '/dashboard/practices' },
  { label: 'Selected Resources', href: '/resources' },
  { label: `${MEMBERSHIP_FREE_POWERDROPS} selected PowerDrops™` },
];

const EXPLORE_ITEM: AccessItem = {
  label: 'Explore Regulation Suite™',
  href: '/programs/regulation-suite',
};

/** The approved paid-membership contents, verbatim from Membership & Commercial Model v1. */
export const PAID_INCLUDES = [
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
] as const;

const CHECKOUT_PLANS: MembershipPlanOption[] = [
  {
    tier: 'monthly',
    label: MEMBERSHIP_PLANS.monthly.label,
    price: `${MEMBERSHIP_PLANS.monthly.price} / ${MEMBERSHIP_PLANS.monthly.interval}`,
  },
  {
    tier: 'annual',
    label: MEMBERSHIP_PLANS.annual.label,
    price: `${MEMBERSHIP_PLANS.annual.price} / ${MEMBERSHIP_PLANS.annual.interval}`,
    note: `Save approximately ${MEMBERSHIP_ANNUAL_SAVING_PERCENT}%`,
  },
];

function formatDate(date: Date): string {
  return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
}

function daysRemaining(days: number): string {
  return `${days} ${days === 1 ? 'day' : 'days'} remaining`;
}

function Rule() {
  return <div aria-hidden className="h-px w-10 bg-(--membership-bronze)" />;
}

function ItemList({
  items,
  columns = true,
  labelledBy,
}: {
  items: readonly AccessItem[];
  columns?: boolean;
  labelledBy: string;
}) {
  return (
    <ul
      aria-labelledby={labelledBy}
      className={cn(
        'border-foreground/15 m-0 list-none border-t p-0',
        columns && 'sm:grid sm:grid-cols-2 sm:gap-x-10',
      )}
    >
      {items.map((item) => (
        <li
          key={item.label}
          className="border-foreground/15 flex items-baseline gap-3 border-b py-3.5 text-base"
        >
          <span
            aria-hidden
            className="h-px w-3 shrink-0 -translate-y-[0.3em] bg-(--membership-bronze)"
          />
          {item.href ? (
            <NextLink
              href={item.href}
              className="text-foreground focus-visible:ring-ring rounded-sm underline-offset-4 hover:underline focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
            >
              {item.label}
            </NextLink>
          ) : (
            <span>{item.label}</span>
          )}
        </li>
      ))}
    </ul>
  );
}

function Details({ rows }: { rows: { term: string; value: string }[] }) {
  if (rows.length === 0) return null;
  return (
    <dl className="border-foreground/15 m-0 border-t">
      {rows.map((row) => (
        <div
          key={row.term}
          className="border-foreground/15 grid grid-cols-1 gap-x-8 gap-y-1 border-b py-3.5 sm:grid-cols-[11rem_1fr]"
        >
          <dt className={cn(eyebrowClass, 'sm:pt-1')}>{row.term}</dt>
          <dd className="m-0 text-base">{row.value}</dd>
        </div>
      ))}
    </dl>
  );
}

function detailRows(view: MembershipView): { term: string; value: string }[] {
  const rows: { term: string; value: string }[] = [];
  if (view.plan) {
    rows.push({
      term: 'Plan',
      value: view.plan.price ? `${view.plan.label} · ${view.plan.price}` : view.plan.label,
    });
  }
  if (view.billingStatus) rows.push({ term: 'Billing status', value: view.billingStatus });
  if (view.kind === 'trialing' && view.trialEndsAt) {
    rows.push({ term: 'Trial ends', value: formatDate(view.trialEndsAt) });
  }
  if (view.kind === 'active' && view.nextBillingDate) {
    rows.push({ term: 'Next billing date', value: formatDate(view.nextBillingDate) });
  }
  if (view.kind === 'ending' && view.accessEndsAt) {
    rows.push({ term: 'Access until', value: formatDate(view.accessEndsAt) });
  }
  if (view.kind === 'payment_issue' && view.graceEndsAt) {
    rows.push({ term: 'Access until', value: formatDate(view.graceEndsAt) });
  }
  return rows;
}

function Summary({ view }: { view: MembershipView }) {
  switch (view.kind) {
    case 'free':
      return view.trialExpired ? (
        <div className="flex flex-col gap-3">
          <p className="font-heading text-2xl leading-tight font-semibold tracking-tight">
            Your {MEMBERSHIP_TRIAL_DAYS}-day free trial has ended.
          </p>
          <p className={bodyClass}>
            Your account is a Free account again. Nothing has been charged, and nothing will be
            unless you choose a paid plan and complete checkout.
          </p>
        </div>
      ) : (
        <p className={bodyClass}>
          Explore the foundations of nervous-system support and discover what the Regulation Suite™
          has to offer.
        </p>
      );
    case 'trialing':
      return (
        <div className="flex flex-col gap-3">
          {view.trialDaysRemaining !== null ? (
            <p className="font-heading text-2xl leading-tight font-semibold tracking-tight">
              {daysRemaining(view.trialDaysRemaining)}
            </p>
          ) : null}
          <p className={bodyClass}>
            You have full member access during your {MEMBERSHIP_TRIAL_DAYS}-day free trial.
            {view.trialEndsAt ? ` It ends on ${formatDate(view.trialEndsAt)}.` : ''} No payment card
            is held and nothing is charged when it ends: your account simply returns to Free unless
            you choose a paid plan.
          </p>
        </div>
      );
    case 'active':
      return <p className={bodyClass}>Your Regulation Suite™ membership is active.</p>;
    case 'ending':
      return (
        <div className="flex flex-col gap-3">
          <p className="font-heading text-2xl leading-tight font-semibold tracking-tight">
            {view.accessEndsAt
              ? `Your membership remains active until ${formatDate(view.accessEndsAt)}.`
              : 'Your membership remains active until the end of your current billing period.'}
          </p>
          <p className={bodyClass}>
            You keep full member access until then. After that your membership will not renew.
          </p>
        </div>
      );
    case 'payment_issue':
      return view.graceReason === 'renewal_unconfirmed' ? (
        <div className="flex flex-col gap-3">
          <p className="font-heading text-2xl leading-tight font-semibold tracking-tight">
            We&apos;re confirming your renewal.
          </p>
          <p className={bodyClass}>
            We couldn&apos;t confirm your latest renewal with our payment provider just now, so we
            are keeping your membership active while we check. This is temporary.
            {view.graceEndsAt
              ? ` Your access continues until ${formatDate(view.graceEndsAt)} at the latest.`
              : ''}
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          <p className="font-heading text-2xl leading-tight font-semibold tracking-tight">
            We couldn&apos;t process your latest membership payment.
          </p>
          <p className={bodyClass}>
            Your membership remains active for now. Please update your payment method to keep
            uninterrupted access.
            {view.graceEndsAt
              ? ` Your access continues until ${formatDate(view.graceEndsAt)}${view.graceDaysRemaining !== null ? ` — ${daysRemaining(view.graceDaysRemaining)}` : ''}.`
              : ''}
          </p>
        </div>
      );
    case 'ended':
      return <p className={bodyClass}>The free account remains active.</p>;
  }
}

function ManageSection({ view }: { view: MembershipView }) {
  const label =
    view.kind === 'ending'
      ? 'Resume Membership'
      : view.kind === 'payment_issue'
        ? 'Update Payment Method'
        : 'Manage Membership';

  return (
    <section aria-labelledby="manage-heading" className="flex flex-col gap-6">
      <h2 id="manage-heading" className={sectionHeadingClass}>
        Manage
      </h2>
      {view.canManageBilling ? (
        <div className="flex flex-col gap-4">
          <ManageBillingButton label={label} variant="primary" />
          <p className="text-muted-foreground max-w-[60ch] text-sm leading-relaxed">
            Billing is handled securely by Stripe. Update your payment method, view invoices or
            change your plan from the billing portal. If you cancel, your access continues until the
            end of the period you have paid for.
          </p>
        </div>
      ) : (
        <p className="text-muted-foreground max-w-[60ch] text-sm leading-relaxed">
          This membership isn&apos;t billed through Stripe, so there is nothing to manage here. To
          make a change,{' '}
          <NextLink href="/contact" className="interaction-text-link-underline">
            please contact us
          </NextLink>
          .
        </p>
      )}
    </section>
  );
}

function UpgradeSection({
  view,
  membershipOpen,
}: {
  view: MembershipView;
  membershipOpen: boolean;
}) {
  const returning = view.kind === 'ended';
  const inTrial = view.kind === 'trialing';
  // Offered only when the SERVER says this account can start the trial (and
  // membership is open). Never inferred here, so no account is told a trial is
  // available when it is not.
  const offerTrial = view.trialAvailable && membershipOpen;

  return (
    <section aria-labelledby="upgrade-heading" className="flex flex-col gap-8">
      <div className="flex flex-col gap-4">
        <h2 id="upgrade-heading" className={sectionHeadingClass}>
          {returning
            ? 'Return to the Regulation Suite™'
            : inTrial
              ? 'Continue with a paid plan'
              : 'Explore Full Membership'}
        </h2>
        <p className="font-heading max-w-[28ch] text-3xl leading-[1.1] font-semibold tracking-tight sm:text-4xl">
          The complete Regulation Suite™ experience.
        </p>
        <p className={bodyClass}>
          Paid membership unlocks the whole Regulation Suite™: the full Practice Library and every
          PowerDrop™, with your practice history and progress kept alongside. It supports
          nervous-system regulation and sits alongside, never in place of, professional or clinical
          care.
        </p>
      </div>

      <div className="flex flex-col gap-4">
        <h3 id="unlock-heading" className={sectionHeadingClass}>
          Membership includes
        </h3>
        <ItemList labelledBy="unlock-heading" items={PAID_INCLUDES.map((label) => ({ label }))} />
      </div>

      {offerTrial ? (
        <div className="flex flex-col gap-4">
          <h3 className={sectionHeadingClass}>Try it free</h3>
          <p className={bodyClass}>
            Eligible accounts can start a {MEMBERSHIP_TRIAL_DAYS}-day free trial with full member
            access. No payment card is required, and nothing is charged when the trial ends — your
            account simply returns to Free unless you choose a paid plan below. One free trial is
            available per verified email address.
          </p>
          <StartTrialButton label={`Start your ${MEMBERSHIP_TRIAL_DAYS}-day free trial`} />
        </div>
      ) : null}

      <div className="flex flex-col gap-5">
        <h3 className={sectionHeadingClass}>Choose your plan</h3>
        <MembershipCheckout
          plans={CHECKOUT_PLANS}
          ctaLabel="Start Membership"
          unavailableReason={
            membershipOpen
              ? undefined
              : 'Regulation Suite™ membership is not open for enrolment yet.'
          }
        />
        <p className="text-muted-foreground max-w-[60ch] text-sm leading-relaxed">
          Paid membership begins when you choose a plan and complete checkout. If you cancel, your
          access continues until the end of the period you have paid for. Lifetime membership is
          unavailable for new purchases.
        </p>
      </div>

      {returning ? (
        <NextLink
          href="/programs/regulation-suite"
          className="interaction-text-link-underline w-fit text-base"
        >
          Return to the Regulation Suite
        </NextLink>
      ) : null}
    </section>
  );
}

export type CheckoutReturnStatus =
  'confirmed' | 'pending' | 'expired' | 'review' | 'unavailable' | 'not_found' | 'invalid';

/**
 * What to tell a member who has just come back from Stripe Checkout. Reaching
 * this page is not proof of payment, so the wording follows what the server
 * verified with Stripe and what the member's record now says - never the
 * redirect alone. (A member in their free trial also has paid-feature access,
 * so "paid" here means holding a paid plan.)
 */
function CheckoutReturnNotice({
  outcome,
  view,
}: {
  outcome?: CheckoutReturnStatus;
  view: MembershipView;
}) {
  const hasPaidPlan = view.plan !== null && view.hasPaidAccess;
  if (outcome === 'confirmed' || (outcome === undefined && hasPaidPlan)) {
    return hasPaidPlan ? (
      <Alert variant="success">Your membership is now active. Thank you.</Alert>
    ) : (
      <Alert variant="info">
        Thank you — your payment is confirmed and your membership is being set up. Refresh this page
        shortly.
      </Alert>
    );
  }
  if (outcome === 'expired') {
    return <Alert>That checkout expired before payment — you have not been charged.</Alert>;
  }
  if (outcome === 'review') {
    return (
      <Alert variant="info">
        We received your payment but need to check your membership by hand. Please do not pay again
        — contact us and we will sort it out.
      </Alert>
    );
  }
  if (outcome === 'not_found' || outcome === 'invalid') {
    return (
      <Alert>
        We could not match that checkout to your account. If you completed a payment, it will appear
        here once it is confirmed; you do not need to pay again.
      </Alert>
    );
  }
  // pending, unavailable, or no verification at all
  return (
    <Alert variant="info">
      Thank you — we are confirming your payment. Your membership starts as soon as it clears, which
      can take a moment. You do not need to pay again; refresh this page shortly.
    </Alert>
  );
}

export interface MembershipOverviewProps {
  view: MembershipView;
  membershipOpen: boolean;
  /** Returned from Stripe Checkout (`?success=true`). */
  checkoutSuccess?: boolean;
  /** What the server verified about the returning Checkout session (see `reconcileCheckoutReturn`). Absent when none was supplied. */
  checkoutOutcome?: CheckoutReturnStatus;
  /** Left Stripe Checkout without paying (`?canceled=true`). */
  checkoutCanceled?: boolean;
}

export function MembershipOverview({
  view,
  membershipOpen,
  checkoutSuccess = false,
  checkoutOutcome,
  checkoutCanceled = false,
}: MembershipOverviewProps) {
  const rows = detailRows(view);
  const isPaidState = view.hasPaidAccess;
  // A member in their free trial may choose a paid plan at any time (an explicit
  // checkout); a paying member manages their plan through the billing portal.
  const inTrial = view.kind === 'trialing' && view.plan === null;
  const showUpgrade = view.kind === 'free' || view.kind === 'ended' || inTrial;
  const actionFirst = view.kind === 'ending' || view.kind === 'payment_issue';

  return (
    <div style={bronzeStyle} className="flex flex-col gap-(--space-3xl)">
      <header className="flex flex-col gap-6">
        <p className={eyebrowClass}>Regulation Suite™</p>
        <h1 className="font-heading text-[2.5rem] leading-[1.02] font-semibold tracking-tight text-balance sm:text-6xl">
          {view.statusLabel}
        </h1>
        <Rule />
        <Summary view={view} />
      </header>

      {checkoutSuccess ? <CheckoutReturnNotice outcome={checkoutOutcome} view={view} /> : null}
      {checkoutCanceled ? <Alert>Checkout was canceled — you have not been charged.</Alert> : null}

      {rows.length > 0 ? <Details rows={rows} /> : null}

      {/* A cancelled renewal or a payment problem is the thing the member came to act on,
          so its action sits straight under the details instead of below the long list. */}
      {isPaidState && actionFirst ? <ManageSection view={view} /> : null}

      {view.kind === 'free' ? (
        <section aria-labelledby="access-heading" className="flex flex-col gap-4">
          <h2 id="access-heading" className={sectionHeadingClass}>
            Your Access
          </h2>
          <ItemList labelledBy="access-heading" items={[...FREE_ACCESS, EXPLORE_ITEM]} />
        </section>
      ) : null}

      {view.kind === 'ended' ? (
        <section aria-labelledby="available-heading" className="flex flex-col gap-4">
          <h2 id="available-heading" className={sectionHeadingClass}>
            Still Available
          </h2>
          <ItemList labelledBy="available-heading" items={FREE_ACCESS} />
        </section>
      ) : null}

      {isPaidState ? (
        <section aria-labelledby="includes-heading" className="flex flex-col gap-4">
          <h2 id="includes-heading" className={sectionHeadingClass}>
            Your Membership Includes
          </h2>
          <ItemList
            labelledBy="includes-heading"
            items={PAID_INCLUDES.map((label) => ({ label }))}
          />
        </section>
      ) : null}

      {isPaidState && !actionFirst ? <ManageSection view={view} /> : null}
      {showUpgrade ? <UpgradeSection view={view} membershipOpen={membershipOpen} /> : null}
    </div>
  );
}
