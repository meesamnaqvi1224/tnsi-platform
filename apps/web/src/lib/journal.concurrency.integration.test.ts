import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';

/**
 * Concurrency tests for My Reflections on a REAL multi-connection PostgreSQL (Neon). A single-session
 * local engine such as PGlite cannot interleave connections, so these only run against a Neon host:
 *
 *   - concurrent creates of ONE client id (a double tap, a retry storm): exactly one entry, one 201, the
 *     rest 200 replays returning the winner's text - never a 5xx, never a duplicate;
 *   - concurrent creates of distinct ids: all succeed, none lost;
 *   - a save racing several edits on a draft: it ends saved, never reverted, created_at unchanged;
 *   - concurrent attempts to revert a saved entry to draft: every one refused (409);
 *   - concurrent deletes of one entry: exactly one 200;
 *   - concurrent "mark deletion pending": exactly one marker row, first time kept;
 *   - concurrent Clerk `user.deleted` deliveries and concurrent account-deletion requests: all complete,
 *     one completion time, the journal purged, no half-state.
 *
 * SKIPPED unless `TNSI_TEST_DATABASE_URL` is a `.neon.tech` host; refuses the production host. Run:
 *
 *   TNSI_TEST_DATABASE_URL="<isolated Neon database, migrations applied through 0014>" \
 *     pnpm --filter @tnsi/web exec vitest run src/lib/journal.concurrency.integration.test.ts
 *
 * Creates its own members (tagged with RUN) and deletes them afterwards.
 */
const PRODUCTION_DB_HOST = 'ep-damp-flower-ayp7i2gc';
const TEST_URL = process.env.TNSI_TEST_DATABASE_URL;
const enabled =
  !!TEST_URL && TEST_URL.includes('.neon.tech') && !TEST_URL.includes(PRODUCTION_DB_HOST);
const RUN = `journal-conc-${Date.now()}`;
const N = 12;

const auth = vi.hoisted(() => ({ id: '', clerkUserId: '' }));

vi.mock('@/lib/auth-api', () => ({
  requireMemberAccess: async () => ({ id: auth.id }),
  requireAuth: async () => ({ id: auth.id, clerkUserId: auth.clerkUserId }),
  memberAccessErrorResponse: () => new Response(null, { status: 401 }),
}));

vi.mock('@tnsi/db', async () => {
  const schema = await import('@tnsi/db/schema');
  // `postgres` is the db package's dependency, not the web app's, so it is resolved from there.
  const { createRequire } = await import('node:module');
  const postgres = createRequire(new URL('../../../../packages/db/package.json', import.meta.url))(
    'postgres',
  ) as (url: string, options: Record<string, unknown>) => never;
  const { drizzle } = await import('drizzle-orm/postgres-js');
  const client = postgres(process.env.TNSI_TEST_DATABASE_URL!, {
    prepare: false,
    max: 10, // a real pool: this is what makes the requests genuinely concurrent
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
const rowOf = async (id: string) =>
  (await m.db.select().from(m.s.journalEntries).where(m.d.eq(m.s.journalEntries.id, id)))[0];
const countFor = async (userId: string) =>
  (await m.db.select().from(m.s.journalEntries).where(m.d.eq(m.s.journalEntries.userId, userId)))
    .length;
const statuses = (responses: Response[]) => responses.map((r) => r.status).sort();

describe.skipIf(!enabled)(
  'My Reflections under real concurrency (Neon)',
  { timeout: 180_000 },
  () => {
    beforeAll(async () => {
      process.env.DATABASE_URL = TEST_URL!;
      const [db, s, collection, single, accountLib, sync, d] = await Promise.all([
        import('@tnsi/db').then((x) => x.db),
        import('@tnsi/db/schema'),
        import('../app/api/v1/journal/entries/route'),
        import('../app/api/v1/journal/entries/[id]/route'),
        import('./account-deletion'),
        import('./user-sync-ops'),
        import('drizzle-orm'),
      ]);
      m = { db, s, collection, single, accountLib, sync, d };
      vi.spyOn(console, 'error').mockImplementation(() => {});
    }, 120_000);

    afterAll(async () => {
      if (!m) return;
      // One statement, not one round trip per user: over a network database single deletes can outlast the hook timeout.
      if (userIds.length) await m.db.delete(m.s.users).where(m.d.inArray(m.s.users.id, userIds));
    }, 120_000);

    it(`${N} concurrent creates of ONE client id: exactly one entry, one 201, the rest 200 replays of the winner`, async () => {
      const u = await newUser('same-id');
      const id = crypto.randomUUID();
      const responses = await Promise.all(
        Array.from({ length: N }, (_, i) =>
          create({ id, content: `writer ${i}`, status: 'saved' }),
        ),
      );

      const codes = statuses(responses);
      expect(codes.filter((c) => c === 201)).toHaveLength(1);
      expect(codes.filter((c) => c === 200)).toHaveLength(N - 1);
      expect(codes.some((c) => c >= 500)).toBe(false);

      const rows = await m.db
        .select()
        .from(m.s.journalEntries)
        .where(m.d.eq(m.s.journalEntries.id, id));
      expect(rows).toHaveLength(1);
      expect(await countFor(u.id)).toBe(1);
      // first write wins: every replay returned the stored text, not its own
      for (const res of responses) expect((await res.json()).data.content).toBe(rows[0]!.content);
    });

    it(`${N} concurrent creates of distinct ids: all succeed and none is lost`, async () => {
      const u = await newUser('distinct');
      const responses = await Promise.all(
        Array.from({ length: N }, (_, i) =>
          create({ id: crypto.randomUUID(), content: `entry ${i}`, status: 'saved' }),
        ),
      );
      expect(statuses(responses)).toEqual(Array(N).fill(201));
      expect(await countFor(u.id)).toBe(N);
    });

    it('a save racing several edits on a draft ends saved, never reverted, with created_at unchanged', async () => {
      await newUser('save-vs-edit');
      const draft = (await (await create({ content: 'start' })).json()).data;
      const responses = await Promise.all([
        patch(draft.id, { status: 'saved' }),
        ...Array.from({ length: 5 }, (_, i) => patch(draft.id, { content: `edit ${i}` })),
      ]);
      expect(statuses(responses).every((c) => c === 200)).toBe(true);
      const row = await rowOf(draft.id);
      expect(row?.status).toBe('saved');
      expect(row?.createdAt.getTime()).toBe(new Date(draft.createdAt).getTime());
      expect(row?.content.length).toBeGreaterThan(0);
    });

    it('concurrent attempts to revert a saved entry to draft are all refused, alongside edits', async () => {
      await newUser('revert');
      const saved = (await (await create({ content: 'keep me', status: 'saved' })).json()).data;
      const reverts = await Promise.all(
        Array.from({ length: 6 }, () => patch(saved.id, { status: 'draft' })),
      );
      expect(statuses(reverts)).toEqual(Array(6).fill(409));
      const mixed = await Promise.all([
        patch(saved.id, { status: 'draft' }),
        patch(saved.id, { content: 'still fine' }),
        patch(saved.id, { status: 'draft' }),
      ]);
      expect(statuses(mixed)).toEqual([200, 409, 409]);
      expect((await rowOf(saved.id))?.status).toBe('saved');
    });

    it('concurrent deletes of one entry: exactly one 200, the rest 404', async () => {
      await newUser('delete');
      const entry = (await (await create({ content: 'bye', status: 'saved' })).json()).data;
      const responses = await Promise.all(Array.from({ length: 6 }, () => del(entry.id)));
      expect(statuses(responses)).toEqual([200, 404, 404, 404, 404, 404]);
      expect(await rowOf(entry.id)).toBeUndefined();
    });

    it('10 concurrent "mark deletion pending": exactly one marker, first time kept', async () => {
      const u = await newUser('marker');
      await Promise.all(Array.from({ length: 10 }, () => m.accountLib.markDeletionPending(u.id)));
      const rows = await m.db
        .select()
        .from(m.s.accountDeletionRequests)
        .where(m.d.eq(m.s.accountDeletionRequests.userId, u.id));
      expect(rows).toHaveLength(1);
      const first = rows[0]!.requestedAt.getTime();
      await Promise.all(Array.from({ length: 5 }, () => m.accountLib.markDeletionPending(u.id)));
      const again = await m.db
        .select()
        .from(m.s.accountDeletionRequests)
        .where(m.d.eq(m.s.accountDeletionRequests.userId, u.id));
      expect(again).toHaveLength(1);
      expect(again[0]!.requestedAt.getTime()).toBe(first);
    });

    it('5 concurrent Clerk user.deleted deliveries: all complete, one completion time, journal purged', async () => {
      const u = await newUser('webhooks');
      for (let i = 0; i < 3; i += 1)
        await create({ content: `w${i}`, status: i === 0 ? 'draft' : 'saved' });
      const results = await Promise.allSettled(
        Array.from({ length: 5 }, () => m.sync.userSyncOps.softDeleteUser(u.clerkUserId)),
      );
      expect(results.filter((r) => r.status === 'rejected')).toHaveLength(0);
      expect(await countFor(u.id)).toBe(0);
      const [row] = await m.db.select().from(m.s.users).where(m.d.eq(m.s.users.id, u.id));
      expect(row?.deletedAt).toBeInstanceOf(Date);
      const first = row!.deletedAt!.getTime();
      await m.sync.userSyncOps.softDeleteUser(u.clerkUserId); // a late retry
      const [later] = await m.db.select().from(m.s.users).where(m.d.eq(m.s.users.id, u.id));
      expect(later!.deletedAt!.getTime()).toBe(first);
    });

    it('3 concurrent account-deletion requests: none fails, one marker, one completion, journal purged', async () => {
      const u = await newUser('deletions');
      for (let i = 0; i < 4; i += 1) await create({ content: `d${i}`, status: 'saved' });
      const real = await m.accountLib.realAccountDeletionDeps();
      const deps = { ...real, deleteIdentity: async () => {} }; // Clerk is faked here (see docs, blocker 4)
      const results = await Promise.all(
        Array.from({ length: 3 }, () =>
          m.accountLib.deleteAccount({ id: u.id, clerkUserId: u.clerkUserId }, deps),
        ),
      );
      for (const r of results) expect(['deleted', 'pending_cleanup']).toContain(r.status);
      expect(await countFor(u.id)).toBe(0);
      const markers = await m.db
        .select()
        .from(m.s.accountDeletionRequests)
        .where(m.d.eq(m.s.accountDeletionRequests.userId, u.id));
      expect(markers).toHaveLength(1);
      const [row] = await m.db.select().from(m.s.users).where(m.d.eq(m.s.users.id, u.id));
      expect(row?.deletedAt).toBeInstanceOf(Date);
    });
  },
);
