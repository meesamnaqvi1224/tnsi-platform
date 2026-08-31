'use client';

import * as React from 'react';
import { Alert, Button, Stack } from '@tnsi/ui';
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
 * Posts to the existing `/api/v1/billing/{checkout,portal}` endpoints and
 * redirects the browser to whatever URL Stripe returns. Never constructs a
 * Stripe URL itself and never sends anything beyond the tier name the
 * server already recognises — the server resolves the real price.
 */
export function SubscribeButton({ tier, label }: { tier: PurchasableTier; label: string }) {
  const [status, setStatus] = React.useState<Status>('idle');
  const [message, setMessage] = React.useState<string | null>(null);

  async function handleClick() {
    setStatus('redirecting');
    setMessage(null);

    try {
      const response = await fetch('/api/v1/billing/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tier }),
      });
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
  }

  return (
    <Stack gap="xs">
      <Button type="button" onClick={handleClick} disabled={status === 'redirecting'}>
        {status === 'redirecting' ? 'Redirecting…' : label}
      </Button>
      {status === 'error' && message ? <Alert variant="destructive">{message}</Alert> : null}
    </Stack>
  );
}

/** Opens the Stripe Billing Portal for self-service plan management (cancel, update payment method, invoices). */
export function ManageBillingButton() {
  const [status, setStatus] = React.useState<Status>('idle');
  const [message, setMessage] = React.useState<string | null>(null);

  async function handleClick() {
    setStatus('redirecting');
    setMessage(null);

    try {
      const response = await fetch('/api/v1/billing/portal', { method: 'POST' });
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
  }

  return (
    <Stack gap="xs">
      <Button
        type="button"
        variant="outline"
        onClick={handleClick}
        disabled={status === 'redirecting'}
      >
        {status === 'redirecting' ? 'Redirecting…' : 'Manage billing'}
      </Button>
      {status === 'error' && message ? <Alert variant="destructive">{message}</Alert> : null}
    </Stack>
  );
}
