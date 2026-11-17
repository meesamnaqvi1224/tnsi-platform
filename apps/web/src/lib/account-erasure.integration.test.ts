import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { FlowiRequestError } from '@tnsi/integrations';

/**
 * Account deletion on a REAL PostgreSQL: what is erased, what is anonymised, what is kept, the CRM
 * (Flowi) suppression and contact deletion, retries, CRM failures and concurrency.
 *
 * Clerk and Flowi are FAKED (no network): Clerk by replacing `deleteIdentity`, Flowi by an in-memory
 * `AccountCrmSender` that can be told to fail. Everything else is the real code on a real database.
 *
 * SKIPPED unless `TNSI_TEST_DATABASE_URL` is set; refuses the production host. The target must be an
 * ISOLATED database with the repository's migrations applied (through 0014). Run with:
 *
 *   TNSI_TEST_DATABASE_URL="<isolated database>" \
 *     pnpm --filter @tnsi/web exec vitest run src/lib/account-erasure.integration.test.ts
 *
 * Creates its own members and rows (tagged with RUN) and deletes them afterwards.
 */
const PRODUCTION_DB_HOST = 'ep-damp-flower-ayp7i2gc';
const TEST_URL = process.env.TNSI_TEST_DATABASE_URL;
const enabled = !!TEST_URL && !TEST_URL.includes(PRODUCTION_DB_HOST);
const RUN = `erasure-it-${Date.now()}`;
/** Appears in every personal value the tests write, so anything left behind is detectable. */
const SECRET = `SECRET-${RUN}`;

vi.mock('@tnsi/db', async () => {
  const schema = await import('@tnsi/db/schema');
  const { createRequire } = await import('node:module');
  const postgres = createRequire(new URL('../../../../packages/db/package.json', import.meta.url))(
    'postgres',
  ) as (url: string, options: Record<string, unknown>) => never;
  const { drizzle } = await import('drizzle-orm/postgres-js');
  const url = process.env.TNSI_TEST_DATABASE_URL!;
  const client = postgres(url, {
    prepare: false,
    max: url.includes('.neon.tech') ? 10 : 1,
    idle_timeout: 20,
    connect_timeout: 15,
  });
  return { ...schema, schema, db: drizzle(client, { schema }) };
});

type Mods = {
  db: typeof import('@tnsi/db').db;
  s: typeof import('@tnsi/db/schema');
  accountLib: typeof import('./account-deletion');
  erasure: typeof import('./account-data-erasure');
  outbox: typeof import('./crm-outbox');
  crmSync: typeof import('./crm-membership-sync');
  sync: typeof import('./user-sync-ops');
  journal: typeof import('./journal');
  state: typeof import('./deletion-state');
  d: typeof import('drizzle-orm');
};
let m: Mods;
const userIds: string[] = [];
const practiceIds: string[] = [];
const emails: string[] = [];
const claimKeys: string[] = [];

/** An in-memory CRM. It can only act on contacts that exist: there is no way to create one here. */
function fakeCrm(initial: Record<string, string> = {}) {
  const contacts = new Map<string, { id: string; dnd: boolean }>(
    Object.entries(initial).map(([email, id]) => [email.toLowerCase(), { id, dnd: false }]),
  );
  const calls: string[] = [];
  let failWith: number | null = null;
  const fail = () => {
    // The same error the real client throws, so failures are classified exactly as in production.
    if (failWith !== null) throw new FlowiRequestError(`HTTP ${failWith}`, failWith);
  };
  const byId = (id: string) => [...contacts.entries()].find(([, c]) => c.id === id);
  return {
    contacts,
    calls,
    failing(status: number | null) {
      failWith = status;
    },
    sender: {
      async findContactId(email: string) {
        calls.push('find');
        fail();
        return contacts.get(email.toLowerCase())?.id ?? null;
      },
      async suppress(contactId: string) {
        calls.push('suppress');
        fail();
        const hit = byId(contactId);
        if (!hit) return false;
        hit[1].dnd = true;
        return true;
      },
      async deleteContact(contactId: string) {
        calls.push('delete');
        fail();
        const hit = byId(contactId);
        if (!hit) return false;
        contacts.delete(hit[0]);
        return true;
      },
    },
  };
}
type Crm = ReturnType<typeof fakeCrm>;

async function newUser(label: string) {
  const email = `${RUN}-${label}@example.test`;
  const [row] = await m.db
    .insert(m.s.users)
    .values({
      clerkUserId: `${RUN}-${label}`,
      email,
      fullName: `Name ${SECRET}`,
      avatarUrl: `https://img.example/${SECRET}.png`,
      metadata: { note: SECRET },
    })
    .returning();
  userIds.push(row!.id);
  emails.push(email);
  return row!;
}

async function newPractice(label: string) {
  const [row] = await m.db
    .insert(m.s.practices)
    .values({
      sanityId: `${RUN}-${label}`,
      title: label,
      contentType: 'audio',
      sanityData: {},
      isPublished: true,
    })
    .returning();
  practiceIds.push(row!.id);
  return row!;
}

/** One of everything a member can have. */
async function seedMember(label: string) {
  const user = await newUser(label);
  const practice = await newPractice(`${label}-practice`);
  const [completion] = await m.db
    .insert(m.s.practiceCompletions)
    .values({
      userId: user.id,
      practiceId: practice.id,
      progressPct: 1,
      completed: true,
      completedAt: new Date(),
    })
    .returning();
  await m.db.insert(m.s.practiceReflections).values({
    userId: user.id,
    practiceId: practice.id,
    completionId: completion!.id,
    reflection: `quick ${SECRET}`,
  });
  await m.db.insert(m.s.practiceSaves).values({ userId: user.id, practiceId: practice.id });
  await m.db.insert(m.s.checkIns).values({
    userId: user.id,
    moodScore: 3,
    capacityScore: 3,
    notes: `check-in ${SECRET}`,
    completedAt: new Date(),
    completedDate: new Date('2026-11-16'),
  });
  await m.db
    .insert(m.s.powerDropUsages)
    .values({ userId: user.id, powerDropId: `${RUN}-pd`, powerDropSlug: `${RUN}-pd` });
  await m.db.insert(m.s.assessmentSubmissions).values({
    assessmentSlug: 'capacity',
    email: user.email,
    answers: { q1: SECRET },
    userId: user.id,
  });
  await m.db.insert(m.s.journalEntries).values([
    { userId: user.id, content: `saved ${SECRET}`, status: 'saved' },
    { userId: user.id, content: `draft ${SECRET}`, status: 'draft' },
  ]);
  // The consent record is a documented RETAINED record (docs/account-deletion-and-data-retention.md):
  // it holds a member id, a notice version and two timestamps, never journal text or an email.
  await m.db.insert(m.s.journalConsents).values({ userId: user.id, policyVersion: 'draft-2' });
  await m.db.insert(m.s.entitlements).values({
    userId: user.id,
    stripeCustomerId: `cus_${RUN}_${label}`,
  });
  const emailKey = Array.from({ length: 64 }, () =>
    Math.floor(Math.random() * 16).toString(16),
  ).join('');
  claimKeys.push(emailKey);
  await m.db.insert(m.s.trialClaims).values({
    emailKey,
    userId: user.id,
    trialEndsAt: new Date(Date.now() + 86_400_000),
  });
  // A CRM event still waiting to be sent for this member.
  await m.db.insert(m.s.crmOutbox).values({
    kind: 'app_signup',
    email: user.email,
    payload: { source: 'TNSI app — account created', tags: ['TNSI App Signup'] },
  });
  return user;
}

const count = async (table: unknown, where: unknown) =>
  (
    await m.db
      .select()
      .from(table as never)
      .where(where as never)
  ).length;

/** How many rows of each kind this member has. */
async function footprint(userId: string) {
  const eq = m.d.eq;
  return {
    journal: await count(m.s.journalEntries, eq(m.s.journalEntries.userId, userId)),
    checkIns: await count(m.s.checkIns, eq(m.s.checkIns.userId, userId)),
    completions: await count(m.s.practiceCompletions, eq(m.s.practiceCompletions.userId, userId)),
    reflections: await count(m.s.practiceReflections, eq(m.s.practiceReflections.userId, userId)),
    saves: await count(m.s.practiceSaves, eq(m.s.practiceSaves.userId, userId)),
    powerDrops: await count(m.s.powerDropUsages, eq(m.s.powerDropUsages.userId, userId)),
    assessments: await count(
      m.s.assessmentSubmissions,
      eq(m.s.assessmentSubmissions.userId, userId),
    ),
    consents: await count(m.s.journalConsents, eq(m.s.journalConsents.userId, userId)),
  };
}
const ERASED = {
  journal: 0,
  checkIns: 0,
  completions: 0,
  reflections: 0,
  saves: 0,
  powerDrops: 0,
  assessments: 0,
  consents: 1, // retained on purpose: evidence of agreement, no content
};
const FULL = {
  ...ERASED,
  journal: 2,
  checkIns: 1,
  completions: 1,
  reflections: 1,
  saves: 1,
  powerDrops: 1,
  assessments: 1,
  consents: 1,
};

const userRow = async (id: string) =>
  (await m.db.select().from(m.s.users).where(m.d.eq(m.s.users.id, id)))[0]!;
const outboxFor = async (userId: string, kind: string) =>
  m.db
    .select()
    .from(m.s.crmOutbox)
    .where(
      m.d.and(
        m.d.eq(m.s.crmOutbox.kind, kind),
        m.d.sql`${m.s.crmOutbox.payload}->>'userId' = ${userId}`,
      ),
    );
const outboxByEmail = async (email: string) =>
  m.db.select().from(m.s.crmOutbox).where(m.d.eq(m.s.crmOutbox.email, email));

/** The real flow, with only Clerk and the CRM's network calls replaced. */
async function deps(crm: Crm, deleteIdentity: (id: string) => Promise<void> = async () => {}) {
  const real = await m.accountLib.realAccountDeletionDeps();
  return {
    ...real,
    deleteIdentity,
    suppressMarketing: (id: string) =>
      m.erasure.suppressMarketing(id, { accountSender: crm.sender }),
    completeCrmDeletion: (id: string) =>
      m.erasure.completeCrmDeletion(id, { accountSender: crm.sender }),
  };
}
const deleteWith = async (
  u: { id: string; clerkUserId: string },
  crm: Crm,
  deleteIdentity?: (id: string) => Promise<void>,
) =>
  m.accountLib.deleteAccount(
    { id: u.id, clerkUserId: u.clerkUserId },
    await deps(crm, deleteIdentity),
  );

describe.skipIf(!enabled)(
  'Account deletion: erasure, retention and the CRM (real PostgreSQL)',
  { timeout: 300_000 },
  () => {
    beforeAll(async () => {
      process.env.DATABASE_URL = TEST_URL!;
      const [db, s, accountLib, erasure, outbox, crmSync, sync, journal, state, d] =
        await Promise.all([
          import('@tnsi/db').then((x) => x.db),
          import('@tnsi/db/schema'),
          import('./account-deletion'),
          import('./account-data-erasure'),
          import('./crm-outbox'),
          import('./crm-membership-sync'),
          import('./user-sync-ops'),
          import('./journal'),
          import('./deletion-state'),
          import('drizzle-orm'),
        ]);
      m = { db, s, accountLib, erasure, outbox, crmSync, sync, journal, state, d };
      vi.spyOn(console, 'error').mockImplementation(() => {});
    }, 120_000);

    afterAll(async () => {
      if (!m) return;
      const { inArray, like, or, sql } = m.d;
      await m.db.delete(m.s.crmOutbox).where(
        or(
          like(m.s.crmOutbox.email, `${RUN}-%`),
          userIds.length
            ? sql`${m.s.crmOutbox.payload}->>'userId' in (${sql.join(
                userIds.map((id) => sql`${id}`),
                sql`, `,
              )})`
            : undefined,
        ),
      );
      await m.db
        .delete(m.s.assessmentSubmissions)
        .where(like(m.s.assessmentSubmissions.email, `${RUN}-%`));
      if (claimKeys.length)
        await m.db.delete(m.s.trialClaims).where(inArray(m.s.trialClaims.emailKey, claimKeys));
      if (userIds.length) await m.db.delete(m.s.users).where(inArray(m.s.users.id, userIds));
      if (practiceIds.length)
        await m.db.delete(m.s.practices).where(inArray(m.s.practices.id, practiceIds));
    }, 120_000);

    // ------------------------------------------------------------------ erasure and retention
    it('a completed deletion erases the activity, anonymises the account, keeps only the documented records, and deletes the CRM contact', async () => {
      const u = await seedMember('full');
      const other = await seedMember('bystander');
      // A submission made as a website visitor with the same address: not linked to the account.
      await m.db
        .insert(m.s.assessmentSubmissions)
        .values({ assessmentSlug: 'capacity', email: u.email, answers: { q1: 'visitor' } });
      const crm = fakeCrm({ [u.email]: 'contact-full', [other.email]: 'contact-bystander' });
      expect(await footprint(u.id)).toEqual(FULL);

      expect(await deleteWith(u, crm)).toEqual({ status: 'deleted' });

      // ERASED
      expect(await footprint(u.id)).toEqual(ERASED);

      // ANONYMISED: the row stays as a tombstone with nothing personal in it.
      const row = await userRow(u.id);
      expect(row.deletedAt).toBeInstanceOf(Date);
      expect(row.email).toBe(m.erasure.anonymisedEmail(u.id));
      expect(m.erasure.isAnonymisedEmail(row.email)).toBe(true);
      expect(row.fullName).toBeNull();
      expect(row.avatarUrl).toBeNull();
      expect(row.metadata).toEqual({});
      expect(row.clerkUserId).toBe(u.clerkUserId); // the tombstone key
      expect(JSON.stringify(row)).not.toContain(SECRET);
      expect(JSON.stringify(row)).not.toContain(u.email);

      // KEPT, for documented reasons
      const [entitlement] = await m.db
        .select()
        .from(m.s.entitlements)
        .where(m.d.eq(m.s.entitlements.userId, u.id));
      expect(entitlement?.stripeCustomerId).toBe(`cus_${RUN}_full`); // billing reconciliation
      expect(await count(m.s.trialClaims, m.d.eq(m.s.trialClaims.userId, u.id))).toBe(1); // trial abuse prevention (a keyed hash)
      expect(
        await count(m.s.accountDeletionRequests, m.d.eq(m.s.accountDeletionRequests.userId, u.id)),
      ).toBe(1); // the deletion request record
      // NOT account-linked, so not touched by account deletion (documented; an open legal question).
      expect(
        await count(m.s.assessmentSubmissions, m.d.eq(m.s.assessmentSubmissions.email, u.email)),
      ).toBe(1);

      // CRM: suppressed first, then deleted; never created.
      expect(crm.contacts.has(u.email)).toBe(false);
      expect(crm.calls).toContain('suppress');
      expect(crm.calls.at(-1)).toBe('delete');
      // The outbox keeps no address for the deleted member: queued events cancelled, the job scrubbed.
      expect(await outboxByEmail(u.email)).toEqual([]);
      const [job] = await outboxFor(u.id, 'account_delete');
      expect(job).toMatchObject({
        status: 'sent',
        email: m.outbox.SCRUBBED_OUTBOX_EMAIL,
        contactId: null,
      });
      expect(job!.payload).toEqual({ userId: u.id });

      // The other member is untouched, everywhere.
      expect(await footprint(other.id)).toEqual(FULL);
      expect((await userRow(other.id)).email).toBe(other.email);
      expect(crm.contacts.get(other.email)).toEqual({ id: 'contact-bystander', dnd: false });
      expect((await outboxByEmail(other.email)).map((r) => r.kind)).toEqual(['app_signup']);
    });

    it('a member with no CRM contact is deleted without one ever being created', async () => {
      const u = await seedMember('no-contact');
      const crm = fakeCrm();
      expect(await deleteWith(u, crm)).toEqual({ status: 'deleted' });
      expect(crm.contacts.size).toBe(0);
      expect(crm.calls.every((c) => c === 'find')).toBe(true);
    });

    it('the erasure is atomic with the transaction that marks the account deleted: a failure rolls ALL of it back', async () => {
      const u = await seedMember('rollback');
      await expect(
        m.db.transaction(async (tx) => {
          await m.erasure.eraseMemberData(tx, u.id);
          throw new Error('marking the account deleted failed');
        }),
      ).rejects.toThrow();
      expect(await footprint(u.id)).toEqual(FULL);
      const row = await userRow(u.id);
      expect(row.email).toBe(u.email);
      expect(row.fullName).toContain(SECRET);
      expect(await outboxFor(u.id, 'account_delete')).toEqual([]);
      expect((await outboxByEmail(u.email)).map((r) => r.kind)).toEqual(['app_signup']);
    });

    // ------------------------------------------------------------------ suppression at the start
    it('marketing is suppressed the moment deletion starts, even when the deletion then stalls at Clerk', async () => {
      const u = await seedMember('stalls');
      const crm = fakeCrm({ [u.email]: 'contact-stalls' });
      const result = await deleteWith(u, crm, async () => {
        throw new Error('clerk unavailable');
      });
      expect(result).toEqual({ status: 'pending', stage: 'identity_provider' });

      expect(crm.contacts.get(u.email)).toEqual({ id: 'contact-stalls', dnd: true }); // suppressed, not deleted
      expect(await outboxByEmail(u.email).then((rows) => rows.map((r) => r.kind))).toEqual([
        'account_suppress',
      ]); // the queued sign-up event was cancelled
      expect((await outboxFor(u.id, 'account_suppress'))[0]?.status).toBe('sent');
      // Deletion has NOT completed, so nothing but the journal is erased and the account still exists.
      expect(await footprint(u.id)).toEqual({ ...FULL, journal: 0 });
      expect((await userRow(u.id)).email).toBe(u.email);
      expect((await userRow(u.id)).deletedAt).toBeNull();

      // The retry completes, and queues suppression only once.
      expect(await deleteWith(u, crm)).toEqual({ status: 'deleted' });
      expect(crm.contacts.has(u.email)).toBe(false);
      expect(await footprint(u.id)).toEqual(ERASED);
    });

    it('a CRM that is down when deletion starts does not block the deletion, and suppression is superseded by the contact deletion', async () => {
      const u = await seedMember('crm-down-start');
      const crm = fakeCrm({ [u.email]: 'contact-down-start' });
      crm.failing(503);
      const stalled = await deleteWith(u, crm, async () => {
        throw new Error('clerk unavailable');
      });
      expect(stalled).toEqual({ status: 'pending', stage: 'identity_provider' });
      expect((await outboxFor(u.id, 'account_suppress'))[0]).toMatchObject({
        status: 'pending',
        attempts: 1,
      });

      crm.failing(null);
      expect(await deleteWith(u, crm)).toEqual({ status: 'deleted' });
      expect(crm.contacts.has(u.email)).toBe(false);
      expect(await outboxFor(u.id, 'account_suppress')).toEqual([]); // not left to run against a deleted contact
    });

    // ------------------------------------------------------------------ CRM failures
    it('if the CRM cannot confirm the contact is deleted, the result is pending_cleanup - never deleted - and the worker finishes it later', async () => {
      const u = await seedMember('crm-down-end');
      const crm = fakeCrm({ [u.email]: 'contact-down-end' });
      const d = await deps(crm);
      // The CRM works for suppression, then goes down before the contact deletion.
      const result = await m.accountLib.deleteAccount(
        { id: u.id, clerkUserId: u.clerkUserId },
        {
          ...d,
          finalizeLocalDeletion: async (clerkUserId) => {
            const out = await d.finalizeLocalDeletion(clerkUserId);
            crm.failing(503);
            return out;
          },
        },
      );
      expect(result).toEqual({ status: 'pending_cleanup' });
      expect(result.status).not.toBe('deleted');

      // Our own data IS erased; the CRM contact is still there; the job is still queued with the address it needs.
      expect(await footprint(u.id)).toEqual(ERASED);
      expect((await userRow(u.id)).deletedAt).toBeInstanceOf(Date);
      expect(crm.contacts.has(u.email)).toBe(true);
      const [waiting] = await outboxFor(u.id, 'account_delete');
      expect(waiting).toMatchObject({
        status: 'pending',
        attempts: 1,
        email: u.email,
        lastError: 'HTTP 503',
      });
      expect(await m.erasure.completeCrmDeletion(u.id, { accountSender: crm.sender })).toBe(false);

      // The CRM recovers; the worker's next run (after the back-off) deletes the contact and scrubs the job.
      crm.failing(null);
      const later = () => new Date(Date.now() + 60 * 60 * 1000);
      await m.outbox.processOutbox({ accountSender: crm.sender, now: later });
      expect(crm.contacts.has(u.email)).toBe(false);
      const [done] = await outboxFor(u.id, 'account_delete');
      expect(done).toMatchObject({ status: 'sent', email: m.outbox.SCRUBBED_OUTBOX_EMAIL });
      expect(await outboxByEmail(u.email)).toEqual([]);
      expect(await m.erasure.completeCrmDeletion(u.id, { accountSender: crm.sender })).toBe(true);
    });

    it('a CRM job that gives up (bad credentials) stays visible as failed and is never counted as done', async () => {
      const u = await seedMember('crm-config');
      const crm = fakeCrm({ [u.email]: 'contact-config' });
      crm.failing(401);
      await m.sync.userSyncOps.softDeleteUser(u.clerkUserId);
      const [job] = await outboxFor(u.id, 'account_delete');
      let at = Date.now();
      for (let i = 0; i < m.outbox.OUTBOX.maxConfigAttempts; i += 1) {
        at += 7 * 60 * 60 * 1000; // past the longest back-off
        await m.db
          .update(m.s.crmOutbox)
          .set({ nextAttemptAt: new Date(0) })
          .where(m.d.eq(m.s.crmOutbox.id, job!.id));
        await m.outbox.attemptNow(job!.id, { accountSender: crm.sender, now: () => new Date(at) });
      }
      const [failed] = await outboxFor(u.id, 'account_delete');
      expect(failed).toMatchObject({ status: 'failed', lastError: 'HTTP 401', email: u.email });
      expect(await m.erasure.completeCrmDeletion(u.id, { accountSender: crm.sender })).toBe(false);
      expect(crm.contacts.has(u.email)).toBe(true);

      // Once the credential is fixed, requeueing completes it.
      crm.failing(null);
      await m.outbox.requeueFailed({ category: 'HTTP 401' });
      expect(await m.erasure.completeCrmDeletion(u.id, { accountSender: crm.sender })).toBe(true);
      expect(crm.contacts.has(u.email)).toBe(false);
    });

    it('a contact that was already removed in the CRM counts as deleted (404 is success, so a retry never sticks)', async () => {
      const u = await seedMember('crm-gone');
      const crm = fakeCrm({ [u.email]: 'contact-gone' });
      await m.sync.userSyncOps.softDeleteUser(u.clerkUserId);
      const [job] = await outboxFor(u.id, 'account_delete');
      await m.db
        .update(m.s.crmOutbox)
        .set({ contactId: 'stale-id' })
        .where(m.d.eq(m.s.crmOutbox.id, job!.id));
      expect(await m.erasure.completeCrmDeletion(u.id, { accountSender: crm.sender })).toBe(true);
      expect((await outboxFor(u.id, 'account_delete'))[0]?.status).toBe('sent');
    });

    // ------------------------------------------------------------------ retries and the webhook path
    it('a deletion that reaches us only as a Clerk user.deleted webhook erases the same data and queues the CRM deletion', async () => {
      const u = await seedMember('webhook-only');
      const crm = fakeCrm({ [u.email]: 'contact-webhook' });
      await m.sync.userSyncOps.softDeleteUser(u.clerkUserId);
      expect(await footprint(u.id)).toEqual(ERASED);
      expect((await userRow(u.id)).email).toBe(m.erasure.anonymisedEmail(u.id));
      expect(await outboxByEmail(u.email).then((r) => r.map((x) => x.kind))).toEqual([
        'account_delete',
      ]);
      await m.outbox.processOutbox({ accountSender: crm.sender });
      expect(crm.contacts.has(u.email)).toBe(false);
    });

    it('repeating the finalisation (a retried webhook, a retried request) changes nothing and queues nothing more', async () => {
      const u = await seedMember('repeat');
      const crm = fakeCrm({ [u.email]: 'contact-repeat' });
      expect(await deleteWith(u, crm)).toEqual({ status: 'deleted' });
      const first = await userRow(u.id);
      const callsAfterFirst = crm.calls.length;

      for (let i = 0; i < 3; i += 1) await m.sync.userSyncOps.softDeleteUser(u.clerkUserId);
      expect(await deleteWith(u, crm)).toEqual({ status: 'deleted' });

      const again = await userRow(u.id);
      expect(again.deletedAt!.getTime()).toBe(first.deletedAt!.getTime());
      expect(again.email).toBe(first.email);
      expect(await outboxFor(u.id, 'account_delete')).toHaveLength(1);
      expect(await outboxFor(u.id, 'account_suppress')).toEqual([]);
      expect(crm.calls.length).toBe(callsAfterFirst); // nothing more was sent to the CRM
    });

    it('a stale Clerk user.updated after deletion cannot write the person back into the erased account', async () => {
      const u = await seedMember('stale-webhook');
      await m.sync.userSyncOps.softDeleteUser(u.clerkUserId);
      const returned = await m.sync.userSyncOps.upsertUser({
        clerkUserId: u.clerkUserId,
        email: u.email,
        fullName: `Name ${SECRET}`,
        avatarUrl: `https://img.example/${SECRET}.png`,
        metadata: { note: SECRET },
      });
      expect(returned.id).toBe(u.id);
      const row = await userRow(u.id);
      expect(row.email).toBe(m.erasure.anonymisedEmail(u.id));
      expect(JSON.stringify(row)).not.toContain(SECRET);
      expect(row.deletedAt).toBeInstanceOf(Date);
      expect(await count(m.s.users, m.d.eq(m.s.users.clerkUserId, u.clerkUserId))).toBe(1);
    });

    it('no CRM event is produced for a deleted account (membership sync and sign-up)', async () => {
      const u = await seedMember('no-events');
      await m.sync.userSyncOps.softDeleteUser(u.clerkUserId);
      await m.db
        .delete(m.s.crmOutbox)
        .where(m.d.sql`${m.s.crmOutbox.payload}->>'userId' = ${u.id}`);
      expect(await m.crmSync.enqueueAppSignup(m.db, u.id)).toBeNull();
      const before = {
        tier: 'free' as const,
        status: 'active' as const,
        programs: [],
        certifications: [],
        features: [],
        trialStartedAt: null,
        trialEndsAt: null,
        currentPeriodEnd: null,
        cancelAtPeriodEnd: false,
      };
      expect(
        await m.crmSync.enqueueMembershipChange(m.db, {
          userId: u.id,
          before,
          after: { ...before, tier: 'regulation_suite' as never },
          now: new Date(),
        }),
      ).toBeNull();
      expect(await outboxByEmail(m.erasure.anonymisedEmail(u.id))).toEqual([]);
    });

    it('once deleted, the journal still refuses writes (the #57 barrier is intact after erasure)', async () => {
      const u = await seedMember('barrier');
      await m.sync.userSyncOps.softDeleteUser(u.clerkUserId);
      await expect(
        m.journal.createJournalEntry(u.id, {
          id: crypto.randomUUID(),
          content: 'late',
          status: 'saved',
          entryType: 'independent',
        } as never),
      ).rejects.toBeInstanceOf(m.state.AccountDeletionPendingError);
      expect(await footprint(u.id)).toEqual(ERASED);
    });

    // ------------------------------------------------------------------ concurrency
    it('deletion requests and Clerk webhooks overlapping: everything erased once, exactly one CRM deletion job, no error', async () => {
      const u = await seedMember('overlap');
      const crm = fakeCrm({ [u.email]: 'contact-overlap' });
      const settled = await Promise.allSettled([
        deleteWith(u, crm),
        deleteWith(u, crm),
        deleteWith(u, crm),
        m.sync.userSyncOps.softDeleteUser(u.clerkUserId),
        m.sync.userSyncOps.softDeleteUser(u.clerkUserId),
        m.sync.userSyncOps.softDeleteUser(u.clerkUserId),
      ]);
      expect(settled.filter((r) => r.status === 'rejected')).toEqual([]);
      for (const r of settled.slice(0, 3)) {
        expect(['deleted', 'pending_cleanup']).toContain(
          (r as PromiseFulfilledResult<{ status: string }>).value.status,
        );
      }
      expect(await footprint(u.id)).toEqual(ERASED);
      expect((await userRow(u.id)).email).toBe(m.erasure.anonymisedEmail(u.id));
      expect(await outboxFor(u.id, 'account_delete')).toHaveLength(1);
      expect(
        await outboxByEmail(u.email).then((r) => r.filter((x) => x.kind !== 'account_delete')),
      ).toEqual([]);

      // Whatever each racer reported, one more run settles it as complete.
      await m.outbox.processOutbox({
        accountSender: crm.sender,
        now: () => new Date(Date.now() + 3_600_000),
      });
      expect(await m.erasure.completeCrmDeletion(u.id, { accountSender: crm.sender })).toBe(true);
      expect(crm.contacts.has(u.email)).toBe(false);
      expect((await outboxFor(u.id, 'account_delete'))[0]?.email).toBe(
        m.outbox.SCRUBBED_OUTBOX_EMAIL,
      );
    });

    it('journal writers racing a full deletion: no journal entry and no activity survives', async () => {
      for (let round = 0; round < 3; round += 1) {
        const u = await seedMember(`race-${round}`);
        const crm = fakeCrm({ [u.email]: `contact-race-${round}` });
        const writes = Array.from({ length: 6 }, (_, i) =>
          m.journal
            .createJournalEntry(u.id, {
              id: crypto.randomUUID(),
              content: `race ${i}`,
              status: i % 2 ? 'saved' : 'draft',
              entryType: 'independent',
            } as never)
            .then(
              () => 'wrote',
              (e) => (e instanceof m.state.AccountDeletionPendingError ? 'refused' : 'error'),
            ),
        );
        const [outcomes, result] = await Promise.all([Promise.all(writes), deleteWith(u, crm)]);
        expect(outcomes).not.toContain('error');
        expect(result).toEqual({ status: 'deleted' });
        expect(await footprint(u.id)).toEqual(ERASED);
      }
    });
  },
);
