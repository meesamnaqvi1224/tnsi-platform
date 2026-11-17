import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { MembershipRecord } from '@tnsi/auth/authorize/entitlements';
import { resolveMembership } from '@tnsi/auth/authorize/entitlements';
import type Stripe from 'stripe';
import { createFakeDb } from './test-support/fake-trx';

vi.mock('@tnsi/db', () => ({
  db: {},
  entitlements: {
    userId: 'userId',
    stripeCustomerId: 'stripeCustomerId',
    paymentFailedAt: { name: 'payment_failed_at' },
    metadata: { name: 'metadata' },
  },
}));

const {
  reconcileMembership,
  resetReconcileState,
  RECONCILE_MIN_INTERVAL_MS,
  UNREACHABLE_MEMORY_MS,
} = await import('./reconcile-subscription');

/**
 * Errors shaped like the Stripe SDK's own (the SDK classifies by `error.type`;
 * the real classes are checked against that in @tnsi/integrations'
 * failure.test.ts). Constructed here because this app does not depend on the SDK.
 */
const stripeError = (type: string, extra: Record<string, unknown> = {}) =>
  Object.assign(new Error('stripe error'), { type, ...extra });
const DAY = 24 * 60 * 60 * 1000;
const NOW = new Date('2026-10-14T09:00:00.000Z');
const at = (ms: number) => new Date(NOW.getTime() + ms);

const KEYS = ['STRIPE_PRICE_ID_MONTHLY', 'STRIPE_PRICE_ID_ANNUAL'];
const saved = Object.fromEntries(KEYS.map((k) => [k, process.env[k]]));
beforeEach(() => {
  process.env.STRIPE_PRICE_ID_MONTHLY = 'price_m';
  process.env.STRIPE_PRICE_ID_ANNUAL = 'price_a';
  resetReconcileState();
});
afterEach(() => {
  for (const k of KEYS) {
    if (saved[k] === undefined) delete process.env[k];
    else process.env[k] = saved[k];
  }
});

/** A Stripe-backed monthly membership whose paid period ended 6 hours ago - an unconfirmed renewal. */
type Row = MembershipRecord & {
  userId: string;
  stripeCustomerId: string | null;
  stripeSyncedAt: Date | null;
} & Record<string, unknown>;
function staleRow(overrides: Partial<Row> = {}): Row {
  return {
    userId: 'user-1',
    tier: 'monthly',
    status: 'active',
    programs: [],
    certifications: [],
    features: [],
    stripeCustomerId: 'cus_1',
    stripeSubscriptionId: 'sub_1',
    currentPeriodEnd: at(-6 * 60 * 60 * 1000),
    stripeSyncedAt: null,
    ...overrides,
  } as unknown as Row;
}

const unix = (d: Date) => Math.floor(d.getTime() / 1000);
function subscription(overrides: Record<string, unknown> = {}): Stripe.Subscription {
  return {
    id: 'sub_1',
    customer: 'cus_1',
    status: 'active',
    cancel_at_period_end: false,
    current_period_start: unix(at(-6 * 60 * 60 * 1000)),
    current_period_end: unix(at(30 * DAY)),
    canceled_at: null,
    metadata: {},
    items: { data: [{ price: { id: 'price_m' } }] },
    ...overrides,
  } as unknown as Stripe.Subscription;
}

/** Runs a reconciliation of `row` with Stripe answering (or failing) as given. */
async function reconcile(
  row: Row,
  answer: { ok: Stripe.Subscription } | { fail: unknown },
  options: { now?: Date } = {},
) {
  const fake = createFakeDb([[row]]);
  const reader = {
    retrieveSubscription: vi.fn(async () => {
      if ('fail' in answer) throw answer.fail;
      return answer.ok;
    }),
  };
  const outcome = await reconcileMembership(
    { userId: row.userId, record: row },
    { reader, runTransaction: fake.runTransaction, now: () => options.now ?? NOW },
  );
  return { outcome, reader, writes: fake.state.committedSets };
}

describe('when no reconciliation is needed', () => {
  it.each([
    [
      'a Free account',
      staleRow({ tier: 'free', stripeSubscriptionId: null, stripeCustomerId: null }),
    ],
    ['a legacy Lifetime membership', staleRow({ tier: 'lifetime' })],
    [
      'a manual grant with no Stripe subscription',
      staleRow({ stripeSubscriptionId: null, stripeCustomerId: null }),
    ],
    ['a membership still inside its paid period', staleRow({ currentPeriodEnd: at(5 * DAY) })],
    ['a cancelled membership', staleRow({ status: 'canceled' })],
    [
      'a membership in payment grace',
      staleRow({ status: 'past_due', paymentFailedAt: at(-1 * DAY) }),
    ],
  ])('%s never calls Stripe', async (_label, row) => {
    const { outcome, reader } = await reconcile(row, { ok: subscription() });
    expect(outcome).toEqual({ status: 'not_needed' });
    expect(reader.retrieveSubscription).not.toHaveBeenCalled();
  });
});

describe('Stripe answers - its answer decides immediately, with no grace period', () => {
  it('confirmed renewal: the row is updated and access continues', async () => {
    const { outcome, writes, reader } = await reconcile(staleRow(), { ok: subscription() });
    expect(outcome).toEqual({ status: 'refreshed' });
    expect(reader.retrieveSubscription).toHaveBeenCalledTimes(1);
    expect(writes[0]).toMatchObject({ tier: 'monthly', status: 'active' });
    expect((writes[0]!.currentPeriodEnd as Date).getTime()).toBe(
      Math.floor(at(30 * DAY).getTime() / 1000) * 1000,
    );

    const refreshed = { ...staleRow(), ...writes[0] } as MembershipRecord;
    expect(resolveMembership(refreshed, NOW)).toMatchObject({
      state: 'active',
      hasPaidAccess: true,
    });
  });

  it('confirmed cancellation: the row is updated and access ends at once - no hold', async () => {
    const { outcome, writes } = await reconcile(staleRow(), {
      ok: subscription({ status: 'canceled', canceled_at: unix(at(-6 * 60 * 60 * 1000)) }),
    });
    expect(outcome).toEqual({ status: 'refreshed' });
    expect(writes[0]).toMatchObject({ status: 'canceled' });
    const refreshed = { ...staleRow(), ...writes[0] } as MembershipRecord;
    expect(resolveMembership(refreshed, NOW)).toMatchObject({
      state: 'inactive',
      hasPaidAccess: false,
    });
  });

  it('Stripe says the payment failed: the 7-day payment grace applies, not an outage hold', async () => {
    const { writes } = await reconcile(staleRow(), { ok: subscription({ status: 'past_due' }) });
    expect(writes[0]).toMatchObject({ status: 'past_due' });
    const refreshed = { ...staleRow(), ...writes[0], paymentFailedAt: NOW } as MembershipRecord;
    expect(resolveMembership(refreshed, NOW)).toMatchObject({
      state: 'grace',
      graceReason: 'payment_failed',
    });
  });

  it('Stripe still shows the old period (renewal not yet processed): access is not extended', async () => {
    const old = unix(at(-6 * 60 * 60 * 1000));
    const { writes } = await reconcile(staleRow(), {
      ok: subscription({ current_period_end: old }),
    });
    const refreshed = { ...staleRow(), ...writes[0] } as MembershipRecord;
    expect(resolveMembership(refreshed, NOW).hasPaidAccess).toBe(false);
  });
});

describe('throttling and sharing', () => {
  it('does not ask Stripe again within a minute of the last refresh', async () => {
    const row = staleRow({ stripeSyncedAt: at(-(RECONCILE_MIN_INTERVAL_MS - 1)) });
    const { outcome, reader } = await reconcile(row, { ok: subscription() });
    expect(outcome).toEqual({ status: 'recent' });
    expect(reader.retrieveSubscription).not.toHaveBeenCalled();
    // and it grants nothing by itself: the row is still an unconfirmed renewal
    expect(resolveMembership(row, NOW).hasPaidAccess).toBe(false);
  });

  it('asks again once the minute has passed', async () => {
    const row = staleRow({ stripeSyncedAt: at(-(RECONCILE_MIN_INTERVAL_MS + 1)) });
    const { outcome, reader } = await reconcile(row, { ok: subscription() });
    expect(outcome).toEqual({ status: 'refreshed' });
    expect(reader.retrieveSubscription).toHaveBeenCalledTimes(1);
  });

  it('concurrent calls for one subscription share a single Stripe request', async () => {
    const fake = createFakeDb([[staleRow()], [staleRow()]]);
    let release!: () => void;
    const gate = new Promise<void>((resolve) => (release = resolve));
    const reader = {
      retrieveSubscription: vi.fn(async () => {
        await gate;
        return subscription();
      }),
    };
    const call = () =>
      reconcileMembership(
        { userId: 'user-1', record: staleRow() },
        { reader, runTransaction: fake.runTransaction, now: () => NOW },
      );
    const first = call();
    const second = call();
    const third = call();
    release();
    const outcomes = await Promise.all([first, second, third]);
    expect(outcomes.map((o) => o.status)).toEqual(['refreshed', 'refreshed', 'refreshed']);
    expect(reader.retrieveSubscription).toHaveBeenCalledTimes(1);
  });
});

describe('Stripe genuinely unavailable - the only case that may hold access', () => {
  const outages: Array<[string, unknown]> = [
    ['a connection failure or timeout', stripeError('StripeConnectionError')],
    ['a Stripe server error', stripeError('StripeAPIError', { statusCode: 503 })],
    ['throttling', stripeError('StripeRateLimitError', { statusCode: 429 })],
  ];

  it.each(outages)('%s is reported as unreachable', async (_label, failure) => {
    const { outcome, writes } = await reconcile(staleRow(), { fail: failure });
    expect(outcome).toEqual({ status: 'unreachable' });
    expect(writes).toHaveLength(0); // nothing is written on an outage
  });

  it('holds access until seven days after the paid-through date, and no longer', async () => {
    const end = at(-6 * 60 * 60 * 1000);
    const row = staleRow({ currentPeriodEnd: end });
    const flagged = { ...row, stripeUnreachable: true } as MembershipRecord;

    expect(resolveMembership(flagged, NOW)).toMatchObject({
      state: 'grace',
      hasPaidAccess: true,
      graceReason: 'renewal_unconfirmed',
    });
    expect(resolveMembership(flagged, new Date(end.getTime() + 7 * DAY - 1)).hasPaidAccess).toBe(
      true,
    );
    expect(resolveMembership(flagged, new Date(end.getTime() + 7 * DAY)).hasPaidAccess).toBe(false);
  });

  it('with no valid paid-through date there is no hold, even in an outage: it fails closed', async () => {
    for (const currentPeriodEnd of [null, undefined, new Date('invalid')]) {
      const row = {
        ...staleRow({ currentPeriodEnd: currentPeriodEnd as never }),
        stripeUnreachable: true,
      };
      expect(resolveMembership(row as MembershipRecord, NOW).hasPaidAccess).toBe(false);
    }
  });

  it('remembers an outage briefly, so a burst of requests does not each retry Stripe', async () => {
    const failing = vi.fn().mockRejectedValue(outages[0]![1]);
    const fake = createFakeDb([[staleRow()], [staleRow()], [staleRow()]]);
    const deps = { reader: { retrieveSubscription: failing }, runTransaction: fake.runTransaction };
    const input = { userId: 'user-1', record: staleRow() };

    expect((await reconcileMembership(input, { ...deps, now: () => NOW })).status).toBe(
      'unreachable',
    );
    expect(
      (await reconcileMembership(input, { ...deps, now: () => at(UNREACHABLE_MEMORY_MS - 1) }))
        .status,
    ).toBe('unreachable');
    expect(failing).toHaveBeenCalledTimes(1);

    await reconcileMembership(input, { ...deps, now: () => at(UNREACHABLE_MEMORY_MS + 1) });
    expect(failing).toHaveBeenCalledTimes(2); // memory expired, tried again
  });

  it('is NOT assumed when no attempt was made: an unconfirmed renewal is not granted', () => {
    expect(resolveMembership(staleRow() as MembershipRecord, NOW).hasPaidAccess).toBe(false);
  });
});

describe('failures that are NOT outages never hold access', () => {
  it.each([
    ['an invalid Stripe API key', stripeError('StripeAuthenticationError', { statusCode: 401 })],
    ['a permission error', stripeError('StripePermissionError', { statusCode: 403 })],
    ['a generic error (e.g. a database failure)', new Error('boom')],
  ])('%s -> failed', async (_label, failure) => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    try {
      const { outcome } = await reconcile(staleRow(), { fail: failure });
      expect(outcome).toEqual({ status: 'failed' });
      // the record is not flagged unreachable, so nothing is held
      expect(resolveMembership(staleRow() as MembershipRecord, NOW).hasPaidAccess).toBe(false);
    } finally {
      spy.mockRestore();
    }
  });

  it('a subscription Stripe does not know (resource_missing) is a failure to confirm, not an outage', async () => {
    const missing = stripeError('StripeInvalidRequestError', {
      statusCode: 404,
      code: 'resource_missing',
    });
    const { outcome } = await reconcile(staleRow(), { fail: missing });
    expect(outcome).toEqual({ status: 'failed' });
  });

  it('an unrecognised price cannot be confirmed -> failed', async () => {
    const { outcome, writes } = await reconcile(staleRow(), {
      ok: subscription({ items: { data: [{ price: { id: 'price_unknown' } }] } }),
    });
    expect(outcome).toEqual({ status: 'failed' });
    expect(writes).toHaveLength(0);
  });

  it('a subscription belonging to another customer cannot be confirmed -> failed', async () => {
    const { outcome } = await reconcile(staleRow(), {
      ok: subscription({ customer: 'cus_other' }),
    });
    expect(outcome).toEqual({ status: 'failed' });
  });

  it('does not log anything sensitive when it fails', async () => {
    const logged: string[] = [];
    const spy = vi.spyOn(console, 'error').mockImplementation((...args: unknown[]) => {
      logged.push(JSON.stringify(args));
    });
    try {
      await reconcile(staleRow(), {
        fail: stripeError('StripeAuthenticationError', {
          statusCode: 401,
          message: 'bad key sk_live_SECRET for jane@example.com',
        }),
      });
      const text = logged.join('');
      expect(text).not.toContain('sk_live_SECRET');
      expect(text).not.toContain('jane@example.com');
    } finally {
      spy.mockRestore();
    }
  });
});

describe('legacy Lifetime is never affected', () => {
  it('a Lifetime row is not reconciled and keeps access however old its dates are', async () => {
    const row = staleRow({ tier: 'lifetime', currentPeriodEnd: at(-900 * DAY) });
    const { outcome, reader } = await reconcile(row, { ok: subscription() });
    expect(outcome).toEqual({ status: 'not_needed' });
    expect(reader.retrieveSubscription).not.toHaveBeenCalled();
    expect(
      resolveMembership({ ...row, stripeUnreachable: true } as MembershipRecord, NOW).hasPaidAccess,
    ).toBe(true);
  });
});
