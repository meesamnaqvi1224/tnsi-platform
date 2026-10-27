'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { Alert, Button, cn, Stack } from '@tnsi/ui';
import type { PurchasableTier } from '@tnsi/integrations';

interface CheckoutResponseBody {
  data?: { url?: string };
  error?: { message?: string } | string;
}

type Status = 'idle' | 'redirecting' | 'error';

function errorMessage(body: CheckoutResponseBody | null): string {
  if (!body?.error) return 'Something went wrong. Please try again.';
  return typeof body.error === 'string'
    ? body.error
    : (body.error.message ?? 'Something went wrong. Please try again.');
}

/**
 * Posts to an existing `/api/v1/billing/*` endpoint and redirects the browser
 * to whatever URL Stripe returns. Never constructs a Stripe URL itself and
 * never sends anything beyond what the server already recognises — the
 * server resolves the real price and the real customer. If the server
 * answers anything other than a Stripe URL (billing not configured, already
 * a member, …) the member sees its message and nothing is pretended.
 */
function useStripeRedirect(endpoint: string, init: () => RequestInit) {
  const [status, setStatus] = React.useState<Status>('idle');
  const [message, setMessage] = React.useState<string | null>(null);

  const start = React.useCallback(async () => {
    setStatus('redirecting');
    setMessage(null);

    try {
      const response = await fetch(endpoint, { method: 'POST', ...init() });
      const body = (await response.json().catch(() => null)) as CheckoutResponseBody | null;

      if (!response.ok || !body?.data?.url) {
        setStatus('error');
        setMessage(errorMessage(body));
        return;
      }

      window.location.assign(body.data.url);
    } catch {
      setStatus('error');
      setMessage('Something went wrong. Please try again.');
    }
  }, [endpoint, init]);

  return { status, message, start };
}

export interface MembershipPlanOption {
  tier: Extract<PurchasableTier, 'monthly' | 'annual'>;
  /** "Monthly" / "Annual" */
  label: string;
  /** "£5.99 / month" */
  price: string;
  /** Optional second line, e.g. "Save approximately 17%". */
  note?: string;
}

/**
 * The plan choice and the primary checkout action. Two approved plans only,
 * as quiet radio rows (not cards); the call to action starts checkout for
 * whichever is selected via the existing `/api/v1/billing/checkout`
 * endpoint. When membership is not open the action is shown disabled with
 * the reason — it never calls the server and never pretends to succeed.
 */
export function MembershipCheckout({
  plans,
  defaultTier = 'monthly',
  ctaLabel,
  unavailableReason,
}: {
  plans: MembershipPlanOption[];
  defaultTier?: MembershipPlanOption['tier'];
  ctaLabel: string;
  /** When set, checkout is unavailable and this is shown in place of a working button. */
  unavailableReason?: string;
}) {
  const [tier, setTier] = React.useState<MembershipPlanOption['tier']>(defaultTier);
  const init = React.useCallback(
    () => ({
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tier }),
    }),
    [tier],
  );
  const { status, message, start } = useStripeRedirect('/api/v1/billing/checkout', init);
  const unavailable = Boolean(unavailableReason);
  const other = plans.find((plan) => plan.tier !== tier);

  return (
    <Stack gap="lg">
      <fieldset className="m-0 border-0 p-0" disabled={unavailable}>
        <legend className="sr-only">Choose a plan</legend>
        <div className="border-foreground/15 divide-foreground/15 divide-y border-y">
          {plans.map((plan) => {
            const selected = plan.tier === tier;
            return (
              <label
                key={plan.tier}
                className={cn(
                  'interaction-colors flex cursor-pointer items-baseline gap-4 py-4',
                  unavailable && 'cursor-not-allowed opacity-60',
                )}
              >
                <input
                  type="radio"
                  name="membership-plan"
                  value={plan.tier}
                  checked={selected}
                  onChange={() => setTier(plan.tier)}
                  className="accent-foreground size-4 shrink-0 translate-y-0.5"
                />
                <span className="flex flex-1 flex-wrap items-baseline justify-between gap-x-6 gap-y-1">
                  <span className="font-heading text-2xl leading-none font-semibold tracking-tight">
                    {plan.price}
                  </span>
                  <span className="text-muted-foreground text-sm">
                    {plan.label}
                    {plan.note ? ` · ${plan.note}` : ''}
                  </span>
                </span>
              </label>
            );
          })}
        </div>
      </fieldset>

      <Stack gap="sm" className="items-start">
        <Button
          type="button"
          size="lg"
          onClick={start}
          disabled={unavailable || status === 'redirecting'}
          aria-describedby={unavailable ? 'membership-unavailable' : undefined}
        >
          {status === 'redirecting' ? 'Redirecting…' : ctaLabel}
        </Button>
        {unavailable ? (
          <p id="membership-unavailable" className="text-muted-foreground text-sm leading-relaxed">
            {unavailableReason}
          </p>
        ) : other ? (
          <button
            type="button"
            onClick={() => setTier(other.tier)}
            className="interaction-text-link-underline text-muted-foreground text-sm"
          >
            Choose {other.label}
          </button>
        ) : null}
        {status === 'error' && message ? <Alert variant="destructive">{message}</Alert> : null}
      </Stack>
    </Stack>
  );
}

const NO_INIT = () => ({});

/**
 * Opens the Stripe Billing Portal — the one place a member updates a payment
 * method, resumes a cancelled renewal, views invoices or cancels. (The portal
 * configuration deliberately does not allow switching plans.) Only a handoff to `/api/v1/billing/portal`; no billing screen is
 * recreated here.
 */
export function ManageBillingButton({
  label = 'Manage billing',
  variant = 'outline',
}: {
  label?: string;
  variant?: 'primary' | 'outline';
}) {
  const { status, message, start } = useStripeRedirect('/api/v1/billing/portal', NO_INIT);

  return (
    <Stack gap="xs" className="items-start">
      <Button
        type="button"
        variant={variant}
        size="lg"
        onClick={start}
        disabled={status === 'redirecting'}
      >
        {status === 'redirecting' ? 'Redirecting…' : label}
      </Button>
      {status === 'error' && message ? <Alert variant="destructive">{message}</Alert> : null}
    </Stack>
  );
}

type TrialStatus = 'idle' | 'starting' | 'started' | 'error';

/** What the member is told when the server refuses or cannot start a trial. Never guesses: it shows the server's own reason. */
function trialErrorMessage(status: number, body: CheckoutResponseBody | null): string {
  if (status === 401) return 'Please sign in again to start your free trial.';
  if (status === 503) return 'Free trials are not available right now. Please try again later.';
  return errorMessage(body);
}

/**
 * Starts the member's one free trial - `POST /api/v1/billing/trial`. No card,
 * no payment, no Stripe: the server decides eligibility (and may refuse, for
 * instance if this email address has already had a trial) and this only
 * reports what it said. Nothing is pretended: success is shown only after the
 * server confirms, and the page is refreshed so it reflects the real state.
 */
export function StartTrialButton({ label }: { label: string }) {
  const router = useRouter();
  const [status, setStatus] = React.useState<TrialStatus>('idle');
  const [message, setMessage] = React.useState<string | null>(null);

  const start = React.useCallback(async () => {
    setStatus('starting');
    setMessage(null);
    try {
      const response = await fetch('/api/v1/billing/trial', { method: 'POST' });
      const body = (await response.json().catch(() => null)) as CheckoutResponseBody | null;
      if (!response.ok) {
        setStatus('error');
        setMessage(trialErrorMessage(response.status, body));
        return;
      }
      setStatus('started');
      router.refresh();
    } catch {
      setStatus('error');
      setMessage('Something went wrong. Please try again.');
    }
  }, [router]);

  return (
    <Stack gap="xs" className="items-start">
      <Button
        type="button"
        size="lg"
        variant="outline"
        onClick={start}
        disabled={status === 'starting' || status === 'started'}
      >
        {status === 'starting' ? 'Starting…' : label}
      </Button>
      {status === 'started' ? (
        <Alert variant="success">Your free trial has started. Thank you.</Alert>
      ) : null}
      {status === 'error' && message ? <Alert variant="destructive">{message}</Alert> : null}
    </Stack>
  );
}
