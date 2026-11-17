import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

/**
 * The webhook route's own behaviour: nothing is processed unless the signature
 * verifies, failures answer 500 so Stripe retries, and logs never carry raw
 * error objects. Signature verification itself is tested with the real Stripe
 * SDK in @tnsi/integrations (verify.test.ts); the sync logic in
 * sync-stripe-entitlement tests and the PostgreSQL integration tests.
 */

class ConfigError extends Error {}
class VerificationError extends Error {}

const verify = vi.fn();
const syncStripeEvent = vi.fn();

vi.mock('@tnsi/integrations', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@tnsi/integrations')>()),
  StripeConfigError: ConfigError,
  StripeWebhookVerificationError: VerificationError,
  verifyStripeWebhookEvent: (...args: unknown[]) => verify(...args),
}));
vi.mock('@/lib/sync-stripe-entitlement', () => ({
  syncStripeEvent: (...args: unknown[]) => syncStripeEvent(...args),
}));

const { POST } = await import('./route');

const post = (body = '{"id":"evt_1"}', signature: string | null = 't=1,v1=abc') =>
  new NextRequest('http://x/api/webhooks/stripe', {
    method: 'POST',
    body,
    headers: signature ? { 'stripe-signature': signature } : {},
  });

let logged: string[];
beforeEach(() => {
  verify.mockReset();
  syncStripeEvent.mockReset();
  logged = [];
  for (const level of ['error', 'warn', 'info', 'log'] as const) {
    vi.spyOn(console, level).mockImplementation((...args: unknown[]) => {
      logged.push(JSON.stringify(args));
    });
  }
});

describe('POST /api/webhooks/stripe', () => {
  it('rejects an unverifiable request (400) and never looks at its contents', async () => {
    verify.mockImplementation(() => {
      throw new VerificationError('No signatures found');
    });
    const res = await POST(post('{"type":"checkout.session.completed","evil":true}'));
    expect(res.status).toBe(400);
    expect(syncStripeEvent).not.toHaveBeenCalled();
  });

  it('passes the RAW body and the signature header to verification', async () => {
    verify.mockReturnValue({ id: 'evt_1', type: 'x' });
    syncStripeEvent.mockResolvedValue({ action: 'skip', detail: 'ok' });
    await POST(post('{"raw":  "body"}', 't=1,v1=sig'));
    expect(verify).toHaveBeenCalledWith('{"raw":  "body"}', 't=1,v1=sig');
  });

  it('answers 500 when the webhook is not configured, processing nothing', async () => {
    verify.mockImplementation(() => {
      throw new ConfigError('not configured');
    });
    expect((await POST(post())).status).toBe(500);
    expect(syncStripeEvent).not.toHaveBeenCalled();
  });

  it('processes a verified event and acknowledges it', async () => {
    const event = { id: 'evt_1', type: 'customer.subscription.updated' };
    verify.mockReturnValue(event);
    syncStripeEvent.mockResolvedValue({ action: 'sync-subscription', detail: 'synced' });
    const res = await POST(post());
    expect(res.status).toBe(200);
    expect(syncStripeEvent).toHaveBeenCalledWith(event);
    expect(await res.json()).toMatchObject({ received: true, action: 'sync-subscription' });
  });

  it('answers 500 when processing fails, so Stripe redelivers (retry and recovery)', async () => {
    verify.mockReturnValue({ id: 'evt_1', type: 'customer.subscription.updated' });
    syncStripeEvent.mockRejectedValueOnce(new Error('database unavailable'));
    expect((await POST(post())).status).toBe(500);

    syncStripeEvent.mockResolvedValueOnce({ action: 'sync-subscription', detail: 'synced' });
    expect((await POST(post())).status).toBe(200); // the redelivery succeeds
  });

  it('never logs a raw error: only its class, code, status and request id', async () => {
    verify.mockReturnValue({ id: 'evt_1', type: 'customer.subscription.updated' });
    syncStripeEvent.mockRejectedValue(
      Object.assign(new Error('failed query: update ... params: cus_secret, member@example.com'), {
        code: '57P01',
      }),
    );
    await POST(post());
    const text = logged.join('\n');
    expect(text).toContain('57P01');
    expect(text).not.toContain('cus_secret');
    expect(text).not.toContain('member@example.com');
  });
});
