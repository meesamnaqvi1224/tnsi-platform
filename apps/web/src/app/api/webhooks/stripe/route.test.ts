import { beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * The Stripe webhook only acts on events whose signature verifies. An unsigned,
 * badly signed or unconfigured request must never reach entitlement sync.
 */
const verify = vi.fn();
vi.mock('@tnsi/integrations', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@tnsi/integrations')>();
  return { ...actual, verifyStripeWebhookEvent: (...a: unknown[]) => verify(...a) };
});

const syncStripeEvent = vi.fn();
vi.mock('@/lib/sync-stripe-entitlement', () => ({
  syncStripeEvent: (...a: unknown[]) => syncStripeEvent(...a),
}));

const { POST } = await import('./route');
const { StripeConfigError, StripeWebhookVerificationError } = await import('@tnsi/integrations');

function request(signature: string | null) {
  return new Request('http://x/api/webhooks/stripe', {
    method: 'POST',
    headers: signature ? { 'stripe-signature': signature } : {},
    body: '{"id":"evt_placeholder"}',
  }) as never;
}

beforeEach(() => {
  verify.mockReset();
  syncStripeEvent.mockReset();
  syncStripeEvent.mockResolvedValue({ action: 'skip' });
});

describe('POST /api/webhooks/stripe', () => {
  it('rejects a request whose signature does not verify, without syncing anything', async () => {
    verify.mockImplementation(() => {
      throw new StripeWebhookVerificationError('bad signature');
    });
    const response = await POST(request('t=1,v1=bad'));
    expect(response.status).toBe(400);
    expect(syncStripeEvent).not.toHaveBeenCalled();
  });

  it('rejects a request with no signature header', async () => {
    verify.mockImplementation(() => {
      throw new StripeWebhookVerificationError('missing signature');
    });
    const response = await POST(request(null));
    expect(response.status).toBe(400);
    expect(syncStripeEvent).not.toHaveBeenCalled();
  });

  it('fails closed, revealing nothing, when the webhook secret is not configured', async () => {
    verify.mockImplementation(() => {
      throw new StripeConfigError('set STRIPE_WEBHOOK_SECRET');
    });
    const response = await POST(request('t=1,v1=x'));
    expect(response.status).toBe(500);
    expect(JSON.stringify(await response.json())).not.toMatch(/STRIPE_|whsec_/);
    expect(syncStripeEvent).not.toHaveBeenCalled();
  });

  it('syncs only an event that verified', async () => {
    verify.mockReturnValue({ id: 'evt_placeholder', type: 'customer.subscription.updated' });
    const response = await POST(request('t=1,v1=good'));
    expect(response.status).toBe(200);
    expect(syncStripeEvent).toHaveBeenCalledTimes(1);
  });
});
