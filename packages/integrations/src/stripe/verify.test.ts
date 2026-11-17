import Stripe from 'stripe';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));

import { StripeConfigError } from './config';
import { StripeWebhookVerificationError, verifyStripeWebhookEvent } from './verify';

/**
 * Webhook signature verification with the REAL Stripe SDK (no network): a
 * correctly signed payload is accepted; anything else - a tampered body, a
 * wrong secret, a missing or malformed header, a stale timestamp - is refused
 * before any event data can be used.
 */

const SECRET = 'whsec_test_secret_value_for_unit_tests_only';
const KEYS = ['STRIPE_SECRET_KEY', 'STRIPE_WEBHOOK_SECRET'];
const saved = Object.fromEntries(KEYS.map((k) => [k, process.env[k]]));

beforeEach(() => {
  process.env.STRIPE_SECRET_KEY = 'sk_test_unit';
  process.env.STRIPE_WEBHOOK_SECRET = SECRET;
});
afterEach(() => {
  for (const k of KEYS) {
    if (saved[k] === undefined) delete process.env[k];
    else process.env[k] = saved[k];
  }
});

const stripe = new Stripe('sk_test_unit');
const payload = JSON.stringify({
  id: 'evt_1',
  object: 'event',
  type: 'customer.subscription.updated',
  created: Math.floor(Date.now() / 1000),
  data: { object: { id: 'sub_1', customer: 'cus_1' } },
});
const sign = (body: string, secret = SECRET, timestamp?: number) =>
  stripe.webhooks.generateTestHeaderString({ payload: body, secret, timestamp });

describe('verifyStripeWebhookEvent', () => {
  it('accepts a correctly signed payload and returns the event', () => {
    const event = verifyStripeWebhookEvent(payload, sign(payload));
    expect(event.id).toBe('evt_1');
    expect(event.type).toBe('customer.subscription.updated');
  });

  it('refuses a payload altered after signing (untrusted data cannot grant an entitlement)', () => {
    const tampered = payload.replace('cus_1', 'cus_attacker');
    expect(() => verifyStripeWebhookEvent(tampered, sign(payload))).toThrow(
      StripeWebhookVerificationError,
    );
  });

  it('refuses a payload signed with a different secret', () => {
    expect(() => verifyStripeWebhookEvent(payload, sign(payload, 'whsec_someone_else'))).toThrow(
      StripeWebhookVerificationError,
    );
  });

  it('refuses a missing signature header', () => {
    expect(() => verifyStripeWebhookEvent(payload, null)).toThrow(StripeWebhookVerificationError);
  });

  it.each(['', 'garbage', 't=123', 'v1=abc'])('refuses a malformed header %j', (header) => {
    expect(() => verifyStripeWebhookEvent(payload, header)).toThrow(StripeWebhookVerificationError);
  });

  it('refuses a stale (replayed) signed payload outside the timestamp tolerance', () => {
    const old = Math.floor(Date.now() / 1000) - 3600;
    expect(() => verifyStripeWebhookEvent(payload, sign(payload, SECRET, old))).toThrow(
      StripeWebhookVerificationError,
    );
  });

  it('fails closed with a configuration error when the webhook secret is not set', () => {
    delete process.env.STRIPE_WEBHOOK_SECRET;
    expect(() => verifyStripeWebhookEvent(payload, sign(payload))).toThrow(StripeConfigError);
  });

  it('is deterministic about the raw body: re-serialised JSON no longer matches the signature', () => {
    const header = sign(payload);
    const reformatted = JSON.stringify(JSON.parse(payload), null, 2);
    expect(() => verifyStripeWebhookEvent(reformatted, header)).toThrow(
      StripeWebhookVerificationError,
    );
  });
});
