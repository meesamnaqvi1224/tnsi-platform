import { describe, expect, it, vi } from 'vitest';

/**
 * Deployment-order safety for migration 0014. Run the new code against a database that does NOT yet have
 * the migration (migrations 0000-0013 only) and prove that:
 *
 *   - sign-in is unaffected: the authentication lookup and the Clerk sync webhook's user.created /
 *     user.updated paths keep working (no existing table was altered, and nothing on the authentication
 *     path reads either new table);
 *   - only the NEW routes fail, and they fail CLOSED with a generic server error (never a 401, which the
 *     app would read as "your session has ended"), serve and write nothing, and leak nothing;
 *   - a failed account deletion leaves the account untouched.
 *
 * SKIPPED unless `TNSI_TEST_DATABASE_URL` is set (refuses the production host), and skips itself when the
 * database already HAS migration 0014 - so it only ever asserts anything against a pre-0014 database:
 *
 *   TNSI_TEST_DATABASE_URL="<isolated database at migration 0013>" \
 *     pnpm --filter @tnsi/web exec vitest run src/lib/pre-migration-safety.integration.test.ts
 *
 * Creates one member (tagged with RUN) and deletes it afterwards.
 */
const PRODUCTION_DB_HOST = 'ep-damp-flower-ayp7i2gc';
const TEST_URL = process.env.TNSI_TEST_DATABASE_URL;
const enabled = !!TEST_URL && !TEST_URL.includes(PRODUCTION_DB_HOST);
const RUN = `pre0014-${Date.now()}`;

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
  const url = process.env.TNSI_TEST_DATABASE_URL!;
  const client = postgres(url, {
    prepare: false,
    max: url.includes('.neon.tech') ? 10 : 1,
    idle_timeout: 20,
    connect_timeout: 10,
  });
  return { ...schema, schema, db: drizzle(client, { schema }) };
});

describe.skipIf(!enabled)(
  'new code against a database WITHOUT migration 0014',
  { timeout: 60_000 },
  () => {
    it('keeps sign-in and the user-sync webhook working and fails only the new routes, closed', async () => {
      process.env.DATABASE_URL = TEST_URL!;
      const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const { db, users } = await import('@tnsi/db');
      const { eq, sql } = await import('drizzle-orm');

      const [has] = (await db.execute(
        sql`select count(*)::int as n from information_schema.tables where table_name = 'journal_entries'`,
      )) as unknown as { n: number }[];
      if (has!.n > 0) return; // the database already has 0014: nothing to assert here (see header)

      const { userSyncOps } = await import('./user-sync-ops');
      const journal = await import('../app/api/v1/journal/entries/route');
      const account = await import('../app/api/v1/me/account/route');

      const [user] = await db
        .insert(users)
        .values({ clerkUserId: RUN, email: `${RUN}@example.test` })
        .returning();
      auth.id = user!.id;
      auth.clerkUserId = user!.clerkUserId;
      try {
        // 1. the authentication lookup, exactly as auth-api runs it on every authenticated request
        const found = await db.select().from(users).where(eq(users.clerkUserId, RUN)).limit(1);
        expect(found).toHaveLength(1);

        // 2. the Clerk sync webhook's user.created / user.updated paths
        expect(await userSyncOps.findUserByClerkId(RUN)).toBeTruthy();
        const updated = await userSyncOps.upsertUser({
          clerkUserId: RUN,
          email: user!.email,
          fullName: 'Pre Migration',
          avatarUrl: '',
          metadata: {},
        });
        expect(updated.fullName).toBe('Pre Migration');

        // 3. the new routes fail CLOSED with a generic 500 - not a 401 - and serve or write nothing
        const SECRET = `SECRET-${RUN}`;
        for (const res of [
          await journal.GET(new Request('http://x/api/v1/journal/entries')),
          await journal.POST(
            new Request('http://x', { method: 'POST', body: JSON.stringify({ content: SECRET }) }),
          ),
          await account.GET(new Request('http://x')),
        ]) {
          expect(res.status).toBe(500);
          expect(res.headers.get('Cache-Control')).toBe('private, no-store, max-age=0');
          expect(JSON.stringify(await res.json())).not.toContain('SECRET');
        }
        const del = await account.DELETE(new Request('http://x', { method: 'DELETE' }));
        expect(del.status).toBe(500);
        expect((await del.json()).error.code).toBe('ACCOUNT_DELETION_FAILED'); // "nothing was deleted"

        // 4. a failed deletion left the account untouched, and nothing was logged but labels and codes
        const [after] = await db.select().from(users).where(eq(users.id, user!.id));
        expect(after!.deletedAt).toBeNull();
        expect(JSON.stringify(errorSpy.mock.calls)).not.toContain('SECRET');
      } finally {
        errorSpy.mockRestore();
        await db.delete(users).where(eq(users.id, user!.id));
      }
    });
  },
);
