import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { CheckoutSessionInfo } from '@tnsi/integrations';

/**
 * The checkout-return check, with Stripe and the database stood in. The point
 * is what is (and is not) allowed to lead to a membership write. How the write
 * itself behaves (locking, ordering, Lifetime) is proven against PostgreSQL in
 * stripe-sync.integration.test.ts.
 */

vi.mock('@tnsi/db', () => ({ db: {}, entitlements: {} }));
const refreshSubscription = vi.fn();
vi.mock('./sync-stripe-entitlement', () => ({
  readTimeSubscriptionReader: { retrieveSubscription: vi.fn() },
  refreshSubscription: (...args: unknown[]) => refreshSubscription(...args),
}));

const { reconcileCheckoutReturn } = await import('./reconcile-checkout-session');

const SID = 'cs_test_a1B2c3D4e5F6g7';
const USER = 'user-1';

function session(overrides: Partial<CheckoutSessionInfo> = {}): CheckoutSessionInfo {
  return {
    id: SID,
    status: 'complete',
    paymentStatus: 'paid',
    mode: 'subscription',
    customerId: 'cus_1',
    subscriptionId: 'sub_1',
    userId: USER,
    clientReferenceId: USER,
    tier: 'monthly',
    url: null,
    createdAt: new Date(),
    ...overrides,
  };
}

function deps(s: CheckoutSessionInfo | Error, customer: string | null = 'cus_1') {
  const retrieve = vi.fn(async () => {
    if (s instanceof Error) throw s;
    return s;
  });
  return {
    retrieve,
    deps: {
      sessions: { retrieve, listOpen: vi.fn(), listComplete: vi.fn(), expire: vi.fn() },
      customerOf: vi.fn(async () => customer),
    },
  };
}

beforeEach(() => {
  refreshSubscription.mockReset();
  refreshSubscription.mockResolvedValue({ status: 'synced', detail: 'ok' });
  vi.spyOn(console, 'error').mockImplementation(() => undefined);
});

describe('reconcileCheckoutReturn', () => {
  it('a completed, paid session of this member: reads the subscription from Stripe and records it', async () => {
    const d = deps(session());
    expect(await reconcileCheckoutReturn({ userId: USER, sessionId: SID }, d.deps)).toEqual({
      status: 'confirmed',
    });
    expect(refreshSubscription).toHaveBeenCalledTimes(1);
    expect(refreshSubscription.mock.calls[0]![0]).toEqual({
      action: 'refresh-subscription',
      subscriptionId: 'sub_1',
      stripeCustomerId: 'cus_1',
      userId: USER,
      eventTime: null,
    });
  });

  it('repeating the check is safe: every call asks Stripe afresh and records the same thing', async () => {
    const d = deps(session());
    const a = await reconcileCheckoutReturn({ userId: USER, sessionId: SID }, d.deps);
    const b = await reconcileCheckoutReturn({ userId: USER, sessionId: SID }, d.deps);
    expect(a).toEqual(b);
    expect(refreshSubscription).toHaveBeenCalledTimes(2);
    expect(refreshSubscription.mock.calls[0]![0]).toEqual(refreshSubscription.mock.calls[1]![0]);
  });

  it.each([
    'abc',
    '',
    'cs_test_',
    'cs_test_short',
    'sub_123456789012',
    'cs_live_ok; DROP TABLE x',
    `cs_test_${'a'.repeat(300)}`,
    '../../etc/passwd',
  ])('an implausible identifier %j never reaches Stripe', async (sessionId) => {
    const d = deps(session());
    expect(await reconcileCheckoutReturn({ userId: USER, sessionId }, d.deps)).toEqual({
      status: 'invalid',
    });
    expect(d.retrieve).not.toHaveBeenCalled();
    expect(refreshSubscription).not.toHaveBeenCalled();
  });

  it('a non-string identifier is invalid, not an error', async () => {
    const d = deps(session());
    const out = await reconcileCheckoutReturn(
      { userId: USER, sessionId: ['a', 'b'] as unknown as string },
      d.deps,
    );
    expect(out.status).toBe('invalid');
  });

  describe('ownership: someone else’s session is indistinguishable from an unknown one', () => {
    it.each([
      ['another member in metadata', { userId: 'user-2' }],
      ['another member as client reference', { clientReferenceId: 'user-2' }],
      ['no member in metadata (not created by us)', { userId: null }],
      ['another Stripe customer', { customerId: 'cus_other' }],
      ['no customer', { customerId: null }],
      ['a one-time payment session', { mode: 'payment' as const }],
    ])('%s', async (_label, overrides) => {
      const d = deps(session(overrides));
      expect(await reconcileCheckoutReturn({ userId: USER, sessionId: SID }, d.deps)).toEqual({
        status: 'not_found',
      });
      expect(refreshSubscription).not.toHaveBeenCalled();
    });

    it('a member with no Stripe customer cannot claim any session; Stripe is not even asked', async () => {
      const d = deps(session(), null);
      expect(await reconcileCheckoutReturn({ userId: USER, sessionId: SID }, d.deps)).toEqual({
        status: 'not_found',
      });
      expect(d.retrieve).not.toHaveBeenCalled();
    });

    it('trusts the customer in OUR database, never one supplied by the caller', async () => {
      const d = deps(session({ customerId: 'cus_attacker' }), 'cus_1');
      const out = await reconcileCheckoutReturn(
        { userId: USER, sessionId: SID, customerId: 'cus_attacker' } as never,
        d.deps,
      );
      expect(out.status).toBe('not_found');
    });

    it('an unknown session (resource_missing) is not_found', async () => {
      const d = deps(Object.assign(new Error('x'), { code: 'resource_missing' }));
      expect(await reconcileCheckoutReturn({ userId: USER, sessionId: SID }, d.deps)).toEqual({
        status: 'not_found',
      });
    });
  });

  describe('a redirect alone is not payment', () => {
    it.each([
      ['still open', { status: 'open' as const, paymentStatus: 'unpaid' as const }, 'pending'],
      [
        'complete but payment not cleared (asynchronous method)',
        { status: 'complete' as const, paymentStatus: 'unpaid' as const },
        'pending',
      ],
      ['complete but no subscription yet', { subscriptionId: null }, 'pending'],
      [
        'expired unpaid',
        { status: 'expired' as const, paymentStatus: 'unpaid' as const },
        'expired',
      ],
    ])('%s: nothing is recorded', async (_label, overrides, expected) => {
      const d = deps(session(overrides));
      expect(await reconcileCheckoutReturn({ userId: USER, sessionId: SID }, d.deps)).toEqual({
        status: expected,
      });
      expect(refreshSubscription).not.toHaveBeenCalled();
    });
  });

  describe('failure handling', () => {
    it('Stripe unreachable: nothing granted, no detail leaked', async () => {
      const d = deps(
        Object.assign(new Error('secret sk_test_zzz at 10.0.0.1'), {
          type: 'StripeConnectionError',
        }),
      );
      const out = await reconcileCheckoutReturn({ userId: USER, sessionId: SID }, d.deps);
      expect(out).toEqual({ status: 'unavailable' });
      expect(refreshSubscription).not.toHaveBeenCalled();
      const logged = JSON.stringify(
        (console.error as unknown as { mock: { calls: unknown[] } }).mock.calls,
      );
      expect(logged).not.toContain('sk_test_zzz');
      expect(logged).not.toContain('10.0.0.1');
    });

    it('the member lookup failing is unavailable, not a crash', async () => {
      const d = deps(session());
      d.deps.customerOf.mockRejectedValue(new Error('connection to host=db user=app password=pw'));
      expect(await reconcileCheckoutReturn({ userId: USER, sessionId: SID }, d.deps)).toEqual({
        status: 'unavailable',
      });
      expect(
        JSON.stringify((console.error as unknown as { mock: { calls: unknown[] } }).mock.calls),
      ).not.toContain('password');
    });

    it('recording failing (Stripe or database) is unavailable; the webhook will still record it', async () => {
      refreshSubscription.mockRejectedValue(new Error('boom'));
      const d = deps(session());
      expect(await reconcileCheckoutReturn({ userId: USER, sessionId: SID }, d.deps)).toEqual({
        status: 'unavailable',
      });
    });

    it('a subscription that cannot be applied (duplicate, protected Lifetime) is left for review', async () => {
      refreshSubscription.mockResolvedValue({ status: 'skipped', detail: 'duplicate' });
      const d = deps(session());
      expect(await reconcileCheckoutReturn({ userId: USER, sessionId: SID }, d.deps)).toEqual({
        status: 'review',
      });
    });
  });

  it('exposes no Stripe or subscription identifier in any outcome', async () => {
    const outcomes = [
      await reconcileCheckoutReturn({ userId: USER, sessionId: SID }, deps(session()).deps),
      await reconcileCheckoutReturn(
        { userId: USER, sessionId: SID },
        deps(session({ status: 'open' })).deps,
      ),
      await reconcileCheckoutReturn(
        { userId: USER, sessionId: SID },
        deps(session({ userId: 'x' })).deps,
      ),
    ];
    const json = JSON.stringify(outcomes);
    expect(json).not.toMatch(/sub_|cus_|cs_test/);
    for (const o of outcomes) expect(Object.keys(o)).toEqual(['status']);
  });
});
