import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * Real-PostgreSQL tests for My Reflections (journal) and the account-deletion purge: ownership
 * isolation, the draft/saved lifecycle, ordering and paging, idempotent create, references, the
 * database-level guards, the transactional purge on account deletion and its failure/retry behaviour,
 * and that nothing the member wrote is ever logged.
 *
 * SKIPPED unless `TNSI_TEST_DATABASE_URL` is set; never reads `DATABASE_URL` from the environment or any
 * file; refuses the production host. The target must be an ISOLATED database with the repository's
 * migrations applied (through 0014). Run with:
 *
 *   TNSI_TEST_DATABASE_URL="<isolated database>" \
 *     pnpm --filter @tnsi/web exec vitest run src/lib/journal.integration.test.ts
 *
 * It creates its own members and practices (all tagged with RUN) and deletes them afterwards.
 *
 * The connection pool is replaced for this file only (see the `@tnsi/db` mock): one connection on a
 * single-session local engine such as PGlite, the normal pool on a real server. No repository source is
 * changed for testing.
 */

const PRODUCTION_DB_HOST = 'ep-damp-flower-ayp7i2gc';
const TEST_URL = process.env.TNSI_TEST_DATABASE_URL;
const enabled = !!TEST_URL && !TEST_URL.includes(PRODUCTION_DB_HOST);
const RUN = `journal-it-${Date.now()}`;
/** Appears in every entry the tests write, so a leak into any log is detectable. */
const SECRET = `SECRET-${RUN}`;
const NO_STORE = 'private, no-store, max-age=0';

const auth = vi.hoisted(() => ({ currentUserId: null as string | null }));

vi.mock('@/lib/auth-api', async () => {
  const { forbidden, unauthorized } = await import('@/lib/api-response');
  /**
   * Like the real getAuthUser, this loads the member's CURRENT user row from the database on every call
   * (so the account state reflects the database at that moment, exactly as in production), and
   * treats a missing or deleted user as not signed in.
   */
  const currentUser = async () => {
    if (!auth.currentUserId) throw new Error('UNAUTHENTICATED');
    const { db, users } = await import('@tnsi/db');
    const { eq } = await import('drizzle-orm');
    const [row] = await db.select().from(users).where(eq(users.id, auth.currentUserId)).limit(1);
    if (!row || row.deletedAt) throw new Error('UNAUTHENTICATED');
    return { ...row, entitlements: null };
  };
  return {
    requireMemberAccess: currentUser,
    memberAccessErrorResponse: () => unauthorized(),
    requireAuth: currentUser,
    _forbidden: forbidden,
  };
});

vi.mock('@tnsi/db', async () => {
  const schema = await import('@tnsi/db/schema');
  // `postgres` is the db package's dependency, not the web app's, so it is resolved from there.
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
    connect_timeout: 10,
  });
  return { ...schema, schema, db: drizzle(client, { schema }) };
});

type Mods = {
  db: typeof import('@tnsi/db').db;
  s: typeof import('@tnsi/db/schema');
  collection: typeof import('../app/api/v1/journal/entries/route');
  single: typeof import('../app/api/v1/journal/entries/[id]/route');
  account: typeof import('../app/api/v1/me/account/route');
  accountLib: typeof import('./account-deletion');
  sync: typeof import('./user-sync-ops');
  journey: typeof import('./journey');
  d: typeof import('drizzle-orm');
};
let m: Mods;
const userIds: string[] = [];
const practiceIds: string[] = [];

async function newUser(label: string) {
  const [row] = await m.db
    .insert(m.s.users)
    .values({ clerkUserId: `${RUN}-${label}`, email: `${RUN}-${label}@example.test` })
    .returning();
  userIds.push(row!.id);
  return row!;
}

async function newPractice(title: string) {
  const [row] = await m.db
    .insert(m.s.practices)
    .values({
      sanityId: `${RUN}-${title}`,
      title,
      contentType: 'audio',
      sanityData: {},
      isPublished: true,
    })
    .returning();
  practiceIds.push(row!.id);
  return row!;
}

async function newCompletion(userId: string, practiceId: string) {
  const [row] = await m.db
    .insert(m.s.practiceCompletions)
    .values({ userId, practiceId, progressPct: 1, completed: true, completedAt: new Date() })
    .returning();
  return row!;
}

const as = (user: { id: string } | null) => {
  auth.currentUserId = user?.id ?? null;
};
const jsonReq = (method: string, body: unknown) =>
  new Request('http://x/api/v1/journal/entries', {
    method,
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
const params = (id: string) => ({ params: Promise.resolve({ id }) });
const get = (id: string) => m.single.GET(new Request('http://x'), params(id));
const patch = (id: string, body: unknown) => m.single.PATCH(jsonReq('PATCH', body), params(id));
const del = (id: string) =>
  m.single.DELETE(new Request('http://x', { method: 'DELETE' }), params(id));
const create = (body: unknown) => m.collection.POST(jsonReq('POST', body));
const list = (query = '') =>
  m.collection.GET(new Request(`http://x/api/v1/journal/entries${query}`));
const data = async (res: Response) => (await res.json()).data;
const rowOf = async (id: string) =>
  (await m.db.select().from(m.s.journalEntries).where(m.d.eq(m.s.journalEntries.id, id)))[0];
const countFor = async (userId: string) =>
  (await m.db.select().from(m.s.journalEntries).where(m.d.eq(m.s.journalEntries.userId, userId)))
    .length;
/** When this member's account deletion was requested (the `account_deletion_requests` row), or null. */
const markerOf = async (id: string) =>
  (
    await m.db
      .select()
      .from(m.s.accountDeletionRequests)
      .where(m.d.eq(m.s.accountDeletionRequests.userId, id))
  )[0]?.requestedAt ?? null;
const newUuid = () => crypto.randomUUID();

let consoleSpies: ReturnType<typeof vi.spyOn>[] = [];

// Every query is a round trip to a database, so these tests need far more than vitest's 5 s default.
describe.skipIf(!enabled)('My Reflections journal on real PostgreSQL', { timeout: 120_000 }, () => {
  let A: { id: string; clerkUserId: string };
  let B: { id: string; clerkUserId: string };

  beforeAll(async () => {
    process.env.DATABASE_URL = TEST_URL!;
    const [db, s, collection, single, account, accountLib, sync, journey, d] = await Promise.all([
      import('@tnsi/db').then((x) => x.db),
      import('@tnsi/db/schema'),
      import('../app/api/v1/journal/entries/route'),
      import('../app/api/v1/journal/entries/[id]/route'),
      import('../app/api/v1/me/account/route'),
      import('./account-deletion'),
      import('./user-sync-ops'),
      import('./journey'),
      import('drizzle-orm'),
    ]);
    m = { db, s, collection, single, account, accountLib, sync, journey, d };
    A = await newUser('a');
    B = await newUser('b');
  });

  afterAll(async () => {
    if (!m) return;
    for (const id of userIds) await m.db.delete(m.s.users).where(m.d.eq(m.s.users.id, id));
    for (const id of practiceIds)
      await m.db.delete(m.s.practices).where(m.d.eq(m.s.practices.id, id));
  });

  beforeEach(() => {
    consoleSpies = (['error', 'warn', 'log', 'info', 'debug'] as const).map((method) =>
      vi.spyOn(console, method).mockImplementation(() => {}),
    );
    as(A);
  });
  afterEach(() => {
    // whatever a test did, nothing it logged may contain what the member wrote
    for (const spy of consoleSpies) expect(JSON.stringify(spy.mock.calls)).not.toContain('SECRET-');
    vi.restoreAllMocks();
    as(null);
  });

  describe('authentication', () => {
    it('rejects every route when nobody is signed in', async () => {
      as(null);
      const id = newUuid();
      for (const res of [
        await list(),
        await create({ content: SECRET }),
        await get(id),
        await patch(id, { content: SECRET }),
        await del(id),
      ]) {
        expect(res.status).toBe(401);
        expect(res.headers.get('Cache-Control')).toBe(NO_STORE);
      }
    });

    it('serves a signed-in member', async () => {
      const res = await create({ content: `${SECRET} hello`, status: 'saved' });
      expect(res.status).toBe(201);
      expect(res.headers.get('Cache-Control')).toBe(NO_STORE);
    });
  });

  describe('ownership isolation', () => {
    it("a member cannot read, edit, delete or list another member's entry - each is a 404 and nothing changes", async () => {
      const entry = await data(
        await create({ title: 'private', content: `${SECRET} a`, status: 'saved' }),
      );

      as(B);
      expect((await get(entry.id)).status).toBe(404);
      expect((await patch(entry.id, { content: 'overwritten' })).status).toBe(404);
      expect((await patch(entry.id, { status: 'saved' })).status).toBe(404);
      expect((await del(entry.id)).status).toBe(404);
      const bList = await data(await list());
      expect(bList.entries.map((e: { id: string }) => e.id)).not.toContain(entry.id);
      const bDrafts = await data(await list('?status=draft'));
      expect(bDrafts.entries.map((e: { id: string }) => e.id)).not.toContain(entry.id);

      // A's entry is exactly as it was
      const row = await rowOf(entry.id);
      expect(row?.content).toBe(`${SECRET} a`);
      expect(row?.userId).toBe(A.id);
    });

    it('the owner is always the authenticated member: a user id in the body is ignored', async () => {
      const entry = await data(await create({ content: SECRET, userId: B.id, user_id: B.id }));
      expect((await rowOf(entry.id))?.userId).toBe(A.id);
      expect(entry).not.toHaveProperty('userId');
      expect(entry).not.toHaveProperty('user_id');
    });
  });

  describe('drafts and saving', () => {
    it("creates a draft by default; it is not in the history but is in the member's drafts", async () => {
      const res = await create({ content: `${SECRET} draft` });
      expect(res.status).toBe(201);
      const draft = await data(res);
      expect(draft).toMatchObject({ status: 'draft', entryType: 'independent' });

      const history = await data(await list());
      expect(history.entries.map((e: { id: string }) => e.id)).not.toContain(draft.id);
      const drafts = await data(await list('?status=draft'));
      expect(drafts.entries.map((e: { id: string }) => e.id)).toContain(draft.id);
    });

    it('editing keeps created_at and moves updated_at', async () => {
      const draft = await data(await create({ content: `${SECRET} v1` }));
      await new Promise((r) => setTimeout(r, 15));
      const edited = await data(await patch(draft.id, { title: 'Title', content: `${SECRET} v2` }));
      expect(edited).toMatchObject({ title: 'Title', content: `${SECRET} v2`, status: 'draft' });
      expect(new Date(edited.createdAt).getTime()).toBe(new Date(draft.createdAt).getTime());
      expect(new Date(edited.updatedAt).getTime()).toBeGreaterThan(
        new Date(draft.updatedAt).getTime(),
      );
    });

    it('draft -> saved works, appears in the history, and keeps created_at', async () => {
      const draft = await data(await create({ content: `${SECRET} to save` }));
      await new Promise((r) => setTimeout(r, 15));
      const saved = await data(await patch(draft.id, { status: 'saved' }));
      expect(saved.status).toBe('saved');
      expect(new Date(saved.createdAt).getTime()).toBe(new Date(draft.createdAt).getTime());
      const history = await data(await list());
      expect(history.entries.map((e: { id: string }) => e.id)).toContain(draft.id);
      const drafts = await data(await list('?status=draft'));
      expect(drafts.entries.map((e: { id: string }) => e.id)).not.toContain(draft.id);
    });

    it('a saved entry can be edited, and stays saved', async () => {
      const saved = await data(await create({ content: `${SECRET} one`, status: 'saved' }));
      const edited = await data(await patch(saved.id, { content: `${SECRET} two` }));
      expect(edited).toMatchObject({ status: 'saved', content: `${SECRET} two` });
    });

    it('saved -> draft is refused (409) and the entry is unchanged', async () => {
      const saved = await data(await create({ content: `${SECRET} keep`, status: 'saved' }));
      const res = await patch(saved.id, { status: 'draft', content: `${SECRET} changed` });
      expect(res.status).toBe(409);
      const row = await rowOf(saved.id);
      expect(row).toMatchObject({ status: 'saved', content: `${SECRET} keep` });
    });

    it('will not save an entry with no text, from a draft or on create', async () => {
      const draft = await data(await create({ content: '' }));
      expect((await patch(draft.id, { status: 'saved' })).status).toBe(400);
      expect((await rowOf(draft.id))?.status).toBe('draft');
      expect((await create({ content: '   ', status: 'saved' })).status).toBe(400);
      const saved = await data(await create({ content: `${SECRET} x`, status: 'saved' }));
      expect((await patch(saved.id, { content: '  ' })).status).toBe(400);
    });

    it('supports many entries per member', async () => {
      const before = await countFor(A.id);
      for (let i = 0; i < 4; i += 1)
        await create({ content: `${SECRET} multi ${i}`, status: 'saved' });
      expect(await countFor(A.id)).toBe(before + 4);
    });
  });

  describe('the database guards (a backstop beneath the API)', () => {
    it('refuses saved -> draft even from a direct UPDATE', async () => {
      const saved = await data(await create({ content: `${SECRET} guard`, status: 'saved' }));
      await expect(
        m.db
          .update(m.s.journalEntries)
          .set({ status: 'draft' })
          .where(m.d.eq(m.s.journalEntries.id, saved.id)),
      ).rejects.toMatchObject({ code: '23514' });
      expect((await rowOf(saved.id))?.status).toBe('saved');
    });

    it('pins created_at: an UPDATE that tries to change it is ignored', async () => {
      const entry = await data(await create({ content: `${SECRET} pin`, status: 'saved' }));
      await m.db
        .update(m.s.journalEntries)
        .set({ createdAt: new Date('2001-01-01T00:00:00Z') })
        .where(m.d.eq(m.s.journalEntries.id, entry.id));
      expect((await rowOf(entry.id))?.createdAt.getTime()).toBe(
        new Date(entry.createdAt).getTime(),
      );
    });

    it('refuses to move an entry to another owner', async () => {
      const entry = await data(await create({ content: `${SECRET} owner`, status: 'saved' }));
      await expect(
        m.db
          .update(m.s.journalEntries)
          .set({ userId: B.id })
          .where(m.d.eq(m.s.journalEntries.id, entry.id)),
      ).rejects.toMatchObject({ code: '23514' });
      expect((await rowOf(entry.id))?.userId).toBe(A.id);
    });

    it('enforces the limits and the five conditions in the table itself', async () => {
      const insert = (values: Record<string, unknown>) =>
        m.db.insert(m.s.journalEntries).values({ userId: A.id, ...values } as never);
      await expect(insert({ content: 'a'.repeat(20_001) })).rejects.toMatchObject({
        code: '23514',
      });
      await expect(insert({ title: 'a'.repeat(201) })).rejects.toMatchObject({ code: '23514' });
      await expect(insert({ status: 'saved', content: '  ' })).rejects.toMatchObject({
        code: '23514',
      });
      await expect(insert({ theoryCondition: 'LOW' })).rejects.toMatchObject({ code: '23514' });
      await expect(insert({ theoryCondition: 'Wellbeing' })).rejects.toMatchObject({
        code: '23514',
      });
      await expect(
        insert({ content: 'a'.repeat(20_000), theoryCondition: 'Participation' }),
      ).resolves.toBeDefined();
    });
  });

  describe('history: ordering, paging and preview', () => {
    it("lists the member's saved entries newest first by created_at, with no repeats or gaps across pages", async () => {
      const C = await newUser('order');
      as(C);
      const t = (n: number) => new Date(Date.UTC(2026, 0, 1, 0, 0, n));
      const sameInstant = t(30);
      const rows = [t(10), t(50), sameInstant, sameInstant, t(40), t(20)];
      const ids: string[] = [];
      for (const [i, createdAt] of rows.entries()) {
        const [row] = await m.db
          .insert(m.s.journalEntries)
          .values({ userId: C.id, content: `${SECRET} ${i}`, status: 'saved', createdAt })
          .returning();
        ids.push(row!.id);
      }
      await m.db
        .insert(m.s.journalEntries)
        .values({ userId: C.id, content: `${SECRET} draft`, status: 'draft' });

      const seen: { id: string; createdAt: string }[] = [];
      let offset = 0;
      for (;;) {
        const page = await data(await list(`?limit=2&offset=${offset}`));
        seen.push(...page.entries);
        if (!page.pagination.hasMore) break;
        offset += 2;
      }
      expect(seen).toHaveLength(6); // the draft is not in the history
      expect(new Set(seen.map((e) => e.id)).size).toBe(6); // no repeats
      expect([...seen.map((e) => e.id)].sort()).toEqual([...ids].sort()); // no gaps
      const times = seen.map((e) => new Date(e.createdAt).getTime());
      expect(times).toEqual([...times].sort((a, b) => b - a)); // newest first
    });

    it('hasMore is exact on the last page', async () => {
      const C = await newUser('pages');
      as(C);
      for (let i = 0; i < 3; i += 1) await create({ content: `${SECRET} p${i}`, status: 'saved' });
      expect((await data(await list('?limit=3'))).pagination.hasMore).toBe(false);
      expect((await data(await list('?limit=2'))).pagination.hasMore).toBe(true);
    });

    it('returns a short preview, not the full text', async () => {
      const long = `${SECRET} ${'word '.repeat(2_000)}`;
      const entry = await data(await create({ title: 'Long', content: long, status: 'saved' }));
      const history = await data(await list('?limit=50'));
      const item = history.entries.find((e: { id: string }) => e.id === entry.id);
      expect(item).not.toHaveProperty('content');
      expect(Array.from(item.preview).length).toBeLessThanOrEqual(200);
      expect(item.previewTruncated).toBe(true);
      expect(item.preview.startsWith(SECRET)).toBe(true);
      // the single-entry route still returns all of it
      expect((await data(await get(entry.id))).content).toBe(long);
    });
  });

  describe('idempotent create', () => {
    it('repeating a create with the same id returns the same entry and makes no second row', async () => {
      const id = newUuid();
      const first = await create({ id, content: `${SECRET} original`, status: 'saved' });
      const second = await create({
        id,
        content: `${SECRET} RETRY WITH OTHER TEXT`,
        status: 'saved',
      });
      expect(first.status).toBe(201);
      expect(second.status).toBe(200);
      expect((await data(second)).content).toBe(`${SECRET} original`); // first write wins
      expect(
        (await m.db.select().from(m.s.journalEntries).where(m.d.eq(m.s.journalEntries.id, id)))
          .length,
      ).toBe(1);
    });

    it("another member cannot use, learn about or disturb someone else's client id", async () => {
      const id = newUuid();
      await create({ id, content: `${SECRET} mine`, status: 'saved' });
      as(B);
      const res = await create({ id, content: `${SECRET} theirs`, status: 'saved' });
      expect(res.status).toBe(404);
      expect(await countFor(B.id)).toBe(0);
      expect(await rowOf(id)).toMatchObject({ userId: A.id, content: `${SECRET} mine` });
    });
  });

  describe('delete', () => {
    it('deletes the entry, and a second delete is a 404', async () => {
      const entry = await data(await create({ content: `${SECRET} bye`, status: 'saved' }));
      expect((await del(entry.id)).status).toBe(200);
      expect(await rowOf(entry.id)).toBeUndefined();
      expect((await del(entry.id)).status).toBe(404);
      expect((await get(entry.id)).status).toBe(404);
    });
  });

  describe('references', () => {
    it("links an entry to the member's own practice session, and refuses anyone else's", async () => {
      const practice = await newPractice('Ref practice');
      const other = await newPractice('Other practice');
      const mine = await newCompletion(A.id, practice.id);
      const theirs = await newCompletion(B.id, practice.id);

      const ok = await create({
        content: `${SECRET} r`,
        status: 'saved',
        entryType: 'practice',
        completionId: mine.id,
      });
      expect(ok.status).toBe(201);
      expect(await data(ok)).toMatchObject({
        practiceId: practice.id,
        completionId: mine.id,
        entryType: 'practice',
      });

      // B's session: indistinguishable from one that does not exist
      expect(
        (await create({ content: 'x', entryType: 'practice', completionId: theirs.id })).status,
      ).toBe(404);
      expect(
        (await create({ content: 'x', entryType: 'practice', completionId: newUuid() })).status,
      ).toBe(404);
      expect(
        (await create({ content: 'x', entryType: 'practice', practiceId: newUuid() })).status,
      ).toBe(404);
      // a session that belongs to a different practice than the one named
      expect(
        (
          await create({
            content: 'x',
            entryType: 'practice',
            practiceId: other.id,
            completionId: mine.id,
          })
        ).status,
      ).toBe(400);
    });

    it('removing a practice or a session never deletes the writing: the link is just cleared', async () => {
      const practice = await newPractice('Doomed practice');
      const completion = await newCompletion(A.id, practice.id);
      const entry = await data(
        await create({
          content: `${SECRET} survive`,
          status: 'saved',
          entryType: 'practice',
          completionId: completion.id,
        }),
      );

      await m.db
        .delete(m.s.practiceCompletions)
        .where(m.d.eq(m.s.practiceCompletions.id, completion.id));
      expect(await rowOf(entry.id)).toMatchObject({ completionId: null, practiceId: practice.id });

      await m.db.delete(m.s.practices).where(m.d.eq(m.s.practices.id, practice.id));
      expect(await rowOf(entry.id)).toMatchObject({
        completionId: null,
        practiceId: null,
        content: `${SECRET} survive`,
      });
    });

    it('accepts the five conditions on a theory entry', async () => {
      const res = await create({
        content: `${SECRET} t`,
        status: 'saved',
        entryType: 'theory',
        theoryCondition: 'Safety',
      });
      expect(res.status).toBe(201);
      expect((await data(res)).theoryCondition).toBe('Safety');
      expect(
        (await create({ content: 'x', entryType: 'theory', theoryCondition: 'LOW' })).status,
      ).toBe(400);
    });
  });

  describe('validation over the wire', () => {
    it('refuses over-long and malformed input without echoing it', async () => {
      const tooLong = await create({ content: `${SECRET} ${'x'.repeat(20_001)}` });
      expect(tooLong.status).toBe(400);
      expect(JSON.stringify(await tooLong.json())).not.toContain('SECRET');
      expect((await create({ title: 'x'.repeat(201) })).status).toBe(400);
      expect((await create({ content: 'a\u0000b' })).status).toBe(400);
      expect((await create({ status: 'archived' })).status).toBe(400);
    });

    it('does not let a change to links or type through PATCH', async () => {
      const entry = await data(await create({ content: `${SECRET} fixed`, status: 'saved' }));
      await patch(entry.id, {
        content: `${SECRET} fixed`,
        entryType: 'theory',
        theoryCondition: 'Safety',
        practiceId: newUuid(),
      });
      expect(await rowOf(entry.id)).toMatchObject({
        entryType: 'independent',
        theoryCondition: null,
        practiceId: null,
      });
    });
  });

  describe('draft listing', () => {
    const ids = (page: { entries: { id: string }[] }) => page.entries.map((e) => e.id);

    it('the default listing returns saved entries only; status=draft returns drafts only', async () => {
      const U = await newUser('drafts-default');
      as(U);
      const d1 = await data(await create({ content: `${SECRET} d1` }));
      const d2 = await data(await create({ content: `${SECRET} d2` }));
      const s1 = await data(await create({ content: `${SECRET} s1`, status: 'saved' }));

      const history = await data(await list('?limit=50'));
      expect(ids(history)).toEqual([s1.id]);
      expect(history.entries.every((e: { status: string }) => e.status === 'saved')).toBe(true);

      const drafts = await data(await list('?status=draft&limit=50'));
      expect(new Set(ids(drafts))).toEqual(new Set([d1.id, d2.id]));
      expect(drafts.entries.every((e: { status: string }) => e.status === 'draft')).toBe(true);
    });

    it("a member's draft listing contains only their own drafts, never another member's (drafts or saved)", async () => {
      const U1 = await newUser('drafts-own-1');
      const U2 = await newUser('drafts-own-2');
      as(U1);
      const mine = await data(await create({ content: `${SECRET} mine` }));
      await create({ content: `${SECRET} mine saved`, status: 'saved' });
      as(U2);
      const theirs = await data(await create({ content: `${SECRET} theirs` }));

      as(U1);
      expect(ids(await data(await list('?status=draft&limit=50')))).toEqual([mine.id]);
      as(U2);
      expect(ids(await data(await list('?status=draft&limit=50')))).toEqual([theirs.id]);
    });

    it('drafts never appear in the saved-entry history, and saving one moves it there', async () => {
      const U = await newUser('drafts-history');
      as(U);
      const draft = await data(await create({ content: `${SECRET} draft only` }));
      expect(ids(await data(await list('?limit=50')))).not.toContain(draft.id);
      await patch(draft.id, { status: 'saved' });
      expect(ids(await data(await list('?limit=50')))).toContain(draft.id);
      expect(ids(await data(await list('?status=draft&limit=50')))).not.toContain(draft.id);
    });

    it("ownership applies to drafts exactly as to saved entries: another member's draft is a 404 for read, edit, save and delete", async () => {
      const draft = await data(await create({ content: `${SECRET} private draft` }));
      as(B);
      expect((await get(draft.id)).status).toBe(404);
      expect((await patch(draft.id, { content: 'overwritten' })).status).toBe(404);
      expect((await patch(draft.id, { status: 'saved' })).status).toBe(404);
      expect((await del(draft.id)).status).toBe(404);
      expect((await create({ id: draft.id, content: 'taking over' })).status).toBe(404);
      expect(ids(await data(await list('?status=draft&limit=50')))).not.toContain(draft.id);
      expect(await rowOf(draft.id)).toMatchObject({
        userId: A.id,
        status: 'draft',
        content: `${SECRET} private draft`,
      });
    });

    it('lists drafts most recently touched first', async () => {
      const U = await newUser('drafts-order');
      as(U);
      const older = await data(await create({ content: `${SECRET} older` }));
      await new Promise((r) => setTimeout(r, 15));
      const newer = await data(await create({ content: `${SECRET} newer` }));
      expect(ids(await data(await list('?status=draft')))).toEqual([newer.id, older.id]);
      await new Promise((r) => setTimeout(r, 15));
      await patch(older.id, { content: `${SECRET} older, edited` });
      expect(ids(await data(await list('?status=draft')))).toEqual([older.id, newer.id]);
    });

    it('drafts and saved entries never change My Journey or the progress milestones', async () => {
      const U = await newUser('drafts-progress');
      as(U);
      const snapshot = async () =>
        JSON.stringify({
          journey: await m.journey.getJourneyEntries(U.id, 50, 0),
          milestones: await m.journey.getMilestoneDates(U.id),
        });
      const before = await snapshot();
      await create({ content: `${SECRET} p1` });
      await create({ content: `${SECRET} p2`, status: 'saved' });
      await create({ content: `${SECRET} p3`, status: 'saved' });
      expect(await snapshot()).toBe(before);
    });
  });

  describe('theory conditions are the five Human Expansion Theory conditions', () => {
    const FIVE = ['Safety', 'Capacity', 'Availability', 'Expansion', 'Participation'];

    it('accepts exactly those five, in the API and in the database', async () => {
      for (const condition of FIVE) {
        const res = await create({
          content: `${SECRET} ${condition}`,
          status: 'saved',
          entryType: 'theory',
          theoryCondition: condition,
        });
        expect(res.status).toBe(201);
        expect((await data(res)).theoryCondition).toBe(condition);
        await expect(
          m.db.insert(m.s.journalEntries).values({ userId: A.id, theoryCondition: condition }),
        ).resolves.toBeDefined();
      }
    });

    it('rejects the recommendation states and categories - a different taxonomy - in the API and in the database', async () => {
      for (const other of [
        'LOW',
        'LOW_MODERATE',
        'MODERATE',
        'MODERATE_HIGH',
        'HIGH',
        'GROUNDING',
        'REGULATION',
        'CENTERING',
        'EMBODIMENT',
        'EXPANSION',
        'safety',
        'Wellbeing',
      ]) {
        expect(
          (await create({ content: 'x', entryType: 'theory', theoryCondition: other })).status,
        ).toBe(400);
        await expect(
          m.db.insert(m.s.journalEntries).values({ userId: A.id, theoryCondition: other }),
        ).rejects.toMatchObject({ code: '23514' });
      }
    });
  });

  describe('independence from the rest of the product', () => {
    it('never touches check-ins, practice completions or practice reflections', async () => {
      const count = async (table: never) => (await m.db.select().from(table)).length;
      const before = [
        await count(m.s.checkIns as never),
        await count(m.s.practiceCompletions as never),
        await count(m.s.practiceReflections as never),
      ];
      const entry = await data(await create({ content: `${SECRET} indep`, status: 'saved' }));
      await patch(entry.id, { content: `${SECRET} indep 2` });
      await del(entry.id);
      const after = [
        await count(m.s.checkIns as never),
        await count(m.s.practiceCompletions as never),
        await count(m.s.practiceReflections as never),
      ];
      expect(after).toEqual(before);
    });
  });

  describe('account deletion purges the journal', () => {
    it("softDeleteUser deletes that member's entries (drafts and saved) and no one else's, and marks the user deleted", async () => {
      const C = await newUser('purge-c');
      const D = await newUser('purge-d');
      as(C);
      await create({ content: `${SECRET} c1`, status: 'saved' });
      await create({ content: `${SECRET} c2` });
      as(D);
      await create({ content: `${SECRET} d1`, status: 'saved' });
      expect(await countFor(C.id)).toBe(2);

      await m.sync.userSyncOps.softDeleteUser(C.clerkUserId);

      expect(await countFor(C.id)).toBe(0);
      expect(await countFor(D.id)).toBe(1);
      const [c] = await m.db.select().from(m.s.users).where(m.d.eq(m.s.users.id, C.id));
      expect(c?.deletedAt).toBeInstanceOf(Date);
    });

    it('is idempotent: running it again changes nothing and does not fail', async () => {
      const C = await newUser('purge-idem');
      as(C);
      await create({ content: `${SECRET} idem`, status: 'saved' });
      await m.sync.userSyncOps.softDeleteUser(C.clerkUserId);
      await expect(m.sync.userSyncOps.softDeleteUser(C.clerkUserId)).resolves.toBeDefined();
      expect(await countFor(C.id)).toBe(0);
    });

    it('is ONE transaction: if the user update fails, the purge is rolled back, and a retry then completes', async () => {
      const E = await newUser('purge-atomic');
      as(E);
      await create({ content: `${SECRET} e1`, status: 'saved' });
      await create({ content: `${SECRET} e2` });

      const fn = `fail_deleted_${Date.now()}`;
      await m.db.execute(
        m.d.sql.raw(`
        create function ${fn}() returns trigger as $$ begin
          if new.deleted_at is not null and new.clerk_user_id = '${E.clerkUserId}' then
            raise exception 'simulated failure';
          end if; return new; end; $$ language plpgsql`),
      );
      await m.db.execute(
        m.d.sql.raw(
          `create trigger ${fn} before update on users for each row execute function ${fn}()`,
        ),
      );
      try {
        await expect(m.sync.userSyncOps.softDeleteUser(E.clerkUserId)).rejects.toBeDefined();
        // nothing half-done: the writing is still there and the account is not marked deleted
        expect(await countFor(E.id)).toBe(2);
        const [stillThere] = await m.db.select().from(m.s.users).where(m.d.eq(m.s.users.id, E.id));
        expect(stillThere?.deletedAt).toBeNull();
      } finally {
        await m.db.execute(m.d.sql.raw(`drop trigger if exists ${fn} on users`));
        await m.db.execute(m.d.sql.raw(`drop function if exists ${fn}()`));
      }

      // the webhook retry (or the member's retry) now completes it
      await m.sync.userSyncOps.softDeleteUser(E.clerkUserId);
      expect(await countFor(E.id)).toBe(0);
      const [done] = await m.db.select().from(m.s.users).where(m.d.eq(m.s.users.id, E.id));
      expect(done?.deletedAt).toBeInstanceOf(Date);
    });

    it('a hard delete of the user row also removes the entries (ON DELETE CASCADE)', async () => {
      const F = await newUser('cascade');
      as(F);
      await create({ content: `${SECRET} f`, status: 'saved' });
      await m.db.delete(m.s.users).where(m.d.eq(m.s.users.id, F.id));
      expect(await countFor(F.id)).toBe(0);
    });

    const userRow = async (id: string) =>
      (await m.db.select().from(m.s.users).where(m.d.eq(m.s.users.id, id)))[0]!;
    const statusOf = async () => (await (await m.account.GET(new Request('http://x'))).json()).data;

    it('starting a deletion locks the journal at once: every journal route is refused (423), nothing is returned, nothing is written', async () => {
      const P = await newUser('lock');
      as(P);
      const saved = await data(await create({ content: `${SECRET} lock saved`, status: 'saved' }));
      const draft = await data(await create({ content: `${SECRET} lock draft` }));

      await m.accountLib.markDeletionPending(P.id);
      expect(await markerOf(P.id)).toBeInstanceOf(Date);

      for (const res of [
        await list(),
        await list('?status=draft'),
        await get(saved.id),
        await patch(draft.id, { content: `${SECRET} edited` }),
        await patch(draft.id, { status: 'saved' }),
        await del(saved.id),
        await create({ content: `${SECRET} new` }),
        await create({ id: saved.id, content: `${SECRET} replay` }),
        await create({ id: newUuid(), content: `${SECRET} fresh id` }),
      ]) {
        expect(res.status).toBe(423);
        expect(res.headers.get('Cache-Control')).toBe(NO_STORE);
        const body = await res.json();
        expect(body.error.code).toBe('ACCOUNT_DELETION_PENDING');
        expect(JSON.stringify(body)).not.toContain('SECRET');
      }
      // nothing was changed or created by those refused calls
      expect(await countFor(P.id)).toBe(2);
      expect((await rowOf(draft.id))?.content).toBe(`${SECRET} lock draft`);
      expect((await rowOf(saved.id))?.status).toBe('saved');
    });

    it('marking a deletion pending is idempotent and keeps the FIRST request time', async () => {
      const P = await newUser('mark');
      await m.accountLib.markDeletionPending(P.id);
      const first = (await markerOf(P.id))!;
      await new Promise((r) => setTimeout(r, 20));
      await m.accountLib.markDeletionPending(P.id);
      expect((await markerOf(P.id))!.getTime()).toBe(first.getTime());
    });

    it('identity failure: the journal is gone AND locked, the account is pending (not deleted), the status says so, and a retry completes', async () => {
      const G = await newUser('flow');
      as(G);
      await create({ content: `${SECRET} g1`, status: 'saved' });
      await create({ content: `${SECRET} g2` });
      expect(await statusOf()).toEqual({ status: 'active', requestedAt: null });
      const realDeps = await m.accountLib.realAccountDeletionDeps();

      let identityDown = true;
      const deps = {
        ...realDeps,
        deleteIdentity: async () => {
          if (identityDown) throw Object.assign(new Error(`clerk down ${SECRET}`), { status: 503 });
        },
      };

      const first = await m.accountLib.deleteAccount(G, deps);
      expect(first).toEqual({ status: 'pending', stage: 'identity_provider' }); // never "deleted"
      expect(await countFor(G.id)).toBe(0); // the writing was erased
      const mid = await userRow(G.id);
      expect(mid.deletedAt).toBeNull(); // the account is NOT claimed deleted
      const midMarker = await markerOf(G.id);
      expect(midMarker).toBeInstanceOf(Date); // it is pending
      expect(await statusOf()).toMatchObject({ status: 'pending' }); // and the app can be told so

      // the member is still signed in but cannot use the journal, and cannot bring anything back
      const reCreate = await create({
        id: newUuid(),
        content: `${SECRET} trying to restore`,
        status: 'saved',
      });
      expect(reCreate.status).toBe(423);
      expect((await list()).status).toBe(423);
      expect(await countFor(G.id)).toBe(0);

      // the member retries once Clerk is back: it completes, and the journal is still empty
      identityDown = false;
      expect(await m.accountLib.deleteAccount(G, deps)).toEqual({ status: 'deleted' });
      const done = await userRow(G.id);
      expect(done.deletedAt).toBeInstanceOf(Date);
      expect((await markerOf(G.id))!.getTime()).toBe(midMarker!.getTime()); // first time kept
      expect(await countFor(G.id)).toBe(0);
    });

    it('purge failure: deletion is pending and the journal is already locked even though the rows still exist; the retry erases them', async () => {
      const Q = await newUser('purgefail');
      as(Q);
      await create({ content: `${SECRET} q1`, status: 'saved' });
      const realDeps = await m.accountLib.realAccountDeletionDeps();

      let purgeDown = true;
      const deps = {
        ...realDeps,
        purgeJournal: async (userId: string) => {
          if (purgeDown)
            throw Object.assign(new Error(`purge failed ${SECRET}`), { code: '57014' });
          return realDeps.purgeJournal(userId);
        },
        deleteIdentity: async () => {},
      };

      expect(await m.accountLib.deleteAccount(Q, deps)).toEqual({
        status: 'pending',
        stage: 'journal_purge',
      });
      expect(await countFor(Q.id)).toBe(1); // the purge did not run...
      expect((await list()).status).toBe(423); // ...but the writing is unreachable
      expect((await userRow(Q.id)).deletedAt).toBeNull();

      purgeDown = false;
      expect(await m.accountLib.deleteAccount(Q, deps)).toEqual({ status: 'deleted' });
      expect(await countFor(Q.id)).toBe(0);
    });

    it('local finalisation failure after the identity is gone is pending_cleanup, never deleted; the webhook path then completes it', async () => {
      const R = await newUser('finalfail');
      as(R);
      await create({ content: `${SECRET} r1`, status: 'saved' });
      const realDeps = await m.accountLib.realAccountDeletionDeps();
      const deps = {
        ...realDeps,
        deleteIdentity: async () => {},
        finalizeLocalDeletion: async () => {
          throw Object.assign(new Error(`finalise failed ${SECRET}`), { code: '40001' });
        },
      };

      expect(await m.accountLib.deleteAccount(R, deps)).toEqual({ status: 'pending_cleanup' });
      expect((await userRow(R.id)).deletedAt).toBeNull(); // not claimed deleted
      expect((await list()).status).toBe(423);

      // Clerk's user.deleted webhook runs the same transactional finalisation
      await m.sync.userSyncOps.softDeleteUser(R.clerkUserId);
      expect((await userRow(R.id)).deletedAt).toBeInstanceOf(Date);
      expect(await countFor(R.id)).toBe(0);
    });

    it('a straggler written by a request already in flight when the deletion started is removed at completion', async () => {
      const S = await newUser('straggler');
      await m.accountLib.markDeletionPending(S.id);
      // simulate the race: a write that passed its access check just before the marker was set lands afterwards
      await m.db
        .insert(m.s.journalEntries)
        .values({ userId: S.id, content: `${SECRET} late`, status: 'saved' });
      expect(await countFor(S.id)).toBe(1);
      const realDeps = await m.accountLib.realAccountDeletionDeps();
      expect(
        await m.accountLib.deleteAccount(S, { ...realDeps, deleteIdentity: async () => {} }),
      ).toEqual({
        status: 'deleted',
      });
      expect(await countFor(S.id)).toBe(0);
    });

    it('refuses to delete while a paid subscription is still running, leaving everything intact', async () => {
      const H = await newUser('sub');
      as(H);
      await create({ content: `${SECRET} h`, status: 'saved' });
      await m.db.insert(m.s.entitlements).values({
        userId: H.id,
        tier: 'monthly',
        status: 'active',
        stripeSubscriptionId: `sub_${RUN}`,
      });
      const realDeps = await m.accountLib.realAccountDeletionDeps();
      const deleteIdentity = vi.fn();
      expect(await m.accountLib.deleteAccount(H, { ...realDeps, deleteIdentity })).toEqual({
        status: 'blocked_subscription',
      });
      expect(deleteIdentity).not.toHaveBeenCalled();
      expect(await countFor(H.id)).toBe(1);
      expect(await markerOf(H.id)).toBeNull(); // blocked: nothing changed, not even pending
      expect((await list()).status).toBe(200); // and the journal still works

      // once the subscription is set to end, deletion is allowed
      await m.db
        .update(m.s.entitlements)
        .set({ cancelAtPeriodEnd: true })
        .where(m.d.eq(m.s.entitlements.userId, H.id));
      expect(
        await m.accountLib.deleteAccount(H, { ...realDeps, deleteIdentity: async () => {} }),
      ).toEqual({
        status: 'deleted',
      });
      expect(await countFor(H.id)).toBe(0);
    });

    it('an app-managed trial (no Stripe subscription) never blocks deletion', async () => {
      const I = await newUser('trial');
      await m.db.insert(m.s.entitlements).values({
        userId: I.id,
        tier: 'free',
        status: 'active',
        trialStartedAt: new Date(Date.now() - 86_400_000),
        trialEndsAt: new Date(Date.now() + 86_400_000),
      });
      const realDeps = await m.accountLib.realAccountDeletionDeps();
      expect(await realDeps.hasActivePaidSubscription(I.id)).toBe(false);
    });

    it('DELETE /api/v1/me/account is private, and only ever acts on the caller', async () => {
      as(null);
      const unauth = await m.account.DELETE(new Request('http://x', { method: 'DELETE' }));
      expect(unauth.status).toBe(401);
      expect(unauth.headers.get('Cache-Control')).toBe(NO_STORE);
    });
  });

  describe('account deletion state machine (observable state at every stage)', () => {
    const userRow = async (id: string) =>
      (await m.db.select().from(m.s.users).where(m.d.eq(m.s.users.id, id)))[0]!;
    const fail = (stage: string) => async () => {
      throw Object.assign(new Error(`${stage} failed ${SECRET}`), { code: '57014' });
    };

    /** A member with a saved entry and a draft, signed in. */
    async function member(label: string) {
      const u = await newUser(label);
      as(u);
      await create({ content: `${SECRET} saved`, status: 'saved' });
      await create({ content: `${SECRET} draft` });
      return u;
    }

    const cases = [
      {
        name: 'step 1 fails (cannot mark pending)',
        inject: { markDeletionPending: fail('mark') },
        result: { status: 'failed', stage: 'mark_pending' },
        marker: false,
        rows: 2,
        deleted: false,
        journalStatus: 200, // nothing changed: the journal still works
      },
      {
        name: 'step 2 fails (journal purge)',
        inject: { purgeJournal: fail('purge') },
        result: { status: 'pending', stage: 'journal_purge' },
        marker: true,
        rows: 2, // rows still exist, but are locked
        deleted: false,
        journalStatus: 423,
      },
      {
        name: 'step 3 fails (Clerk identity deletion)',
        inject: { deleteIdentity: fail('identity') },
        result: { status: 'pending', stage: 'identity_provider' },
        marker: true,
        rows: 0,
        deleted: false,
        journalStatus: 423,
      },
      {
        name: 'step 4 fails (local finalisation, after the identity is gone)',
        inject: { finalizeLocalDeletion: fail('finalise') },
        result: { status: 'pending_cleanup' },
        marker: true,
        rows: 0,
        deleted: false,
        journalStatus: 423,
      },
    ] as const;

    it.each(cases)(
      '$name: leaves exactly the documented state, never "deleted", and a retry (no webhook) completes it',
      async (c) => {
        const u = await member(
          `sm-${c.name.slice(0, 6)}-${Math.random().toString(36).slice(2, 6)}`,
        );
        const real = await m.accountLib.realAccountDeletionDeps();
        const base = { ...real, deleteIdentity: async () => {} }; // Clerk "works" unless injected
        const result = await m.accountLib.deleteAccount(u, { ...base, ...c.inject });

        expect(result).toEqual(c.result);
        expect(result.status).not.toBe('deleted');
        const row = await userRow(u.id);
        expect((await markerOf(u.id)) !== null).toBe(c.marker);
        expect(row.deletedAt === null).toBe(!c.deleted);
        expect(await countFor(u.id)).toBe(c.rows);
        if (c.journalStatus === 423) {
          expect((await list()).status).toBe(423);
          expect((await create({ id: newUuid(), content: `${SECRET} restore?` })).status).toBe(423);
        } else {
          expect((await list()).status).toBe(c.journalStatus);
        }

        // The member retries; every step is repeated safely and this time nothing fails. No webhook involved.
        expect(await m.accountLib.deleteAccount(u, base)).toEqual({ status: 'deleted' });
        const done = await userRow(u.id);
        expect(done.deletedAt).toBeInstanceOf(Date);
        expect(await countFor(u.id)).toBe(0);
      },
    );

    it('success: every state is reached - marker set, journal purged, account deleted - and the member can no longer authenticate', async () => {
      const u = await member('sm-success');
      const real = await m.accountLib.realAccountDeletionDeps();
      expect(
        await m.accountLib.deleteAccount(u, { ...real, deleteIdentity: async () => {} }),
      ).toEqual({
        status: 'deleted',
      });
      const row = await userRow(u.id);
      expect(await markerOf(u.id)).toBeInstanceOf(Date); // 1. requested
      expect(row.deletedAt).toBeInstanceOf(Date); // 5. database account deletion completed
      expect(await countFor(u.id)).toBe(0); // 3. journal purged
      // 6. nothing more can be asked of a deleted account: no status, no second deletion, no journal
      expect((await m.account.GET(new Request('http://x'))).status).toBe(401);
      expect((await m.account.DELETE(new Request('http://x', { method: 'DELETE' }))).status).toBe(
        401,
      );
      expect((await list()).status).toBe(401);
    });

    it('the webhook after a successful route run is a no-op: it does not move the completion time or touch the journal', async () => {
      const u = await member('sm-webhook-after');
      const real = await m.accountLib.realAccountDeletionDeps();
      await m.accountLib.deleteAccount(u, { ...real, deleteIdentity: async () => {} });
      const first = (await userRow(u.id)).deletedAt!;

      await new Promise((r) => setTimeout(r, 25));
      await m.sync.userSyncOps.softDeleteUser(u.clerkUserId); // Clerk's user.deleted, arriving after
      await m.sync.userSyncOps.softDeleteUser(u.clerkUserId); // ...and a retried delivery
      expect((await userRow(u.id)).deletedAt!.getTime()).toBe(first.getTime());
      expect(await countFor(u.id)).toBe(0);
    });

    it('a webhook that arrives BEFORE the route finalises (a race) is safe: one completion time, same end state', async () => {
      const u = await member('sm-webhook-early');
      const real = await m.accountLib.realAccountDeletionDeps();
      const deps = {
        ...real,
        deleteIdentity: async () => {},
        // Clerk fires user.deleted as soon as the identity is gone - here, before the route's own step 4
        finalizeLocalDeletion: async (clerkUserId: string) => {
          await m.sync.userSyncOps.softDeleteUser(clerkUserId);
          return real.finalizeLocalDeletion(clerkUserId);
        },
      };
      expect(await m.accountLib.deleteAccount(u, deps)).toEqual({ status: 'deleted' });
      expect((await userRow(u.id)).deletedAt).toBeInstanceOf(Date);
      expect(await countFor(u.id)).toBe(0);
    });

    it('the webhook ALONE completes a stalled deletion; until it arrives the state is safe (locked, purged, not claimed deleted)', async () => {
      const u = await member('sm-webhook-only');
      const real = await m.accountLib.realAccountDeletionDeps();
      const result = await m.accountLib.deleteAccount(u, {
        ...real,
        deleteIdentity: async () => {},
        finalizeLocalDeletion: fail('finalise'),
      });
      expect(result).toEqual({ status: 'pending_cleanup' });

      // webhook delayed (or never arriving): nothing is exposed and nothing is claimed
      const waiting = await userRow(u.id);
      expect(waiting.deletedAt).toBeNull();
      expect(await markerOf(u.id)).toBeInstanceOf(Date);
      expect(await countFor(u.id)).toBe(0);
      expect((await list()).status).toBe(423);

      // when it arrives it finishes the job on its own
      await m.sync.userSyncOps.softDeleteUser(u.clerkUserId);
      expect((await userRow(u.id)).deletedAt).toBeInstanceOf(Date);
    });

    it('finalisation preserves the first completion time even when run again later', async () => {
      const u = await newUser('sm-timestamp');
      await m.sync.userSyncOps.softDeleteUser(u.clerkUserId);
      const first = (await userRow(u.id)).deletedAt!;
      await new Promise((r) => setTimeout(r, 25));
      await m.sync.userSyncOps.softDeleteUser(u.clerkUserId);
      expect((await userRow(u.id)).deletedAt!.getTime()).toBe(first.getTime());
    });

    it('the status endpoint reports active, then pending after a stalled attempt, and the retry clears the need', async () => {
      const u = await member('sm-status');
      const status = async () =>
        (await (await m.account.GET(new Request('http://x'))).json()).data.status;
      expect(await status()).toBe('active');
      const real = await m.accountLib.realAccountDeletionDeps();
      await m.accountLib.deleteAccount(u, { ...real, deleteIdentity: fail('identity') });
      expect(await status()).toBe('pending'); // the app, even after a restart, can be told
    });
  });

  describe('logging', () => {
    it('writes nothing the member wrote to any log, across success, validation failure and refusal paths', async () => {
      const entry = await data(await create({ title: SECRET, content: SECRET, status: 'saved' }));
      await patch(entry.id, { content: SECRET + 'x'.repeat(20_001) });
      await patch(entry.id, { status: 'draft' });
      as(B);
      await get(entry.id);
      await patch(entry.id, { content: SECRET });
      await del(entry.id);
      as(A);
      await create({ content: SECRET, entryType: 'practice', practiceId: newUuid() });
      await del(entry.id);
      // (afterEach asserts that no console call anywhere contained SECRET-)
      expect(true).toBe(true);
    });
  });
});
