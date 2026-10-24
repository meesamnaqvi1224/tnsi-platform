import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import type Stripe from 'stripe';

/**
 * Real-PostgreSQL integration tests for the Stripe webhook executor
 * (`syncStripeEvent` / `refreshSubscription`), read-time reconciliation and the
 * concurrent-checkout flow. Locking, rollback and ordering can only be proven
 * against a real database; the pure decisions and the mocked-database cases are
 * covered by the unit tests alongside.
 *
 * Stripe itself is simulated (`createStripeSim`): a controllable source of
 * "current subscription state", so the tests exercise exactly the property that
 * matters - the row always ends up reflecting Stripe's CURRENT state, whatever
 * order events arrive in. This proves our handling; it is not evidence of live
 * Stripe behaviour.
 *
 * SKIPPED unless `TNSI_TEST_DATABASE_URL` is set; never reads `DATABASE_URL`;
 * refuses the production host by content. The target must be an ISOLATED
 * database with migrations 0000-0011 applied:
 *
 *   TNSI_TEST_DATABASE_URL="<isolated database>" \
 *     pnpm --filter @tnsi/web exec vitest run src/lib/stripe-sync.integration.test.ts
 */

const PRODUCTION_DB_HOST = 'ep-damp-flower-ayp7i2gc';
const TEST_URL = process.env.TNSI_TEST_DATABASE_URL;
const RUN = `stripe-it-${Date.now()}`;
const DAY = 24 * 60 * 60 * 1000;

type Sim = ReturnType<typeof createStripeSim>;

function unix(date: Date) {
  return Math.floor(date.getTime() / 1000);
}

/** A controllable stand-in for Stripe's subscription API. */
function createStripeSim() {
  const subs = new Map<string, Record<string, unknown>>();
  let active = 0;
  let maxConcurrent = 0;
  let calls = 0;
  let failNext: unknown[] = [];

  return {
    set(id: string, customer: string, overrides: Record<string, unknown> = {}) {
      const now = Date.now();
      subs.set(id, {
        id,
        customer,
        status: 'active',
        cancel_at_period_end: false,
        current_period_start: unix(new Date(now - 5 * DAY)),
        current_period_end: unix(new Date(now + 25 * DAY)),
        canceled_at: null,
        metadata: {},
        items: { data: [{ price: { id: 'price_m' } }] },
        ...overrides,
      });
    },
    failNextWith(error: unknown) {
      failNext.push(error);
    },
    get calls() {
      return calls;
    },
    get maxConcurrent() {
      return maxConcurrent;
    },
    resetCounters() {
      calls = 0;
      maxConcurrent = 0;
      failNext = [];
    },
    reader: {
      async retrieveSubscription(id: string) {
        calls += 1;
        active += 1;
        maxConcurrent = Math.max(maxConcurrent, active);
        try {
          await new Promise((r) => setTimeout(r, 15)); // time for others to pile up if unserialised
          const failure = failNext.shift();
          if (failure) throw failure;
          const found = subs.get(id);
          if (!found) {
            throw Object.assign(new Error('missing'), {
              type: 'StripeInvalidRequestError',
              code: 'resource_missing',
            });
          }
          return structuredClone(found) as unknown as Stripe.Subscription;
        } finally {
          active -= 1;
        }
      },
    },
  };
}

describe.skipIf(!TEST_URL)('Stripe sync against a real database', () => {
  type Mods = {
    db: (typeof import('@tnsi/db'))['db'];
    users: (typeof import('@tnsi/db'))['users'];
    entitlements: (typeof import('@tnsi/db'))['entitlements'];
    eq: (typeof import('drizzle-orm'))['eq'];
    like: (typeof import('drizzle-orm'))['like'];
    syncStripeEvent: (typeof import('./sync-stripe-entitlement'))['syncStripeEvent'];
    reconcileMembership: (typeof import('./reconcile-subscription'))['reconcileMembership'];
    resetReconcileState: (typeof import('./reconcile-subscription'))['resetReconcileState'];
    startCheckout: (typeof import('./start-checkout'))['startCheckout'];
  };
  let m: Mods;
  let sim: Sim;
  const saved: Record<string, string | undefined> = {};

  beforeAll(async () => {
    if (TEST_URL!.includes(PRODUCTION_DB_HOST)) {
      throw new Error('Refusing to run against the production database.');
    }
    for (const k of ['DATABASE_URL', 'STRIPE_PRICE_ID_MONTHLY', 'STRIPE_PRICE_ID_ANNUAL']) {
      saved[k] = process.env[k];
    }
    process.env.DATABASE_URL = TEST_URL!;
    process.env.STRIPE_PRICE_ID_MONTHLY = 'price_m';
    process.env.STRIPE_PRICE_ID_ANNUAL = 'price_a';
    const dbModule = await import('@tnsi/db');
    const orm = await import('drizzle-orm');
    const sync = await import('./sync-stripe-entitlement');
    const reconcile = await import('./reconcile-subscription');
    const checkout = await import('./start-checkout');
    m = {
      db: dbModule.db,
      users: dbModule.users,
      entitlements: dbModule.entitlements,
      eq: orm.eq,
      like: orm.like,
      syncStripeEvent: sync.syncStripeEvent,
      reconcileMembership: reconcile.reconcileMembership,
      resetReconcileState: reconcile.resetReconcileState,
      startCheckout: checkout.startCheckout,
    };
  });

  afterAll(async () => {
    if (m) await m.db.delete(m.users).where(m.like(m.users.clerkUserId, `${RUN}%`)); // entitlements cascade
    for (const [k, v] of Object.entries(saved)) {
      if (v === undefined) delete process.env[k];
      else process.env[k] = v;
    }
  });

  beforeEach(() => {
    sim = createStripeSim();
    m?.resetReconcileState();
  });

  let counter = 0;
  async function newMember(overrides: Record<string, unknown> = {}) {
    counter += 1;
    const label = `m${counter}`;
    const [user] = await m.db
      .insert(m.users)
      .values({ clerkUserId: `${RUN}-${label}`, email: `${RUN}-${label}@example.test` })
      .returning({ id: m.users.id });
    const customer = `cus_${RUN}_${label}`;
    await m.db.insert(m.entitlements).values({
      userId: user!.id,
      stripeCustomerId: customer,
      ...overrides,
    } as never);
    return { userId: user!.id, customer, sub: `sub_${RUN}_${label}` };
  }

  const rowOf = async (userId: string) =>
    (await m.db.select().from(m.entitlements).where(m.eq(m.entitlements.userId, userId)))[0]!;

  function event(
    type: string,
    subId: string,
    customer: string,
    extra: Record<string, unknown> = {},
  ) {
    return {
      type,
      created: unix(new Date()),
      data: {
        object: { id: subId, customer, metadata: {}, status: 'active', ...extra },
      },
    } as unknown as Stripe.Event;
  }

  const sync = (e: Stripe.Event) => m.syncStripeEvent(e, { reader: sim.reader });

  describe('duplicate, replayed and out-of-order events', () => {
    it('a duplicate delivery changes nothing: the same event three times leaves the same row', async () => {
      const { userId, customer, sub } = await newMember();
      sim.set(sub, customer);
      const e = event('customer.subscription.updated', sub, customer);

      await sync(e);
      const once = await rowOf(userId);
      await sync(e);
      await sync(e);
      const thrice = await rowOf(userId);

      expect(once).toMatchObject({ tier: 'monthly', status: 'active', stripeSubscriptionId: sub });
      expect({ ...thrice, updatedAt: null, stripeSyncedAt: null }).toEqual({
        ...once,
        updatedAt: null,
        stripeSyncedAt: null,
      });
    });

    it('a stale event replayed after newer state cannot overwrite it: Stripe’s current state wins', async () => {
      const { userId, customer, sub } = await newMember();
      sim.set(sub, customer, { status: 'canceled', canceled_at: unix(new Date()) });
      // The delivered event is an OLD snapshot that still says "active".
      await sync(event('customer.subscription.updated', sub, customer, { status: 'active' }));
      expect((await rowOf(userId)).status).toBe('canceled');
    });

    it('events delivered out of order still end at Stripe’s current state', async () => {
      const { userId, customer, sub } = await newMember();
      const e1 = event('customer.subscription.updated', sub, customer, { status: 'past_due' });
      const e2 = event('customer.subscription.deleted', sub, customer, { status: 'canceled' });

      sim.set(sub, customer, { status: 'canceled', canceled_at: unix(new Date()) }); // the truth: ended
      await sync(e2); // newer event arrives first
      await sync(e1); // older event arrives late
      expect((await rowOf(userId)).status).toBe('canceled');
    });

    it('a recovered payment is not marked past due by a late payment_failed event', async () => {
      const { userId, customer, sub } = await newMember();
      sim.set(sub, customer, { status: 'active' }); // already recovered at Stripe
      await sync({
        type: 'invoice.payment_failed',
        created: unix(new Date()),
        data: { object: { customer, subscription: sub } },
      } as unknown as Stripe.Event);
      expect(await rowOf(userId)).toMatchObject({ status: 'active', paymentFailedAt: null });
    });
  });

  describe('the 7-day grace anchor against real SQL', () => {
    it('first failure wins; retries never restart it; recovery clears it; a new failure starts a new one', async () => {
      const { userId, customer, sub } = await newMember();
      const failedAt = (seconds: number) =>
        ({
          type: 'invoice.payment_failed',
          created: seconds,
          data: { object: { customer, subscription: sub } },
        }) as unknown as Stripe.Event;

      sim.set(sub, customer, { status: 'past_due' });
      await sync(failedAt(1_800_000_000));
      expect((await rowOf(userId)).paymentFailedAt?.getTime()).toBe(1_800_000_000_000);

      await sync(failedAt(1_800_100_000)); // a later retry
      expect((await rowOf(userId)).paymentFailedAt?.getTime()).toBe(1_800_000_000_000);

      sim.set(sub, customer, { status: 'active' });
      await sync(event('customer.subscription.updated', sub, customer));
      expect((await rowOf(userId)).paymentFailedAt).toBeNull();

      sim.set(sub, customer, { status: 'past_due' });
      await sync(failedAt(1_810_000_000));
      expect((await rowOf(userId)).paymentFailedAt?.getTime()).toBe(1_810_000_000_000);
    });
  });

  describe('concurrent processing', () => {
    it('serialises events for one member: Stripe is never read twice at once, and the last write is the newest state', async () => {
      const { userId, customer, sub } = await newMember();
      sim.set(sub, customer);
      sim.resetCounters();

      // Eight events race; Stripe's state moves on while they run.
      const events = Array.from({ length: 8 }, (_, i) =>
        sync(event('customer.subscription.updated', sub, customer, { n: i })).then(() => {
          if (i === 3)
            sim.set(sub, customer, { status: 'canceled', canceled_at: unix(new Date()) });
        }),
      );
      await Promise.all(events);
      // Whatever ran last read the final state, because reads are serialised by the row lock.
      await sync(event('customer.subscription.updated', sub, customer));

      expect(sim.maxConcurrent).toBe(1); // proof of serialisation: never two reads at once
      expect((await rowOf(userId)).status).toBe('canceled');
    });

    it('different members are not serialised against each other', async () => {
      const a = await newMember();
      const b = await newMember();
      sim.set(a.sub, a.customer);
      sim.set(b.sub, b.customer);
      sim.resetCounters();
      await Promise.all([
        sync(event('customer.subscription.updated', a.sub, a.customer)),
        sync(event('customer.subscription.updated', b.sub, b.customer)),
      ]);
      expect(sim.maxConcurrent).toBe(2);
    });
  });

  describe('failed transactions and recovery', () => {
    it('a Stripe outage rolls everything back, leaves the row untouched, and a retry succeeds', async () => {
      const { userId, customer, sub } = await newMember();
      sim.set(sub, customer);
      const before = await rowOf(userId);
      sim.failNextWith(Object.assign(new Error('down'), { type: 'StripeConnectionError' }));

      await expect(
        sync(event('customer.subscription.updated', sub, customer)),
      ).rejects.toBeTruthy();
      expect(await rowOf(userId)).toEqual(before); // no partial update

      const retry = await sync(event('customer.subscription.updated', sub, customer)); // Stripe's redelivery
      expect(retry.action).toBe('sync-subscription');
      expect(await rowOf(userId)).toMatchObject({ tier: 'monthly', status: 'active' });
    });

    it('a failure after the write (e.g. the commit) rolls the write back', async () => {
      const { userId, customer, sub } = await newMember();
      sim.set(sub, customer);
      const before = await rowOf(userId);

      await expect(
        m.syncStripeEvent(event('customer.subscription.updated', sub, customer), {
          reader: sim.reader,
          runTransaction: (fn) =>
            m.db.transaction(async (trx) => {
              await fn(trx);
              throw new Error('simulated failure at commit');
            }),
        }),
      ).rejects.toThrow('simulated failure at commit');

      expect(await rowOf(userId)).toEqual(before);
    });

    it('a subscription Stripe does not know is skipped, not retried forever', async () => {
      const { userId, customer } = await newMember();
      const before = await rowOf(userId);
      const result = await sync(event('customer.subscription.deleted', 'sub_unknown', customer));
      expect(result).toMatchObject({
        action: 'skip',
        detail: expect.stringContaining('not found'),
      });
      expect(await rowOf(userId)).toEqual(before);
    });
  });

  describe('legacy Lifetime is protected from every Stripe path', () => {
    it('subscription, payment-failed and one-time checkout events leave a Lifetime row exactly as it was', async () => {
      const { userId, customer, sub } = await newMember({ tier: 'lifetime', status: 'active' });
      sim.set(sub, customer, { status: 'canceled', canceled_at: unix(new Date()) });
      sim.resetCounters();
      const before = await rowOf(userId);

      const events = [
        event('customer.subscription.updated', sub, customer),
        event('customer.subscription.deleted', sub, customer, { status: 'canceled' }),
        {
          type: 'invoice.payment_failed',
          created: unix(new Date()),
          data: { object: { customer, subscription: sub } },
        } as unknown as Stripe.Event,
        {
          type: 'checkout.session.completed',
          created: unix(new Date()),
          data: {
            object: { mode: 'payment', customer, subscription: null, metadata: { userId } },
          },
        } as unknown as Stripe.Event,
      ];
      for (const e of events) expect((await sync(e)).action).toBe('skip');

      expect(await rowOf(userId)).toEqual(before);
      expect(await rowOf(userId)).toMatchObject({ tier: 'lifetime', status: 'active' });
      expect(sim.calls).toBe(0); // Stripe is not even asked about a Lifetime member
    });

    it('a one-time payment can never CREATE a Lifetime membership', async () => {
      const { userId, customer } = await newMember();
      const before = await rowOf(userId);
      const result = await sync({
        type: 'checkout.session.completed',
        created: unix(new Date()),
        data: { object: { mode: 'payment', customer, subscription: null, metadata: { userId } } },
      } as unknown as Stripe.Event);
      expect(result.action).toBe('skip');
      expect(await rowOf(userId)).toEqual(before);
      expect((await rowOf(userId)).tier).toBe('free');
    });

    it('reconciliation never touches a Lifetime row, however stale its dates', async () => {
      const { userId, customer, sub } = await newMember({
        tier: 'lifetime',
        status: 'active',
        stripeSubscriptionId: sub0(),
        currentPeriodEnd: new Date(Date.now() - 900 * DAY),
      });
      sim.set(sub0(), customer, { status: 'canceled' });
      const row = await rowOf(userId);
      const outcome = await m.reconcileMembership({ userId, record: row });
      expect(outcome.status).toBe('not_needed');
      expect(await rowOf(userId)).toEqual(row);
      void sub;
    });
  });

  function sub0() {
    return `sub_${RUN}_lt${counter}`;
  }

  describe('linking and duplicate subscriptions', () => {
    it('links a member to their Stripe customer from the checkout metadata when the event arrives first', async () => {
      const { userId } = await newMember({ stripeCustomerId: null });
      const customer = `cus_${RUN}_new${counter}`;
      const sub = `sub_${RUN}_new${counter}`;
      sim.set(sub, customer, { metadata: { userId } });

      const result = await sync(
        event('customer.subscription.created', sub, customer, { metadata: { userId } }),
      );
      expect(result.action).toBe('sync-subscription');
      expect(await rowOf(userId)).toMatchObject({
        stripeCustomerId: customer,
        stripeSubscriptionId: sub,
        tier: 'monthly',
      });
    });

    it('never moves a member who already has a different Stripe customer', async () => {
      const { userId, customer } = await newMember();
      const before = await rowOf(userId);
      const other = `cus_${RUN}_other${counter}`;
      const sub = `sub_${RUN}_other${counter}`;
      sim.set(sub, other, { metadata: { userId } });
      const result = await sync(
        event('customer.subscription.created', sub, other, { metadata: { userId } }),
      );
      expect(result.action).toBe('skip');
      expect(await rowOf(userId)).toEqual(before);
      expect((await rowOf(userId)).stripeCustomerId).toBe(customer);
    });

    it('a second LIVE subscription does not replace the first and is flagged for review', async () => {
      const { userId, customer, sub } = await newMember();
      sim.set(sub, customer);
      await sync(event('customer.subscription.created', sub, customer));

      const second = `${sub}_dup`;
      const third = `${sub}_dup2`;
      sim.set(second, customer);
      sim.set(third, customer);
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
      try {
        expect((await sync(event('customer.subscription.created', second, customer))).action).toBe(
          'skip',
        );
        await sync(event('customer.subscription.created', third, customer));
      } finally {
        warn.mockRestore();
      }

      const row = await rowOf(userId);
      expect(row.stripeSubscriptionId).toBe(sub);
      expect(row.metadata).toMatchObject({ duplicateStripeSubscriptions: [second, third] });
    });

    it('a new subscription replaces one that has genuinely ended', async () => {
      const { userId, customer, sub } = await newMember();
      sim.set(sub, customer);
      await sync(event('customer.subscription.created', sub, customer));
      sim.set(sub, customer, { status: 'canceled', canceled_at: unix(new Date()) });

      const next = `${sub}_resub`;
      sim.set(next, customer, { items: { data: [{ price: { id: 'price_a' } }] } });
      await sync(event('customer.subscription.created', next, customer));

      expect(await rowOf(userId)).toMatchObject({
        stripeSubscriptionId: next,
        tier: 'annual',
        status: 'active',
      });
    });

    it('syncs a brand-new subscription straight from checkout.session.completed', async () => {
      const { userId, customer, sub } = await newMember({ stripeCustomerId: null });
      const cus = `${customer}_c`;
      sim.set(sub, cus, { metadata: { userId } });
      const result = await sync({
        type: 'checkout.session.completed',
        created: unix(new Date()),
        data: {
          object: { mode: 'subscription', customer: cus, subscription: sub, metadata: { userId } },
        },
      } as unknown as Stripe.Event);
      expect(result.action).toBe('sync-subscription');
      expect(await rowOf(userId)).toMatchObject({ stripeCustomerId: cus, status: 'active' });
    });
  });

  describe('read-time reconciliation against the real row', () => {
    const staleEnd = () => new Date(Date.now() - 6 * 60 * 60 * 1000);

    it('a confirmed renewal updates the row; a second request within a minute does not ask Stripe again', async () => {
      const { userId, customer, sub } = await newMember({
        tier: 'monthly',
        status: 'active',
        stripeSubscriptionId: `sub_${RUN}_rc${counter + 1}`,
        currentPeriodEnd: staleEnd(),
      });
      const subscriptionId = (await rowOf(userId)).stripeSubscriptionId!;
      sim.set(subscriptionId, customer);
      void sub;
      sim.resetCounters();

      const first = await m.reconcileMembership(
        { userId, record: await rowOf(userId) },
        { reader: sim.reader },
      );
      expect(first.status).toBe('refreshed');
      const row = await rowOf(userId);
      expect(row.currentPeriodEnd!.getTime()).toBeGreaterThan(Date.now());
      expect(row.stripeSyncedAt).not.toBeNull();

      const second = await m.reconcileMembership({ userId, record: row }, { reader: sim.reader });
      expect(second.status).toBe('not_needed'); // the row is no longer stale
      expect(sim.calls).toBe(1);
    });

    it('a confirmed cancellation updates the row and ends access', async () => {
      const { userId, customer } = await newMember({
        tier: 'monthly',
        status: 'active',
        stripeSubscriptionId: `sub_${RUN}_cx${counter + 1}`,
        currentPeriodEnd: staleEnd(),
      });
      const subscriptionId = (await rowOf(userId)).stripeSubscriptionId!;
      sim.set(subscriptionId, customer, { status: 'canceled', canceled_at: unix(new Date()) });
      const outcome = await m.reconcileMembership(
        { userId, record: await rowOf(userId) },
        { reader: sim.reader },
      );
      expect(outcome.status).toBe('refreshed');
      expect((await rowOf(userId)).status).toBe('canceled');
    });

    it('a Stripe outage writes nothing and is reported as unreachable', async () => {
      const { userId, customer } = await newMember({
        tier: 'monthly',
        status: 'active',
        stripeSubscriptionId: `sub_${RUN}_ou${counter + 1}`,
        currentPeriodEnd: staleEnd(),
      });
      const subscriptionId = (await rowOf(userId)).stripeSubscriptionId!;
      sim.set(subscriptionId, customer);
      const before = await rowOf(userId);
      sim.failNextWith(
        Object.assign(new Error('down'), { type: 'StripeAPIError', statusCode: 503 }),
      );

      const outcome = await m.reconcileMembership(
        { userId, record: before },
        { reader: sim.reader },
      );
      expect(outcome.status).toBe('unreachable');
      expect(await rowOf(userId)).toEqual(before);
    });
  });

  describe('concurrent and repeated checkout', () => {
    /**
     * A stateful stand-in for Stripe Checkout Sessions: sessions are really
     * created, listed, expired and completed, so the tests can assert what
     * exists at Stripe at the end of a race, not just what was called.
     */
    function checkoutSim() {
      type S = {
        id: string;
        status: 'open' | 'complete' | 'expired';
        paymentStatus: 'paid' | 'unpaid';
        mode: 'subscription';
        customerId: string;
        subscriptionId: string | null;
        userId: string | null;
        clientReferenceId: string | null;
        tier: string;
        url: string | null;
        createdAt: Date;
      };
      const store = new Map<string, S>();
      const customers: string[] = [];
      let seq = 0;
      let listFailure: unknown = null;
      let expireFailsFor: { id: string; subscriptionId: string | null } | null = null;
      const stalePretendOpen = new Set<string>();
      const expired: string[] = [];
      const lag = () => new Promise((r) => setTimeout(r, 8));

      const sessions = {
        async listOpen(customerId: string) {
          await lag();
          if (listFailure) throw listFailure;
          return [...store.values()]
            .filter(
              (x) =>
                x.customerId === customerId && (x.status === 'open' || stalePretendOpen.has(x.id)),
            )
            .map((x) =>
              stalePretendOpen.has(x.id)
                ? { ...x, status: 'open' as const, url: `https://checkout.test/${x.id}` }
                : x,
            )
            .reverse();
        },
        async listComplete(customerId: string) {
          await lag();
          if (listFailure) throw listFailure;
          return [...store.values()]
            .filter((x) => x.customerId === customerId && x.status === 'complete')
            .reverse();
        },
        async retrieve(id: string) {
          await lag();
          const found = store.get(id);
          if (!found) throw Object.assign(new Error('missing'), { code: 'resource_missing' });
          return { ...found };
        },
        async expire(id: string) {
          await lag();
          const found = store.get(id)!;
          expired.push(id);
          if (expireFailsFor?.id === id) {
            found.status = 'complete'; // the member paid just as we tried to expire it
            found.paymentStatus = 'paid';
            found.subscriptionId = expireFailsFor.subscriptionId;
            throw new Error('session is not open');
          }
          if (found.status !== 'open') throw new Error('session is not open');
          found.status = 'expired';
          found.url = null;
        },
      };

      const deps = {
        ensureCustomer: vi.fn(async ({ userId }: { userId: string }) => {
          await new Promise((r) => setTimeout(r, 20));
          const id = `cus_created_${userId}_${customers.length}`;
          customers.push(id);
          return id;
        }),
        createSession: vi.fn(
          async (input: {
            tier: string;
            userId: string;
            stripeCustomerId: string;
            idempotencyKey: string;
          }) => {
            await lag();
            seq += 1;
            const id = `cs_test_${RUN}_${seq}`;
            store.set(id, {
              id,
              status: 'open',
              paymentStatus: 'unpaid',
              mode: 'subscription',
              customerId: input.stripeCustomerId,
              subscriptionId: null,
              userId: input.userId,
              clientReferenceId: input.userId,
              tier: input.tier,
              url: `https://checkout.test/${id}`,
              createdAt: new Date(),
            });
            return { url: `https://checkout.test/${id}`, sessionId: id };
          },
        ),
        sessions,
        reader: undefined as unknown,
      };

      return {
        customers,
        store,
        deps,
        open: () => [...store.values()].filter((x) => x.status === 'open'),
        /** The member paid: Stripe now shows a completed session and a live subscription. */
        complete(id: string, subscriptionId: string, paymentStatus: 'paid' | 'unpaid' = 'paid') {
          const found = store.get(id)!;
          found.status = 'complete';
          found.paymentStatus = paymentStatus;
          found.subscriptionId = subscriptionId;
          found.url = null;
        },
        failLists(error: unknown) {
          listFailure = error;
        },
        /** The member pays at the instant we try to expire this session. */
        expireTurnsIntoPayment(id: string, subscriptionId: string | null = null) {
          expireFailsFor = { id, subscriptionId };
        },
        /** `listOpen` still reports this (now completed) session as open: a stale list. */
        listsAsOpenWhileComplete(id: string) {
          stalePretendOpen.add(id);
        },
        expired,
        add(partial: Partial<S> & { customerId: string }) {
          seq += 1;
          const id = `cs_test_${RUN}_x${seq}`;
          store.set(id, {
            id,
            status: 'open',
            paymentStatus: 'unpaid',
            mode: 'subscription',
            subscriptionId: null,
            userId: null,
            clientReferenceId: null,
            tier: 'monthly',
            url: `https://checkout.test/${id}`,
            createdAt: new Date(),
            ...partial,
          });
          return id;
        },
      };
    }

    const request = (userId: string, tier: 'monthly' | 'annual' = 'monthly') => ({
      userId,
      userEmail: 'member@example.test',
      tier,
      successUrl: 'https://x/ok',
      cancelUrl: 'https://x/no',
    });
    const start = (
      cs: ReturnType<typeof checkoutSim>,
      userId: string,
      tier: 'monthly' | 'annual' = 'monthly',
    ) => m.startCheckout(request(userId, tier), { ...cs.deps, reader: sim.reader } as never);

    it('simultaneous requests for one plan create one customer and ONE session; the rest reuse it', async () => {
      const { userId } = await newMember({ stripeCustomerId: null });
      const cs = checkoutSim();

      const results = await Promise.all(Array.from({ length: 8 }, () => start(cs, userId)));

      expect(cs.customers).toHaveLength(1);
      expect((await rowOf(userId)).stripeCustomerId).toBe(cs.customers[0]);
      expect(cs.deps.createSession).toHaveBeenCalledTimes(1);
      expect(cs.open()).toHaveLength(1);
      expect(results.filter((r) => r.status === 'created')).toHaveLength(1);
      expect(results.filter((r) => r.status === 'reused')).toHaveLength(7);
      expect(new Set(results.map((r) => (r as { url: string }).url)).size).toBe(1);
    });

    it('repeated requests reuse the open session instead of creating another', async () => {
      const { userId } = await newMember();
      const cs = checkoutSim();
      const first = await start(cs, userId);
      const second = await start(cs, userId);
      expect(first.status).toBe('created');
      expect(second.status).toBe('reused');
      expect((second as { url: string }).url).toBe((first as { url: string }).url);
      expect(cs.deps.createSession).toHaveBeenCalledTimes(1);
    });

    it('simultaneous requests for DIFFERENT plans leave exactly one payable session', async () => {
      const { userId } = await newMember();
      const cs = checkoutSim();

      const results = await Promise.all(
        Array.from({ length: 10 }, (_, i) => start(cs, userId, i % 2 ? 'annual' : 'monthly')),
      );

      expect(results.every((r) => r.status === 'created' || r.status === 'reused')).toBe(true);
      // The invariant that matters: never two payable sessions at the end of the race.
      expect(cs.open()).toHaveLength(1);
      // And every other session that was created has been expired, not left payable.
      for (const s of cs.store.values()) expect(['open', 'expired']).toContain(s.status);
    });

    it('changing plan expires the earlier session first; changing back gets a fresh session', async () => {
      const { userId } = await newMember();
      const cs = checkoutSim();
      const monthly = (await start(cs, userId, 'monthly')) as { url: string };
      const annual = (await start(cs, userId, 'annual')) as { url: string };
      expect(annual.url).not.toBe(monthly.url);
      expect(cs.open().map((s) => s.tier)).toEqual(['annual']);

      const back = (await start(cs, userId, 'monthly')) as { status: string; url: string };
      expect(back.status).toBe('created');
      expect(back.url).not.toBe(monthly.url); // the expired one is never handed back
      expect(cs.open().map((s) => s.tier)).toEqual(['monthly']);
    });

    it('a checkout completed but not yet recorded blocks a second purchase and is recorded now', async () => {
      const { userId, customer, sub } = await newMember();
      const cs = checkoutSim();
      const created = (await start(cs, userId, 'monthly')) as { url: string };
      const sessionId = created.url.split('/').pop()!;
      cs.complete(sessionId, sub);
      sim.set(sub, customer);
      cs.deps.createSession.mockClear();

      const out = await start(cs, userId, 'annual');

      expect(out.status).toBe('already_a_member');
      expect(cs.deps.createSession).not.toHaveBeenCalled();
      const row = await rowOf(userId);
      expect(row.tier).toBe('monthly');
      expect(row.status).toBe('active');
      expect(row.stripeSubscriptionId).toBe(sub);
    });

    it('a completed checkout whose payment is still pending starts no second one', async () => {
      const { userId } = await newMember();
      const cs = checkoutSim();
      const created = (await start(cs, userId)) as { url: string };
      cs.complete(created.url.split('/').pop()!, `sub_${RUN}_async`, 'unpaid');
      cs.deps.createSession.mockClear();

      expect((await start(cs, userId, 'annual')).status).toBe('checkout_in_progress');
      expect(cs.deps.createSession).not.toHaveBeenCalled();
      const row = await rowOf(userId);
      expect(row.tier).toBe('free'); // nothing is granted until the payment clears
      expect(row.stripeSubscriptionId).toBeNull();
    });

    it('expired and abandoned sessions are ignored: a new one is created', async () => {
      const { userId, customer } = await newMember();
      const cs = checkoutSim();
      cs.add({
        customerId: customer,
        userId,
        clientReferenceId: userId,
        status: 'expired',
        url: null,
      });
      const out = await start(cs, userId);
      expect(out.status).toBe('created');
      expect(cs.open()).toHaveLength(1);
    });

    it('an old completed session is history, not a purchase waiting to be recorded', async () => {
      const { userId, customer } = await newMember();
      const cs = checkoutSim();
      cs.add({
        customerId: customer,
        userId,
        clientReferenceId: userId,
        status: 'complete',
        paymentStatus: 'paid',
        subscriptionId: `sub_${RUN}_old`,
        url: null,
        createdAt: new Date(Date.now() - 3 * DAY),
      });
      expect((await start(cs, userId)).status).toBe('created');
    });

    it('an expiry that races with a payment reconciles the earlier purchase before anything else', async () => {
      const { userId, customer, sub } = await newMember();
      const cs = checkoutSim();
      const monthly = (await start(cs, userId, 'monthly')) as { url: string };
      cs.expireTurnsIntoPayment(monthly.url.split('/').pop()!, sub);
      sim.set(sub, customer);
      cs.deps.createSession.mockClear();

      const out = await start(cs, userId, 'annual');

      expect(out.status).toBe('already_a_member'); // recorded, so no second purchase
      expect(cs.deps.createSession).not.toHaveBeenCalled();
      const row = await rowOf(userId);
      expect(row.tier).toBe('monthly');
      expect(row.stripeSubscriptionId).toBe(sub);
    });

    it('a racing payment that cannot be confirmed yet starts nothing new', async () => {
      const { userId } = await newMember();
      const cs = checkoutSim();
      const monthly = (await start(cs, userId, 'monthly')) as { url: string };
      cs.expireTurnsIntoPayment(monthly.url.split('/').pop()!, null); // no subscription visible yet
      cs.deps.createSession.mockClear();

      expect((await start(cs, userId, 'annual')).status).toBe('checkout_in_progress');
      expect(cs.deps.createSession).not.toHaveBeenCalled();
    });

    it('a paid session is NEVER expired, even when the open-session list is stale', async () => {
      const { userId, customer, sub } = await newMember();
      const cs = checkoutSim();
      const monthly = (await start(cs, userId, 'monthly')) as { url: string };
      const id = monthly.url.split('/').pop()!;
      cs.complete(id, sub);
      sim.set(sub, customer);
      cs.listsAsOpenWhileComplete(id);
      // Make the "recently completed" lookback miss it, so only the stale open list shows it.
      cs.store.get(id)!.createdAt = new Date(Date.now() - 3 * DAY);

      const out = await start(cs, userId, 'annual');

      expect(cs.expired).not.toContain(id); // expire was never even attempted
      expect(cs.store.get(id)!.status).toBe('complete');
      expect(out.status).toBe('already_a_member');
    });

    it('an unpaid open session of this member is expired only after Stripe confirms it is open', async () => {
      const { userId } = await newMember();
      const cs = checkoutSim();
      const monthly = (await start(cs, userId, 'monthly')) as { url: string };
      const id = monthly.url.split('/').pop()!;
      const retrieve = vi.spyOn(cs.deps.sessions, 'retrieve');

      await start(cs, userId, 'annual');

      expect(retrieve).toHaveBeenCalledWith(id);
      expect(cs.expired).toEqual([id]);
    });

    it('a second live subscription pauses further checkout for that member (manual review)', async () => {
      const { userId } = await newMember({
        metadata: { duplicateStripeSubscriptions: ['sub_dup'] },
      });
      const cs = checkoutSim();
      const calls = [
        vi.spyOn(cs.deps.sessions, 'listOpen'),
        vi.spyOn(cs.deps.sessions, 'listComplete'),
      ];
      expect((await start(cs, userId)).status).toBe('review_required');
      expect(cs.deps.createSession).not.toHaveBeenCalled();
      expect(cs.deps.ensureCustomer).not.toHaveBeenCalled();
      for (const c of calls) expect(c).not.toHaveBeenCalled();
    });

    it('each new session gets its own idempotency key; a reused one makes no creation call at all', async () => {
      const { userId } = await newMember();
      const cs = checkoutSim();
      await start(cs, userId, 'monthly');
      await start(cs, userId, 'monthly'); // reuse: no creation
      await start(cs, userId, 'annual');
      await start(cs, userId, 'monthly');
      const keys = cs.deps.createSession.mock.calls.map(
        (c) => (c[0] as { idempotencyKey: string }).idempotencyKey,
      );
      expect(keys).toHaveLength(3); // monthly, annual, monthly-again - not the reuse
      expect(new Set(keys).size).toBe(3);
      for (const k of keys) expect(k).toContain(`tnsi-checkout:${userId}:`);
    });

    it('never reads, expires or modifies a session that is not this member’s', async () => {
      const { userId, customer } = await newMember();
      const cs = checkoutSim();
      const stranger = cs.add({ customerId: customer, userId: 'someone-else', tier: 'monthly' });
      const unlabelled = cs.add({ customerId: customer, userId: null, tier: 'monthly' });
      // A different plan from theirs, so any "expire the others" logic would reach them.
      expect((await start(cs, userId, 'annual')).status).toBe('created');
      expect(cs.store.get(stranger)!.status).toBe('open');
      expect(cs.store.get(unlabelled)!.status).toBe('open');
      expect(cs.expired).toEqual([]);
    });

    it('fails closed when Stripe cannot be read: nothing is created', async () => {
      const { userId } = await newMember();
      const cs = checkoutSim();
      cs.failLists(Object.assign(new Error('down'), { type: 'StripeConnectionError' }));
      await expect(start(cs, userId)).rejects.toThrow();
      expect(cs.deps.createSession).not.toHaveBeenCalled();
      expect(cs.store.size).toBe(0);
    });

    it('simultaneous checkout and webhook for one member serialise: the member ends up with one subscription', async () => {
      const { userId, customer, sub } = await newMember();
      const cs = checkoutSim();
      const created = (await start(cs, userId)) as { url: string };
      cs.complete(created.url.split('/').pop()!, sub);
      sim.set(sub, customer);

      const results = await Promise.all([
        start(cs, userId, 'annual'),
        sync(event('customer.subscription.created', sub, customer)),
        start(cs, userId, 'monthly'),
        sync(event('customer.subscription.updated', sub, customer)),
      ]);

      expect(results[0]).toMatchObject({ status: 'already_a_member' });
      expect(results[2]).toMatchObject({ status: 'already_a_member' });
      const row = await rowOf(userId);
      expect(row.stripeSubscriptionId).toBe(sub);
      expect(row.tier).toBe('monthly');
      expect(cs.open()).toHaveLength(0);
    });

    it('a member who already has paid access is refused, with no Stripe call at all', async () => {
      const { userId } = await newMember({
        tier: 'monthly',
        status: 'active',
        stripeSubscriptionId: `sub_${RUN}_paid${counter + 1}`,
        currentPeriodEnd: new Date(Date.now() + 10 * DAY),
      });
      const cs = checkoutSim();
      const listOpen = vi.spyOn(cs.deps.sessions, 'listOpen');
      expect((await start(cs, userId)).status).toBe('already_a_member');
      expect(cs.deps.createSession).not.toHaveBeenCalled();
      expect(cs.deps.ensureCustomer).not.toHaveBeenCalled();
      expect(listOpen).not.toHaveBeenCalled();
    });

    it('an existing Lifetime member is never sent through a purchase flow and is never touched', async () => {
      const { userId } = await newMember({ tier: 'lifetime', status: 'active' });
      const before = await rowOf(userId);
      const cs = checkoutSim();
      const calls = vi.spyOn(cs.deps.sessions, 'listComplete');
      expect((await start(cs, userId, 'annual')).status).toBe('already_a_member');
      expect(cs.deps.createSession).not.toHaveBeenCalled();
      expect(calls).not.toHaveBeenCalled();
      expect(await rowOf(userId)).toEqual(before);
    });

    it('a member in their free trial may choose a paid plan: the trial is not a subscription', async () => {
      const { userId } = await newMember({
        tier: 'free',
        trialStartedAt: new Date(Date.now() - 5 * DAY),
        trialEndsAt: new Date(Date.now() + 25 * DAY),
      });
      const before = await rowOf(userId);
      const cs = checkoutSim();
      expect((await start(cs, userId)).status).toBe('created');
      // Starting a checkout charges nothing and changes nothing: only a completed
      // payment, recorded from Stripe, can change the tier.
      const after = await rowOf(userId);
      expect(after.tier).toBe('free');
      expect(after.trialEndsAt).toEqual(before.trialEndsAt);
      expect(after.stripeSubscriptionId).toBeNull();
    });

    it('a legacy Stripe-run trial (a subscription) is still refused a second subscription', async () => {
      const { userId } = await newMember({
        tier: 'monthly',
        status: 'trialing',
        stripeSubscriptionId: `sub_${RUN}_lt_trial${counter + 1}`,
        currentPeriodEnd: new Date(Date.now() + 10 * DAY),
      });
      expect((await start(checkoutSim(), userId)).status).toBe('already_a_member');
    });

    it('a member with an ended membership can start again', async () => {
      const { userId } = await newMember({ tier: 'monthly', status: 'canceled' });
      expect((await start(checkoutSim(), userId)).status).toBe('created');
    });

    it('a failure creating the session rolls back the saved customer, so a retry starts clean', async () => {
      const { userId } = await newMember({ stripeCustomerId: null });
      const cs = checkoutSim();
      cs.deps.createSession.mockRejectedValueOnce(new Error('Stripe is down'));

      await expect(start(cs, userId)).rejects.toThrow();
      expect((await rowOf(userId)).stripeCustomerId).toBeNull();

      expect((await start(cs, userId)).status).toBe('created'); // the retry works
      expect(cs.open()).toHaveLength(1);
    });

    it('only subscription sessions are ever created: no Lifetime, no one-time, no trial', async () => {
      const { userId } = await newMember();
      const cs = checkoutSim();
      await start(cs, userId, 'monthly');
      await start(cs, userId, 'annual');
      expect([...cs.store.values()].every((x) => x.mode === 'subscription')).toBe(true);
      expect([...cs.store.values()].every((x) => x.tier === 'monthly' || x.tier === 'annual')).toBe(
        true,
      );
    });
  });

  describe('returning from checkout (success-page reconciliation)', () => {
    type Gateway = Parameters<
      (typeof import('./reconcile-checkout-session'))['reconcileCheckoutReturn']
    >[1];
    let reconcileCheckoutReturn: (typeof import('./reconcile-checkout-session'))['reconcileCheckoutReturn'];

    beforeAll(async () => {
      reconcileCheckoutReturn = (await import('./reconcile-checkout-session'))
        .reconcileCheckoutReturn;
    });

    const SID = 'cs_test_Return123456';
    function gateway(overrides: Record<string, unknown> = {}) {
      return {
        retrieve: vi.fn(async () => ({
          id: SID,
          status: 'complete',
          paymentStatus: 'paid',
          mode: 'subscription',
          customerId: null as string | null,
          subscriptionId: null as string | null,
          userId: null as string | null,
          clientReferenceId: null as string | null,
          tier: 'monthly',
          url: null,
          createdAt: new Date(),
          ...overrides,
        })),
        listOpen: vi.fn(),
        listComplete: vi.fn(),
        expire: vi.fn(),
      };
    }
    const check = (userId: string, g: ReturnType<typeof gateway>) =>
      reconcileCheckoutReturn({ userId, sessionId: SID }, {
        sessions: g,
        sync: { reader: sim.reader },
      } as Gateway);

    it('a paid session of this member records Stripe’s current subscription state', async () => {
      const { userId, customer, sub } = await newMember();
      sim.set(sub, customer);
      const g = gateway({
        customerId: customer,
        subscriptionId: sub,
        userId,
        clientReferenceId: userId,
      });

      expect(await check(userId, g)).toEqual({ status: 'confirmed' });
      const row = await rowOf(userId);
      expect(row.tier).toBe('monthly');
      expect(row.status).toBe('active');
      expect(row.stripeSubscriptionId).toBe(sub);
    });

    it('repeating it, or racing it against the webhook, changes nothing further', async () => {
      const { userId, customer, sub } = await newMember();
      sim.set(sub, customer);
      const g = gateway({
        customerId: customer,
        subscriptionId: sub,
        userId,
        clientReferenceId: userId,
      });

      await Promise.all([
        check(userId, g),
        sync(event('customer.subscription.created', sub, customer)),
        check(userId, g),
        sync(event('checkout.session.completed', sub, customer)),
      ]);
      const once = await rowOf(userId);
      await check(userId, g);
      await sync(event('customer.subscription.updated', sub, customer));
      const again = await rowOf(userId);

      expect(once.tier).toBe('monthly');
      expect(sim.maxConcurrent).toBe(1); // serialised by the member's row lock
      expect({ ...again, updatedAt: null, stripeSyncedAt: null }).toEqual({
        ...once,
        updatedAt: null,
        stripeSyncedAt: null,
      });
    });

    it('cannot overwrite newer state: a cancellation Stripe already reports wins over the return', async () => {
      const { userId, customer, sub } = await newMember();
      // The subscription was bought and has since been cancelled at Stripe.
      sim.set(sub, customer, { status: 'canceled', canceled_at: unix(new Date()) });
      const g = gateway({
        customerId: customer,
        subscriptionId: sub,
        userId,
        clientReferenceId: userId,
      });

      await check(userId, g);
      const row = await rowOf(userId);
      expect(row.status).toBe('canceled'); // Stripe's current state, not "it was paid once"
    });

    it('another member’s session grants nothing and changes nothing', async () => {
      const victim = await newMember();
      const attacker = await newMember();
      sim.set(victim.sub, victim.customer);
      const before = await rowOf(attacker.userId);
      const g = gateway({
        customerId: victim.customer,
        subscriptionId: victim.sub,
        userId: victim.userId,
        clientReferenceId: victim.userId,
      });

      expect(await check(attacker.userId, g)).toEqual({ status: 'not_found' });
      expect(await rowOf(attacker.userId)).toEqual(before);
      expect((await rowOf(victim.userId)).tier).toBe('free'); // and the victim is untouched too
    });

    it('a pending payment grants nothing', async () => {
      const { userId, customer, sub } = await newMember();
      sim.set(sub, customer);
      const before = await rowOf(userId);
      const g = gateway({
        paymentStatus: 'unpaid',
        customerId: customer,
        subscriptionId: sub,
        userId,
        clientReferenceId: userId,
      });
      expect(await check(userId, g)).toEqual({ status: 'pending' });
      expect(await rowOf(userId)).toEqual(before);
    });

    it('a failed payment (session expired unpaid) grants nothing', async () => {
      const { userId, customer } = await newMember();
      const before = await rowOf(userId);
      const g = gateway({
        status: 'expired',
        paymentStatus: 'unpaid',
        customerId: customer,
        userId,
        clientReferenceId: userId,
      });
      expect(await check(userId, g)).toEqual({ status: 'expired' });
      expect(await rowOf(userId)).toEqual(before);
    });

    it('a Stripe outage rolls nothing in and reports unavailable', async () => {
      const { userId, customer, sub } = await newMember();
      sim.set(sub, customer);
      sim.failNextWith(
        Object.assign(new Error('down'), { type: 'StripeAPIError', statusCode: 503 }),
      );
      const before = await rowOf(userId);
      const g = gateway({
        customerId: customer,
        subscriptionId: sub,
        userId,
        clientReferenceId: userId,
      });
      expect(await check(userId, g)).toEqual({ status: 'unavailable' });
      expect(await rowOf(userId)).toEqual(before);
    });

    it('never touches a Lifetime membership, even for a "paid" session', async () => {
      const { userId, customer, sub } = await newMember({ tier: 'lifetime', status: 'active' });
      sim.set(sub, customer);
      const before = await rowOf(userId);
      const g = gateway({
        customerId: customer,
        subscriptionId: sub,
        userId,
        clientReferenceId: userId,
      });
      expect(await check(userId, g)).toEqual({ status: 'review' });
      expect(await rowOf(userId)).toEqual(before);
    });

    it('a second live subscription is left for review and does not replace the first', async () => {
      const { userId, customer, sub } = await newMember({
        tier: 'monthly',
        status: 'active',
        stripeSubscriptionId: `sub_${RUN}_first`,
        currentPeriodEnd: new Date(Date.now() + 10 * DAY),
      });
      sim.set(`sub_${RUN}_first`, customer);
      sim.set(sub, customer);
      const g = gateway({
        customerId: customer,
        subscriptionId: sub,
        userId,
        clientReferenceId: userId,
      });
      expect(await check(userId, g)).toEqual({ status: 'review' });
      expect((await rowOf(userId)).stripeSubscriptionId).toBe(`sub_${RUN}_first`);
    });
  });
});
