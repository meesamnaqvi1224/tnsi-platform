import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { buildEligibilityKeys, loadTrialKeyConfig } from '@tnsi/auth/trial/email';
import { claimTrial, type TrialClaimTx } from '@tnsi/auth/trial/eligibility';

/**
 * Real-Postgres integration tests for the free-trial transaction
 * (`runTrialTransaction` in ./trial.ts): primary-key arbitration of
 * simultaneous claims, the row lock, rollback, and key re-keying on rotation.
 * The pure logic is covered without a database by the @tnsi/auth tests and
 * route.test.ts; this file exists because those can only MODEL the database.
 *
 * SKIPPED unless `TNSI_TEST_DATABASE_URL` is set - it never runs by default and
 * never touches `DATABASE_URL`. The target must be an ISOLATED database with
 * migrations 0000-0011 already applied. It refuses the production host by
 * content, not by variable name. Run:
 *
 *   TNSI_TEST_DATABASE_URL="<isolated database>" \
 *     pnpm --filter @tnsi/web exec vitest run src/lib/trial.integration.test.ts
 *
 * It writes only rows it creates (a unique run id) and removes them afterwards.
 */

// The route-level logging test below drives the real route over the real
// database; only identity and the account row are replaced.
const routeState = vi.hoisted(() => ({
  user: null as null | { id: string; clerkUserId: string; entitlements: Record<string, unknown> },
  email: '',
}));
vi.mock('@/lib/auth-api', () => ({
  requireAuth: async () => {
    if (!routeState.user) throw new Error('UNAUTHENTICATED');
    return routeState.user;
  },
}));
vi.mock('@tnsi/auth/verify/email', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@tnsi/auth/verify/email')>()),
  fetchProviderUserEmails: async () => ({
    primaryEmailAddressId: 'e1',
    emailAddresses: [
      { id: 'e1', emailAddress: routeState.email, verification: { status: 'verified' } },
    ],
  }),
}));

const PRODUCTION_DB_HOST = 'ep-damp-flower-ayp7i2gc';
const TEST_URL = process.env.TNSI_TEST_DATABASE_URL;
const RUN = `trial-it-${Date.now()}`;

const SECRET_1 = 'k1_Zm9vYmFyYmF6cXV4cXV1eHF1dXhxdXV4MTIzNDU2Nzg5MA==';
const SECRET_2 = 'k2_YW5vdGhlci1zZWNyZXQtdmFsdWUtMDEyMzQ1Njc4OS1hYmNkZWY=';
const V1 = loadTrialKeyConfig({
  TRIAL_ELIGIBILITY_SECRET: SECRET_1,
  TRIAL_ELIGIBILITY_KEY_VERSION: '1',
});
const V2 = loadTrialKeyConfig({
  TRIAL_ELIGIBILITY_SECRET: SECRET_2,
  TRIAL_ELIGIBILITY_KEY_VERSION: '2',
  TRIAL_ELIGIBILITY_PREVIOUS_KEYS: `1:${SECRET_1}`,
});

describe.skipIf(!TEST_URL)('trial transaction against a real database', () => {
  type Modules = {
    db: (typeof import('@tnsi/db'))['db'];
    users: (typeof import('@tnsi/db'))['users'];
    entitlements: (typeof import('@tnsi/db'))['entitlements'];
    trialClaims: (typeof import('@tnsi/db'))['trialClaims'];
    runTrialTransaction: (typeof import('./trial'))['runTrialTransaction'];
    eq: (typeof import('drizzle-orm'))['eq'];
    like: (typeof import('drizzle-orm'))['like'];
    sql: (typeof import('drizzle-orm'))['sql'];
    createTrialClaimTx: (typeof import('./trial'))['createTrialClaimTx'];
  };
  let m: Modules;
  const created: string[] = [];

  beforeAll(async () => {
    if (TEST_URL!.includes(PRODUCTION_DB_HOST)) {
      throw new Error('Refusing to run against the production database.');
    }
    process.env.DATABASE_URL = TEST_URL!;
    const dbModule = await import('@tnsi/db');
    const trial = await import('./trial');
    const orm = await import('drizzle-orm');
    m = {
      db: dbModule.db,
      users: dbModule.users,
      entitlements: dbModule.entitlements,
      trialClaims: dbModule.trialClaims,
      runTrialTransaction: trial.runTrialTransaction,
      eq: orm.eq,
      like: orm.like,
      sql: orm.sql,
      createTrialClaimTx: trial.createTrialClaimTx,
    };
  });

  afterAll(async () => {
    if (!m) return;
    for (const id of created)
      await m.db.delete(m.trialClaims).where(m.eq(m.trialClaims.userId, id));
    await m.db.delete(m.users).where(m.like(m.users.clerkUserId, `${RUN}%`)); // entitlements cascade
  });

  async function newUser(label: string, tier: 'free' | 'monthly' = 'free') {
    const [user] = await m.db
      .insert(m.users)
      .values({ clerkUserId: `${RUN}-${label}`, email: `${RUN}-${label}@example.test` })
      .returning({ id: m.users.id });
    await m.db.insert(m.entitlements).values({
      userId: user!.id,
      tier,
      stripeSubscriptionId: tier === 'free' ? null : `sub_${RUN}_${label}`,
    });
    created.push(user!.id);
    return user!.id;
  }

  const trialOf = async (userId: string) =>
    (
      await m.db
        .select({ s: m.entitlements.trialStartedAt, e: m.entitlements.trialEndsAt })
        .from(m.entitlements)
        .where(m.eq(m.entitlements.userId, userId))
    )[0]!;

  it('lets exactly one of many simultaneous claims for one email win', async () => {
    const ids = await Promise.all(Array.from({ length: 12 }, (_, i) => newUser(`race-${i}`)));
    const keys = buildEligibilityKeys(`${RUN}-shared@example.test`, V1);

    const results = await Promise.all(
      ids.map((userId) => claimTrial(m.runTrialTransaction, { userId, keys, now: new Date() })),
    );

    expect(results.filter((r) => r.status === 'started')).toHaveLength(1);
    const withTrial = (await Promise.all(ids.map(trialOf))).filter((t) => t.s !== null);
    expect(withTrial).toHaveLength(1);
    const claims = await m.db
      .select()
      .from(m.trialClaims)
      .where(m.eq(m.trialClaims.emailKey, keys.current.key));
    expect(claims).toHaveLength(1);
  });

  it('serialises two simultaneous claims by the same account to one trial', async () => {
    const id = await newUser('same-user');
    const keys = buildEligibilityKeys(`${RUN}-solo@example.test`, V1);
    const results = await Promise.all([
      claimTrial(m.runTrialTransaction, { userId: id, keys, now: new Date() }),
      claimTrial(m.runTrialTransaction, { userId: id, keys, now: new Date() }),
    ]);
    expect(results.filter((r) => r.status === 'started')).toHaveLength(1);
  });

  it('refuses a paid account and burns no claim', async () => {
    const id = await newUser('paid', 'monthly');
    const keys = buildEligibilityKeys(`${RUN}-paid@example.test`, V1);
    const result = await claimTrial(m.runTrialTransaction, { userId: id, keys, now: new Date() });
    expect(result).toEqual({ status: 'refused', reason: 'paid_membership' });
    expect(
      await m.db.select().from(m.trialClaims).where(m.eq(m.trialClaims.emailKey, keys.current.key)),
    ).toHaveLength(0);
  });

  it('re-keys an older-version claim to the current version on touch', async () => {
    const first = await newUser('rotate-1');
    const second = await newUser('rotate-2');
    const email = `${RUN}-rotate@example.test`;
    await claimTrial(m.runTrialTransaction, {
      userId: first,
      keys: buildEligibilityKeys(email, V1),
      now: new Date(),
    });

    const rotated = buildEligibilityKeys(email, V2);
    const result = await claimTrial(m.runTrialTransaction, {
      userId: second,
      keys: rotated,
      now: new Date(),
    });

    expect(result).toEqual({ status: 'refused', reason: 'trial_already_claimed' });
    const rows = await m.db
      .select()
      .from(m.trialClaims)
      .where(m.eq(m.trialClaims.emailKey, rotated.current.key));
    expect(rows).toHaveLength(1);
    expect(rows[0]!.keyVersion).toBe(2);
  });

  it('enforces the check constraints the migration adds', async () => {
    const id = await newUser('constraint');
    await expect(
      m.db
        .update(m.entitlements)
        .set({ trialStartedAt: new Date() }) // half-set window
        .where(m.eq(m.entitlements.userId, id)),
    ).rejects.toThrow();
    await expect(
      m.db
        .insert(m.trialClaims)
        .values({ emailKey: 'jane@example.com', userId: id, trialEndsAt: new Date() }),
    ).rejects.toThrow();
  });

  /** A runner identical to the real one, but with `hook` wrapped around chosen operations. */
  function runnerWith(
    wrap: (real: TrialClaimTx, trx: Parameters<typeof m.createTrialClaimTx>[0]) => TrialClaimTx,
  ) {
    return ((fn: (tx: TrialClaimTx) => Promise<unknown>) =>
      m.db.transaction((trx) =>
        fn(wrap(m.createTrialClaimTx(trx), trx)),
      )) as typeof m.runTrialTransaction;
  }

  const claimRowsFor = (key: string) =>
    m.db.select().from(m.trialClaims).where(m.eq(m.trialClaims.emailKey, key));

  it('commits the claim and the trial start together, consistently', async () => {
    const id = await newUser('atomic');
    const keys = buildEligibilityKeys(`${RUN}-atomic@example.test`, V1);
    const result = await claimTrial(m.runTrialTransaction, { userId: id, keys, now: new Date() });
    expect(result.status).toBe('started');

    const claims = await claimRowsFor(keys.current.key);
    const trial = await trialOf(id);
    expect(claims).toHaveLength(1);
    expect(trial.s).not.toBeNull();
    expect(claims[0]!.userId).toBe(id);
    expect(claims[0]!.keyVersion).toBe(1);
    expect(claims[0]!.trialEndsAt.getTime()).toBe(trial.e!.getTime());
    expect(trial.e!.getTime() - trial.s!.getTime()).toBe(30 * 24 * 60 * 60 * 1000);
    // Free trial only: still a Free account with no Stripe subscription.
    const [row] = await m.db.select().from(m.entitlements).where(m.eq(m.entitlements.userId, id));
    expect(row).toMatchObject({ tier: 'free', stripeSubscriptionId: null });
  });

  it('rolls the claim back when the trial cannot start, leaving no orphaned claim - so the email is still available', async () => {
    const a = await newUser('rollback-a');
    const b = await newUser('rollback-b');
    const keys = buildEligibilityKeys(`${RUN}-rollback@example.test`, V1);
    // The account stops being an unused Free account inside the same transaction,
    // after the claim was inserted and before the trial starts.
    const racing = runnerWith((real, trx) => ({
      ...real,
      startTrialIfEligible: async (userId, window) => {
        await trx
          .update(m.entitlements)
          .set({ stripeSubscriptionId: `sub_${RUN}_changed` })
          .where(m.eq(m.entitlements.userId, userId));
        return real.startTrialIfEligible(userId, window);
      },
    }));

    const failed = await claimTrial(racing, { userId: a, keys, now: new Date() });

    expect(failed).toEqual({ status: 'refused', reason: 'not_eligible' });
    expect(await claimRowsFor(keys.current.key)).toHaveLength(0); // no orphaned claim
    expect((await trialOf(a)).s).toBeNull();
    const [aRow] = await m.db.select().from(m.entitlements).where(m.eq(m.entitlements.userId, a));
    expect(aRow!.stripeSubscriptionId).toBeNull(); // the in-transaction change rolled back too

    // Eligibility was not burned: another account can claim the same email.
    const next = await claimTrial(m.runTrialTransaction, { userId: b, keys, now: new Date() });
    expect(next.status).toBe('started');
  });

  it('rolls everything back when anything throws after the claim is inserted', async () => {
    const id = await newUser('throws');
    const keys = buildEligibilityKeys(`${RUN}-throws@example.test`, V1);
    const exploding = runnerWith((real) => ({
      ...real,
      startTrialIfEligible: async () => {
        throw new Error('simulated failure');
      },
    }));

    await expect(claimTrial(exploding, { userId: id, keys, now: new Date() })).rejects.toThrow(
      'simulated failure',
    );
    expect(await claimRowsFor(keys.current.key)).toHaveLength(0);
    expect((await trialOf(id)).s).toBeNull();

    const retry = await claimTrial(m.runTrialTransaction, { userId: id, keys, now: new Date() });
    expect(retry.status).toBe('started');
  });

  it('PostgreSQL itself rejects a second claim for the same key (unique violation)', async () => {
    const id = await newUser('pk');
    const key = buildEligibilityKeys(`${RUN}-pk@example.test`, V1).current.key;
    const row = { emailKey: key, userId: id, trialEndsAt: new Date(Date.now() + 86_400_000) };
    await m.db.insert(m.trialClaims).values(row);
    await expect(m.db.insert(m.trialClaims).values(row)).rejects.toMatchObject({ code: '23505' });
    // ON CONFLICT DO NOTHING (what the claim uses) reports "not inserted", not an error.
    const again = await m.db
      .insert(m.trialClaims)
      .values(row)
      .onConflictDoNothing({ target: m.trialClaims.emailKey })
      .returning({ k: m.trialClaims.emailKey });
    expect(again).toHaveLength(0);
  });

  it('survives a larger race: 40 accounts, one email, exactly one trial', async () => {
    const ids = await Promise.all(Array.from({ length: 40 }, (_, i) => newUser(`big-${i}`)));
    const keys = buildEligibilityKeys(`${RUN}-big@example.test`, V1);
    const results = await Promise.all(
      ids.map((userId) => claimTrial(m.runTrialTransaction, { userId, keys, now: new Date() })),
    );
    expect(results.filter((r) => r.status === 'started')).toHaveLength(1);
    expect(await claimRowsFor(keys.current.key)).toHaveLength(1);
    expect((await Promise.all(ids.map(trialOf))).filter((t) => t.s !== null)).toHaveLength(1);
  });

  it('a database error whose Postgres detail contains the key does not reach logs or the response', async () => {
    const email = `${RUN}-logging@example.test`;
    const id = await newUser('logging');
    const [row] = await m.db.select().from(m.entitlements).where(m.eq(m.entitlements.userId, id));
    const key = buildEligibilityKeys(
      email,
      loadTrialKeyConfig({
        TRIAL_ELIGIBILITY_SECRET: SECRET_1,
        TRIAL_ELIGIBILITY_KEY_VERSION: '1',
      }),
    ).current.key;

    // Force the claim INSERT to fail with a check violation. Postgres puts the
    // failing row - which includes the derived key - into the error's `detail`.
    await m.db.execute(
      m.sql.raw(
        `ALTER TABLE trial_claims ADD CONSTRAINT tmp_${RUN.replace(/-/g, '_')}_fail CHECK (false) NOT VALID`,
      ),
    );
    const captured: string[] = [];
    const spies = (['error', 'warn', 'log', 'info'] as const).map((level) =>
      vi.spyOn(console, level).mockImplementation((...args: unknown[]) => {
        captured.push(JSON.stringify(args));
      }),
    );
    const saved = {
      open: process.env.REGULATION_SUITE_MEMBERSHIP_OPEN,
      stripe: process.env.STRIPE_SECRET_KEY,
      hook: process.env.STRIPE_WEBHOOK_SECRET,
      pm: process.env.STRIPE_PRICE_ID_MONTHLY,
      pa: process.env.STRIPE_PRICE_ID_ANNUAL,
      secret: process.env.TRIAL_ELIGIBILITY_SECRET,
      version: process.env.TRIAL_ELIGIBILITY_KEY_VERSION,
    };
    try {
      Object.assign(process.env, {
        REGULATION_SUITE_MEMBERSHIP_OPEN: 'true',
        STRIPE_SECRET_KEY: 'sk_test_x',
        STRIPE_WEBHOOK_SECRET: 'whsec_x',
        STRIPE_PRICE_ID_MONTHLY: 'price_m',
        STRIPE_PRICE_ID_ANNUAL: 'price_a',
        TRIAL_ELIGIBILITY_SECRET: SECRET_1,
        TRIAL_ELIGIBILITY_KEY_VERSION: '1',
      });
      routeState.email = email;
      routeState.user = {
        id,
        clerkUserId: `${RUN}-logging`,
        entitlements: row as unknown as Record<string, unknown>,
      };

      const { POST } = await import('../app/api/v1/billing/trial/route');
      const res = await POST();
      const body = JSON.stringify(await res.json());

      expect(res.status).toBe(500);
      const everything = captured.join('\n') + body;
      expect(everything).not.toContain(key);
      expect(everything).not.toContain(email);
      expect(everything).not.toContain(SECRET_1);
      expect(everything).not.toContain('Failing row'); // Postgres's detail text
      expect(captured.length).toBeGreaterThan(0); // it did log - just nothing sensitive
      expect(await claimRowsFor(key)).toHaveLength(0);
      expect((await trialOf(id)).s).toBeNull();
    } finally {
      spies.forEach((spy) => spy.mockRestore());
      for (const [name, value] of [
        ['REGULATION_SUITE_MEMBERSHIP_OPEN', saved.open],
        ['STRIPE_SECRET_KEY', saved.stripe],
        ['STRIPE_WEBHOOK_SECRET', saved.hook],
        ['STRIPE_PRICE_ID_MONTHLY', saved.pm],
        ['STRIPE_PRICE_ID_ANNUAL', saved.pa],
        ['TRIAL_ELIGIBILITY_SECRET', saved.secret],
        ['TRIAL_ELIGIBILITY_KEY_VERSION', saved.version],
      ] as const) {
        if (value === undefined) delete process.env[name];
        else process.env[name] = value;
      }
      await m.db.execute(
        m.sql.raw(`ALTER TABLE trial_claims DROP CONSTRAINT tmp_${RUN.replace(/-/g, '_')}_fail`),
      );
    }
  });
});
