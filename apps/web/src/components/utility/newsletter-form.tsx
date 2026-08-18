'use client';

import * as React from 'react';
import { buttonVariants, cn, Input, Text, ValidationMessage } from '@tnsi/ui';

export interface NewsletterFormProps {
  /** Prefixes the email field's id so two forms can coexist on one page without colliding. */
  idPrefix: string;
  submitLabel: string;
}

type Status = 'idle' | 'submitting' | 'success' | 'error';

interface NewsletterResponseBody {
  subscribed?: boolean;
  alreadySubscribed?: boolean;
  error?: string;
}

export function NewsletterForm({ idPrefix, submitLabel }: NewsletterFormProps) {
  const [email, setEmail] = React.useState('');
  const [status, setStatus] = React.useState<Status>('idle');
  const [message, setMessage] = React.useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus('submitting');
    setMessage(null);

    try {
      const response = await fetch('/api/newsletter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      const data = (await response.json().catch(() => null)) as NewsletterResponseBody | null;

      if (!response.ok || !data?.subscribed) {
        setStatus('error');
        setMessage(data?.error ?? 'Something went wrong. Please try again.');
        return;
      }

      setStatus('success');
      setMessage(data.alreadySubscribed ? 'You’re already subscribed.' : 'You’re subscribed.');
      setEmail('');
    } catch {
      setStatus('error');
      setMessage('Something went wrong. Please try again.');
    }
  }

  if (status === 'success') {
    return (
      <div className="flex min-h-11 w-full items-center justify-center">
        <Text className="text-foreground text-sm font-medium">{message}</Text>
      </div>
    );
  }

  const emailId = `${idPrefix}-email`;
  const errorId = `${idPrefix}-error`;

  return (
    <div className="flex w-full min-w-0 flex-col gap-(--space-sm)">
      <form
        onSubmit={handleSubmit}
        className="flex w-full min-w-0 flex-col gap-(--space-md) sm:flex-row sm:items-stretch"
        noValidate
      >
        <label htmlFor={emailId} className="sr-only">
          Email address
        </label>
        <Input
          id={emailId}
          name="email"
          type="email"
          required
          autoComplete="email"
          placeholder="your@email.com"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          disabled={status === 'submitting'}
          invalid={status === 'error'}
          aria-describedby={status === 'error' ? errorId : undefined}
          className="h-11 min-w-0 flex-1"
        />
        <button
          type="submit"
          disabled={status === 'submitting'}
          className={cn(
            buttonVariants({ variant: 'primary', size: 'lg' }),
            'w-full shrink-0 sm:w-auto',
            status === 'submitting' && 'opacity-70',
          )}
        >
          {status === 'submitting' ? 'Subscribing…' : submitLabel}
        </button>
      </form>

      {status === 'error' && message ? (
        <ValidationMessage id={errorId} tone="error">
          {message}
        </ValidationMessage>
      ) : null}
    </div>
  );
}
