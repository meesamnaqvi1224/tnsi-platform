import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';

/**
 * Journal writes vs account deletion on a REAL multi-connection PostgreSQL (Neon). The invariant under
 * test: once a member's deletion has established its barrier, no journal entry can be created, changed,
 * replayed or left behind, and a deletion is never reported complete while journal data remains.
 *
 * Two kinds of test:
 *   - DETERMINISTIC ones hold the journal lock (or an uncommitted write) open in a separate transaction to
 *     force the exact interleaving - a request that passed its check before deletion began, a write that
 *     is mid-flight when deletion starts - and assert the outcome.
 *   - STRESS ones fire many writers and deletions at once, repeated, and assert the invariant (no
 *     surviving entry) whichever side of the barrier each request landed on.
 *
 * SKIPPED unless `TNSI_TEST_DATABASE_URL` is a `.neon.tech` host; refuses the production host. Run:
 *
 *   TNSI_TEST_DATABASE_URL="<isolated Neon database, migrations applied through 0014>" \
 *     pnpm --filter @tnsi/web exec vitest run src/lib/journal.deletion-race.integration.test.ts
 *
 * Creates its own members (tagged with RUN) and deletes them afterwards. Journal text is never logged.
 */
const PRODUCTION_DB_HOST = 'ep-damp-flower-ayp7i2gc';
const TEST_URL = process.env.TNSI_TEST_DATABASE_URL;
const enabled =
  !!TEST_URL && TEST_URL.includes('.neon.tech') && !TEST_URL.includes(PRODUCTION_DB_HOST);
const RUN = `journal-race-${Date.now()}`;
const ROUNDS = 8;
/**
 * Test B does the most work per round: three creates, six edits and saves and a delete, all racing a full
 * account deletion (which, since PR #54, also erases the member's activity and queues the CRM job). Against a
 * network database that outgrew the suite's 240 s default (it timed out there on 17 Nov 2026 without
 * reaching a single assertion). A longer budget changes no assertion and no round count.
 */
const B_TIMEOUT_MS = 900_000;

const auth = vi.hoisted(() => ({ id: '', clerkUserId: '' }));

vi.mock('@/lib/auth-api', () => ({
  requireMemberAccess: async () => ({ id: auth.id }),
  requireAuth: async () => ({ id: auth.id, clerkUserId: auth.clerkUserId }),
  memberAccessErrorResponse: () => new Response(null, { status: 401 }),
}));

vi.mock('@tnsi/integrations', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@tnsi/integrations')>()),
  // Flowi is faked, like Clerk: no network, and "this member has no CRM contact". The CRM step of
  // account deletion is covered by account-erasure.integration.test.ts.
  findFlowiContactIdByEmail: async () => null,
  suppressFlowiContact: async () => false,
  deleteFlowiContact: async () => false,
}));

vi.mock('@tnsi/db', async () => {
  const schema = await import('@tnsi/db/schema');
  const { createRequire } = await import('node:module');
  const postgres = createRequire(new URL('../../../../packages/db/package.json', import.meta.url))(
    'postgres',
  ) as (url: string, options: Record<string, unknown>) => never;
  const { drizzle } = await import('drizzle-orm/postgres-js');
  const client = postgres(process.env.TNSI_TEST_DATABASE_URL!, {
    prepare: false,
    max: 20, // a real pool: this is what makes requests genuinely concurrent
    idle_timeout: 20,
    connect_timeout: 15,
  });
  return { ...schema, schema, db: drizzle(client, { schema }) };
});

type Mods = {
  db: typeof import('@tnsi/db').db;
  s: typeof import('@tnsi/db/schema');
  collection: typeof import('../app/api/v1/journal/entries/route');
  single: typeof import('../app/api/v1/journal/entries/[id]/route');
  accountLib: typeof import('./account-deletion');
  state: typeof import('./deletion-state');
  journal: typeof import('./journal');
  access: typeof import('./journal-access');
  sync: typeof import('./user-sync-ops');
  d: typeof import('drizzle-orm');
};
let m: Mods;
const userIds: string[] = [];

async function newUser(label: string) {
  const [row] = await m.db
    .insert(m.s.users)
    .values({ clerkUserId: `${RUN}-${label}`, email: `${RUN}-${label}@example.test` })
    .returning();
  userIds.push(row!.id);
  auth.id = row!.id;
  auth.clerkUserId = row!.clerkUserId;
  return row!;
}

const jsonReq = (method: string, body: unknown) =>
  new Request('http://x', {
    method,
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
const params = (id: string) => ({ params: Promise.resolve({ id }) });
const create = (body: unknown) => m.collection.POST(jsonReq('POST', body));
const patch = (id: string, body: unknown) => m.single.PATCH(jsonReq('PATCH', body), params(id));
const del = (id: string) =>
  m.single.DELETE(new Request('http://x', { method: 'DELETE' }), params(id));
const countFor = async (userId: string) =>
  (await m.db.select().from(m.s.journalEntries).where(m.d.eq(m.s.journalEntries.userId, userId)))
    .length;
const markerCount = async (userId: string) =>
  (
    await m.db
      .select()
      .from(m.s.accountDeletionRequests)
      .where(m.d.eq(m.s.accountDeletionRequests.userId, userId))
  ).length;
const userRow = async (userId: string) =>
  (await m.db.select().from(m.s.users).where(m.d.eq(m.s.users.id, userId)))[0]!;
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Real dependencies, with only the Clerk network call replaced (Clerk is covered by its own tests). */
async function deletionDeps(deleteIdentity: (id: string) => Promise<void> = async () => {}) {
  const real = await m.accountLib.realAccountDeletionDeps();
  return { ...real, deleteIdentity };
}
const deleteAccountFor = async (u: { id: string; clerkUserId: string }) =>
  m.accountLib.deleteAccount({ id: u.id, clerkUserId: u.clerkUserId }, await deletionDeps());

/** Settles with 'pending' unless `p` resolves within `ms` - proves a call is BLOCKED on a lock. */
async function stillBlocked(p: Promise<unknown>, ms = 700): Promise<boolean> {
  const marker = Symbol('blocked');
  const winner = await Promise.race([
    p.then(
      () => 'done',
      () => 'done',
    ),
    sleep(ms).then(() => marker),
  ]);
  return winner === marker;
}

/** A transaction held open by the test, so an exact interleaving can be forced. */
function holdTransaction(
  work: (tx: Parameters<Parameters<Mods['db']['transaction']>[0]>[0]) => Promise<void>,
) {
  let release!: () => void;
  const released = new Promise<void>((r) => (release = r));
  let ready!: () => void;
  const isReady = new Promise<void>((r) => (ready = r));
  const finished = m.db.transaction(async (tx) => {
    await work(tx);
    ready();
    await released;
  });
  return { release, isReady, finished };
}

describe.skipIf(!enabled)(
  'Journal writes vs account deletion (real PostgreSQL)',
  { timeout: 240_000 },
  () => {
    beforeAll(async () => {
      process.env.DATABASE_URL = TEST_URL!;
      const [db, s, collection, single, accountLib, state, journal, access, sync, d] =
        await Promise.all([
          import('@tnsi/db').then((x) => x.db),
          import('@tnsi/db/schema'),
          import('../app/api/v1/journal/entries/route'),
          import('../app/api/v1/journal/entries/[id]/route'),
          import('./account-deletion'),
          import('./deletion-state'),
          import('./journal'),
          import('./journal-access'),
          import('./user-sync-ops'),
          import('drizzle-orm'),
        ]);
      m = { db, s, collection, single, accountLib, state, journal, access, sync, d };
      vi.spyOn(console, 'error').mockImplementation(() => {});
    }, 120_000);

    afterAll(async () => {
      if (!m) return;
      if (userIds.length) await m.db.delete(m.s.users).where(m.d.inArray(m.s.users.id, userIds));
    }, 120_000);

    // ---------------------------------------------------------------- Test A
    it('A1. a request that passed its check BEFORE deletion cannot write after it (the stale-authorisation race)', async () => {
      const u = await newUser('a1');
      await create({ content: 'before', status: 'saved' });
      // The in-flight request: it has already been authorised (requireJournalAccess succeeded).
      await m.access.requireJournalAccess();

      const result = await deleteAccountFor(u);
      expect(result.status).toBe('deleted');
      expect(await countFor(u.id)).toBe(0);

      // ...and only now does that already-authorised request reach the database.
      await expect(
        m.journal.createJournalEntry(u.id, {
          id: crypto.randomUUID(),
          content: 'late',
          status: 'saved',
          entryType: 'independent',
        } as never),
      ).rejects.toBeInstanceOf(m.state.AccountDeletionPendingError);
      expect(await countFor(u.id)).toBe(0);
    });

    it('A2. a write that is mid-flight when deletion starts commits first, deletion waits for it, and the purge removes it', async () => {
      const u = await newUser('a2');
      const entryId = crypto.randomUUID();
      // A journal write holding the member's shared lock with an UNCOMMITTED row, exactly as a real one does.
      const inflight = holdTransaction(async (tx) => {
        await m.state.lockJournalShared(tx, u.id);
        await m.state.assertJournalWritable(tx, u.id);
        await tx
          .insert(m.s.journalEntries)
          .values({ id: entryId, userId: u.id, content: 'in flight', status: 'saved' });
      });
      await inflight.isReady;

      const deletion = deleteAccountFor(u);
      expect(await stillBlocked(deletion)).toBe(true); // the barrier cannot be established under a running write
      expect(await markerCount(u.id)).toBe(0);

      inflight.release();
      await inflight.finished;
      expect((await deletion).status).toBe('deleted');
      expect(await countFor(u.id)).toBe(0); // the write that won the race was then purged
      expect(await markerCount(u.id)).toBe(1);
    });

    it('A3. creates racing a deletion, repeated: never a surviving entry', async () => {
      for (let round = 0; round < ROUNDS; round += 1) {
        const u = await newUser(`a3-${round}`);
        const [responses, result] = await Promise.all([
          Promise.all(
            Array.from({ length: 8 }, (_, i) =>
              create({
                id: crypto.randomUUID(),
                content: `race ${i}`,
                status: i % 2 ? 'saved' : 'draft',
              }),
            ),
          ),
          deleteAccountFor(u),
        ]);
        expect(result.status).toBe('deleted');
        for (const r of responses) expect([201, 423]).toContain(r.status);
        expect(await countFor(u.id)).toBe(0);
        expect((await userRow(u.id)).deletedAt).toBeInstanceOf(Date);
      }
    });

    // ---------------------------------------------------------------- Test B
    it(
      'B. edits, saves and deletes racing a deletion: nothing survives',
      async () => {
        for (let round = 0; round < ROUNDS; round += 1) {
          const u = await newUser(`b-${round}`);
          const ids: string[] = [];
          for (let i = 0; i < 3; i += 1) {
            ids.push(
              (await (await create({ content: `keep ${i}`, status: 'draft' })).json()).data.id,
            );
          }
          const [responses, result] = await Promise.all([
            Promise.all([
              ...ids.map((id) => patch(id, { content: 'edited after deletion began' })),
              ...ids.map((id) => patch(id, { status: 'saved' })),
              del(ids[0]!),
            ]),
            deleteAccountFor(u),
          ]);
          expect(result.status).toBe('deleted');
          for (const r of responses) expect([200, 404, 423]).toContain(r.status);
          expect(await countFor(u.id)).toBe(0);
        }
      },
      B_TIMEOUT_MS,
    );

    // ---------------------------------------------------------------- Test C
    it('C. drafts (the autosave path) cannot be created or touched into survival', async () => {
      for (let round = 0; round < ROUNDS; round += 1) {
        const u = await newUser(`c-${round}`);
        const draftId = crypto.randomUUID();
        const [responses, result] = await Promise.all([
          Promise.all([
            ...Array.from({ length: 6 }, (_, i) =>
              create({ id: crypto.randomUUID(), content: `draft ${i}` }),
            ),
            create({ id: draftId, content: 'autosave' }),
            sleep(5).then(() => patch(draftId, { content: 'autosave again' })),
            sleep(10).then(() => create({ id: draftId, content: 'autosave replay' })),
          ]),
          deleteAccountFor(u),
        ]);
        expect(result.status).toBe('deleted');
        for (const r of responses) expect([200, 201, 404, 423]).toContain(r.status);
        expect(await countFor(u.id)).toBe(0);
      }
    });

    // ---------------------------------------------------------------- Test D
    it('D. a client id that was created before deletion cannot be re-created by a retry - including while Clerk is failing', async () => {
      const u = await newUser('d');
      const id = crypto.randomUUID();
      expect((await create({ id, content: 'once', status: 'saved' })).status).toBe(201);

      // Clerk fails: deletion stays PENDING, the journal is already gone and locked.
      const failing = await m.accountLib.deleteAccount(
        { id: u.id, clerkUserId: u.clerkUserId },
        await deletionDeps(async () => {
          throw new Error('clerk unavailable');
        }),
      );
      expect(failing).toEqual({ status: 'pending', stage: 'identity_provider' });
      expect(await markerCount(u.id)).toBe(1);
      expect(await countFor(u.id)).toBe(0);

      // The replay is refused by the early check (423) and, if it somehow got past it, by the lock-protected write.
      expect((await create({ id, content: 'once', status: 'saved' })).status).toBe(423);
      await expect(
        m.journal.createJournalEntry(u.id, {
          id,
          content: 'once',
          status: 'saved',
          entryType: 'independent',
        } as never),
      ).rejects.toBeInstanceOf(m.state.AccountDeletionPendingError);
      expect(await countFor(u.id)).toBe(0);

      // Retrying the deletion is safe and completes it; the entry is still gone.
      expect((await deleteAccountFor(u)).status).toBe('deleted');
      expect(await countFor(u.id)).toBe(0);
      await expect(
        m.journal.createJournalEntry(u.id, {
          id,
          content: 'once',
          status: 'saved',
          entryType: 'independent',
        } as never),
      ).rejects.toBeInstanceOf(m.state.AccountDeletionPendingError);
      expect(await countFor(u.id)).toBe(0);
    });

    // ---------------------------------------------------------------- Test E
    it('E. concurrent deletion requests for one member: idempotent, one marker, one completion, journal empty', async () => {
      const u = await newUser('e');
      for (let i = 0; i < 4; i += 1) await create({ content: `e${i}`, status: 'saved' });
      const results = await Promise.all(Array.from({ length: 6 }, () => deleteAccountFor(u)));
      for (const r of results) expect(r.status).toBe('deleted');
      expect(await countFor(u.id)).toBe(0);
      expect(await markerCount(u.id)).toBe(1);
      const first = (await userRow(u.id)).deletedAt!.getTime();
      await deleteAccountFor(u);
      expect((await userRow(u.id)).deletedAt!.getTime()).toBe(first); // a retry never moves the completion time
    });

    // ---------------------------------------------------------------- Test F
    it('F. account deletion, Clerk user.deleted webhooks and journal writers all overlapping: transactional, idempotent, empty', async () => {
      for (let round = 0; round < 4; round += 1) {
        const u = await newUser(`f-${round}`);
        await create({ content: 'seed', status: 'saved' });
        const settled = await Promise.allSettled([
          deleteAccountFor(u),
          deleteAccountFor(u),
          m.sync.userSyncOps.softDeleteUser(u.clerkUserId),
          m.sync.userSyncOps.softDeleteUser(u.clerkUserId),
          m.sync.userSyncOps.softDeleteUser(u.clerkUserId),
          ...Array.from({ length: 6 }, (_, i) =>
            create({ id: crypto.randomUUID(), content: `f${i}`, status: 'draft' }),
          ),
        ]);
        expect(settled.filter((r) => r.status === 'rejected')).toHaveLength(0);
        expect(await countFor(u.id)).toBe(0);
        const row = await userRow(u.id);
        expect(row.deletedAt).toBeInstanceOf(Date);
        const first = row.deletedAt!.getTime();
        await m.sync.userSyncOps.softDeleteUser(u.clerkUserId); // a late webhook retry
        expect((await userRow(u.id)).deletedAt!.getTime()).toBe(first);
      }
    });

    it('F2. a deletion that never wrote a marker (Clerk dashboard -> webhook only) also refuses an in-flight write', async () => {
      const u = await newUser('f2');
      await m.access.requireJournalAccess(); // authorised before the webhook
      await m.sync.userSyncOps.softDeleteUser(u.clerkUserId);
      expect(await markerCount(u.id)).toBe(0);
      await expect(
        m.journal.createJournalEntry(u.id, {
          id: crypto.randomUUID(),
          content: 'late',
          status: 'draft',
          entryType: 'independent',
        } as never),
      ).rejects.toBeInstanceOf(m.state.AccountDeletionPendingError);
      expect(await countFor(u.id)).toBe(0);
    });

    // ---------------------------------------------------------------- Test G
    it("G. one member's deletion barrier does not block another member; writers are only held for the member being deleted", async () => {
      const a = await newUser('g-a');
      const b = await newUser('g-b');
      // Member A's deletion holds A's EXCLUSIVE lock (and commits the marker) for a while.
      const holdA = holdTransaction(async (tx) => {
        await m.state.lockJournalExclusive(tx, a.id);
        await tx.insert(m.s.accountDeletionRequests).values({ userId: a.id });
      });
      await holdA.isReady;

      const writeA = m.journal.createJournalEntry(a.id, {
        id: crypto.randomUUID(),
        content: 'a',
        status: 'draft',
        entryType: 'independent',
      } as never);
      const writeAOutcome = writeA.then(
        () => 'wrote',
        (e) => (e instanceof m.state.AccountDeletionPendingError ? 'refused' : 'error'),
      );
      let bDone = false;
      const writeB = Promise.all([
        m.journal.createJournalEntry(b.id, {
          id: crypto.randomUUID(),
          content: 'b1',
          status: 'saved',
          entryType: 'independent',
        } as never),
        m.journal.createJournalEntry(b.id, {
          id: crypto.randomUUID(),
          content: 'b2',
          status: 'draft',
          entryType: 'independent',
        } as never),
      ]).then(() => {
        bDone = true;
      });

      await writeB;
      expect(bDone).toBe(true); // B finished while A's lock was still held
      expect(await stillBlocked(writeAOutcome)).toBe(true); // A's write is waiting on A's own barrier

      holdA.release();
      await holdA.finished;
      expect(await writeAOutcome).toBe('refused'); // once the barrier committed, A's write is refused
      expect(await countFor(a.id)).toBe(0);
      expect(await countFor(b.id)).toBe(2);
    });

    it('G2. concurrent writers for the same member do not block each other (shared lock)', async () => {
      const u = await newUser('g2');
      const holdShared = holdTransaction(async (tx) => {
        await m.state.lockJournalShared(tx, u.id);
      });
      await holdShared.isReady;
      const r = await create({
        id: crypto.randomUUID(),
        content: 'not blocked by another writer',
        status: 'saved',
      });
      expect(r.status).toBe(201);
      holdShared.release();
      await holdShared.finished;
    });
  },
);
