import { JOURNAL_CONSENT_REQUIRED_CODE, JOURNAL_CONSENT_VERSION } from '@tnsi/core';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';

/**
 * The first-use acknowledgement for My Reflections on a REAL PostgreSQL (decision Q1, 16 Nov 2026):
 * writing needs a current, un-withdrawn acknowledgement; reading and deleting never do; recording and
 * withdrawing are idempotent, concurrency-safe and follow the same deletion barrier as every journal
 * write (PR #57).
 *
 * SKIPPED unless `TNSI_TEST_DATABASE_URL` is a `.neon.tech` host; refuses the production host. Run:
 *
 *   TNSI_TEST_DATABASE_URL="<isolated Neon database, migrations applied through 0015>" \
 *     pnpm --filter @tnsi/web exec vitest run src/lib/journal-consent.integration.test.ts
 *
 * Needs migration 0015 (journal_consents). Creates its own members (tagged with RUN) and deletes them.
 */
const PRODUCTION_DB_HOST = 'ep-damp-flower-ayp7i2gc';
const TEST_URL = process.env.TNSI_TEST_DATABASE_URL;
const enabled =
  !!TEST_URL && TEST_URL.includes('.neon.tech') && !TEST_URL.includes(PRODUCTION_DB_HOST);
const RUN = `journal-consent-${Date.now()}`;
const SECRET = `SECRET-${RUN}`;

const auth = vi.hoisted(() => ({ id: '', clerkUserId: '' }));

vi.mock('@/lib/auth-api', () => ({
  requireMemberAccess: async () => ({ id: auth.id }),
  requireAuth: async () => ({ id: auth.id, clerkUserId: auth.clerkUserId }),
  memberAccessErrorResponse: () => new Response(null, { status: 401 }),
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
    max: 10,
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
  consentRoute: typeof import('../app/api/v1/journal/consent/route');
  consent: typeof import('./journal-consent');
  journal: typeof import('./journal');
  state: typeof import('./deletion-state');
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

const json = (method: string, body?: unknown) =>
  new Request('http://x', {
    method,
    headers: { 'content-type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
const params = (id: string) => ({ params: Promise.resolve({ id }) });
const create = (body: unknown) => m.collection.POST(json('POST', body));
const patch = (id: string, body: unknown) => m.single.PATCH(json('PATCH', body), params(id));
const del = (id: string) => m.single.DELETE(json('DELETE'), params(id));
const get = (id: string) => m.single.GET(json('GET'), params(id));
const list = () => m.collection.GET(new Request('http://x/api/v1/journal/entries'));
const consentGet = () => m.consentRoute.GET();
const consentPost = (body: unknown) => m.consentRoute.POST(json('POST', body));
const consentDelete = (qs = '') =>
  m.consentRoute.DELETE(new Request(`http://x/api/v1/journal/consent${qs}`, { method: 'DELETE' }));
const rows = async (userId: string) =>
  m.db.select().from(m.s.journalEntries).where(m.d.eq(m.s.journalEntries.userId, userId));
const consentRows = async (userId: string) =>
  m.db.select().from(m.s.journalConsents).where(m.d.eq(m.s.journalConsents.userId, userId));
const grant = async () => (await consentPost({ version: JOURNAL_CONSENT_VERSION })).json();

describe.skipIf(!enabled)(
  'My Reflections first-use acknowledgement (real PostgreSQL)',
  { timeout: 240_000 },
  () => {
    beforeAll(async () => {
      process.env.DATABASE_URL = TEST_URL!;
      const [db, s, collection, single, consentRoute, consent, journal, state, sync, d] =
        await Promise.all([
          import('@tnsi/db').then((x) => x.db),
          import('@tnsi/db/schema'),
          import('../app/api/v1/journal/entries/route'),
          import('../app/api/v1/journal/entries/[id]/route'),
          import('../app/api/v1/journal/consent/route'),
          import('./journal-consent'),
          import('./journal'),
          import('./deletion-state'),
          import('./user-sync-ops'),
          import('drizzle-orm'),
        ]);
      m = { db, s, collection, single, consentRoute, consent, journal, state, sync, d };
      vi.spyOn(console, 'error').mockImplementation(() => {});
    }, 120_000);

    afterAll(async () => {
      if (!m) return;
      if (userIds.length) await m.db.delete(m.s.users).where(m.d.inArray(m.s.users.id, userIds));
    }, 120_000);

    it('a member who has not acknowledged cannot create or change a reflection (403 with a stable code), and nothing is written', async () => {
      const u = await newUser('none');
      expect((await (await consentGet()).json()).data).toEqual({
        status: 'required',
        version: JOURNAL_CONSENT_VERSION,
      });

      for (const body of [
        { id: crypto.randomUUID(), content: SECRET, status: 'saved' },
        { id: crypto.randomUUID(), content: SECRET }, // a draft, as autosave would send
      ]) {
        const res = await create(body);
        expect(res.status).toBe(403);
        const payload = await res.json();
        expect(payload.error.code).toBe(JOURNAL_CONSENT_REQUIRED_CODE);
        expect(res.headers.get('cache-control')).toBe('private, no-store, max-age=0');
        expect(JSON.stringify(payload)).not.toContain('SECRET');
      }
      expect(await rows(u.id)).toEqual([]);
      expect(await consentRows(u.id)).toEqual([]); // being refused records nothing
    });

    it('recording the current notice allows writing; a repeat keeps the first time (idempotent)', async () => {
      const u = await newUser('record');
      const first = await consentPost({ version: JOURNAL_CONSENT_VERSION });
      expect(first.status).toBe(200);
      expect((await first.json()).data.status).toBe('granted');
      const [row1] = await consentRows(u.id);
      expect(row1).toMatchObject({ policyVersion: JOURNAL_CONSENT_VERSION, withdrawnAt: null });

      for (let i = 0; i < 3; i += 1) await grant();
      const all = await consentRows(u.id);
      expect(all).toHaveLength(1);
      expect(all[0]!.consentedAt.getTime()).toBe(row1!.consentedAt.getTime());

      expect(
        (await create({ id: crypto.randomUUID(), content: 'now allowed', status: 'saved' })).status,
      ).toBe(201);
    });

    it('a notice version other than the current one is refused (409) and records nothing', async () => {
      const u = await newUser('stale');
      const res = await consentPost({ version: 'some-older-version' });
      expect(res.status).toBe(409);
      expect((await res.json()).error.code).toBe('CONSENT_VERSION_MISMATCH');
      expect(await consentRows(u.id)).toEqual([]);
      expect((await create({ content: 'x', status: 'saved' })).status).toBe(403);
    });

    it('an acknowledgement of an OLDER notice no longer counts: the member is asked again', async () => {
      const u = await newUser('outdated');
      await m.db
        .insert(m.s.journalConsents)
        .values({ userId: u.id, policyVersion: 'older-notice' });
      expect((await (await consentGet()).json()).data.status).toBe('required');
      expect((await create({ content: 'x', status: 'saved' })).status).toBe(403);
      await grant();
      expect((await consentRows(u.id))[0]!.policyVersion).toBe(JOURNAL_CONSENT_VERSION);
      expect((await create({ content: 'x', status: 'saved' })).status).toBe(201);
    });

    it('withdrawing stops writing, but the member can still read and delete; their writing is untouched; agreeing again restores it', async () => {
      const u = await newUser('withdraw');
      await grant();
      const entry = (await (await create({ content: `mine ${SECRET}`, status: 'saved' })).json())
        .data;

      const withdrawn = await consentDelete();
      expect(withdrawn.status).toBe(200);
      expect((await withdrawn.json()).data.status).toBe('withdrawn');
      const [w1] = await consentRows(u.id);
      expect(w1!.withdrawnAt).toBeInstanceOf(Date);

      // Writes refused: create, change, save.
      expect((await create({ content: 'new', status: 'saved' })).status).toBe(403);
      expect((await patch(entry.id, { content: 'changed' })).status).toBe(403);
      // Reads and deletes still work, and nothing was altered.
      expect((await get(entry.id)).status).toBe(200);
      expect((await (await list()).json()).data.entries).toHaveLength(1);
      expect((await rows(u.id))[0]!.content).toContain(SECRET);

      // A repeated withdrawal keeps the first time.
      await consentDelete();
      expect((await consentRows(u.id))[0]!.withdrawnAt!.getTime()).toBe(w1!.withdrawnAt!.getTime());

      // Agreeing again restores writing and clears the withdrawal.
      await grant();
      expect((await consentRows(u.id))[0]!.withdrawnAt).toBeNull();
      expect((await patch(entry.id, { content: 'changed again' })).status).toBe(200);

      // Deleting never needs it: withdraw once more, then delete.
      await consentDelete();
      expect((await del(entry.id)).status).toBe(200);
      expect(await rows(u.id)).toEqual([]);
    });

    it('withdrawing WITH the delete choice removes every reflection and draft of that member only, atomically, and still stops writing', async () => {
      const a = await newUser('wd-a');
      await grant();
      await create({ content: `saved ${SECRET}`, status: 'saved' });
      await create({ content: `draft ${SECRET}`, status: 'draft' });
      const b = await newUser('wd-b');
      await grant();
      await create({ content: `b ${SECRET}`, status: 'saved' });

      auth.id = a.id;
      auth.clerkUserId = a.clerkUserId;
      expect(await rows(a.id)).toHaveLength(2);
      const res = await consentDelete('?entries=delete');
      expect(res.status).toBe(200);
      const body = (await res.json()).data;
      expect(body.status).toBe('withdrawn');
      expect(body.deletedEntries).toBe(2);
      expect(await rows(a.id)).toEqual([]);
      expect((await consentRows(a.id))[0]!.withdrawnAt).toBeInstanceOf(Date);
      // Another member's writing is untouched.
      expect(await rows(b.id)).toHaveLength(1);
      // Writing is stopped, and repeating the call is harmless (zero rows).
      expect((await create({ content: 'new', status: 'saved' })).status).toBe(403);
      const again = await consentDelete('?entries=delete');
      expect(again.status).toBe(200);
      expect((await again.json()).data.deletedEntries).toBe(0);
    });

    it('withdrawing WITHOUT the delete choice deletes nothing, whatever other query text is sent', async () => {
      const u = await newUser('wd-keep');
      await grant();
      await create({ content: `keep ${SECRET}`, status: 'saved' });
      for (const qs of ['', '?entries=keep', '?entries=', '?all=true']) {
        const res = await consentDelete(qs);
        expect(res.status).toBe(200);
        expect((await res.json()).data.deletedEntries).toBeUndefined();
      }
      expect(await rows(u.id)).toHaveLength(1);
    });

    it('withdrawing with nothing recorded is harmless, and records nothing', async () => {
      const u = await newUser('withdraw-none');
      expect((await consentDelete()).status).toBe(200);
      expect(await consentRows(u.id)).toEqual([]);
    });

    it('one member’s acknowledgement never permits another member’s writing', async () => {
      const a = await newUser('iso-a');
      await grant();
      const b = await newUser('iso-b'); // now acting as B, who has not acknowledged
      expect((await create({ content: 'x', status: 'saved' })).status).toBe(403);
      expect(await consentRows(b.id)).toEqual([]);
      expect(await consentRows(a.id)).toHaveLength(1);
      expect(await rows(b.id)).toEqual([]);
    });

    it('the record holds a notice version and two times - no text, no email', async () => {
      const u = await newUser('shape');
      await grant();
      expect(Object.keys((await consentRows(u.id))[0]!).sort()).toEqual([
        'consentedAt',
        'policyVersion',
        'userId',
        'withdrawnAt',
      ]);
    });

    it('10 concurrent acknowledgements and withdrawals leave exactly one row, in a valid state', async () => {
      const u = await newUser('concurrent');
      const settled = await Promise.allSettled([
        ...Array.from({ length: 6 }, () =>
          m.consent.recordJournalConsent(u.id, JOURNAL_CONSENT_VERSION),
        ),
        ...Array.from({ length: 4 }, () => m.consent.withdrawJournalConsent(u.id)),
      ]);
      expect(settled.filter((r) => r.status === 'rejected')).toEqual([]);
      const all = await consentRows(u.id);
      expect(all).toHaveLength(1);
      expect(all[0]!.policyVersion).toBe(JOURNAL_CONSENT_VERSION);
    });

    it('concurrent writers while the member withdraws: no write commits after the withdrawal is visible, none errors unexpectedly', async () => {
      const u = await newUser('withdraw-race');
      await grant();
      const results = await Promise.all([
        ...Array.from({ length: 6 }, (_, i) =>
          create({ id: crypto.randomUUID(), content: `w${i}`, status: i % 2 ? 'saved' : 'draft' }),
        ),
        consentDelete(),
      ]);
      for (const r of results.slice(0, 6)) expect([201, 403]).toContain(r.status);
      // After the withdrawal has committed, the next write is refused.
      expect((await create({ content: 'after', status: 'saved' })).status).toBe(403);
      expect((await consentRows(u.id))[0]!.withdrawnAt).toBeInstanceOf(Date);
    });

    it('recording or withdrawing after account deletion has begun is refused with 423, and writes nothing', async () => {
      const u = await newUser('deleting');
      await grant();
      await m.state.markDeletionPending(u.id);
      expect((await consentPost({ version: JOURNAL_CONSENT_VERSION })).status).toBe(423);
      expect((await consentDelete()).status).toBe(423);
      expect((await consentGet()).status).toBe(423);
      expect((await create({ content: 'x', status: 'saved' })).status).toBe(423);
    });

    it('after a Clerk-side deletion (no marker) a stale request cannot record an acknowledgement either', async () => {
      const u = await newUser('webhook-deleted');
      await m.sync.userSyncOps.softDeleteUser(u.clerkUserId);
      await expect(
        m.consent.recordJournalConsent(u.id, JOURNAL_CONSENT_VERSION),
      ).rejects.toBeInstanceOf(m.state.AccountDeletionPendingError);
      expect(await consentRows(u.id)).toEqual([]);
    });

    it('a malformed or extra-field body is a 400 and records nothing', async () => {
      const u = await newUser('bad-body');
      expect((await consentPost({})).status).toBe(400);
      expect((await consentPost({ version: JOURNAL_CONSENT_VERSION, agreed: true })).status).toBe(
        400,
      );
      expect(await consentRows(u.id)).toEqual([]);
    });
  },
);
