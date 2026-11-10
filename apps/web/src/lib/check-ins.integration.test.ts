import { afterAll, beforeAll, describe, expect, it } from 'vitest';

/**
 * Real-PostgreSQL tests for the daily check-in rules in lib/check-ins.ts and the recommendation
 * and progress summary in lib/practices.ts: primary vs additional check-ins, what "today" and the
 * recommendation follow, history order, simultaneous first check-ins, and that the recorded time zone
 * is stored on both kinds and nothing else changes.
 *
 * SKIPPED unless `TNSI_TEST_DATABASE_URL` is set; never reads `DATABASE_URL` from the environment or
 * any file; refuses the production host. The target must be an ISOLATED database with the repository's
 * migrations applied (including 0013). Run with the server's day pinned to UTC, as Vercel runs it:
 *
 *   TZ=UTC TNSI_TEST_DATABASE_URL="<isolated database>" \
 *     pnpm --filter @tnsi/web exec vitest run src/lib/check-ins.integration.test.ts
 *
 * It creates its own member and practices (all tagged with RUN) and deletes them afterwards.
 *
 * The six-simultaneous-check-ins test needs a real multi-connection PostgreSQL and MUST be run against
 * the isolated Neon database before the migration is approved. It can be opted out of only on a
 * single-session LOCAL engine (TNSI_TEST_SKIP_CONCURRENCY=yes), and the opt-out is ignored on any
 * Neon host, so a Neon run always executes it.
 */

const PRODUCTION_DB_HOST = 'ep-damp-flower-ayp7i2gc';
const TEST_URL = process.env.TNSI_TEST_DATABASE_URL;
const RUN = `checkins-it-${Date.now()}`;
const enabled = !!TEST_URL && !TEST_URL.includes(PRODUCTION_DB_HOST);
const onNeon = !!TEST_URL && TEST_URL.includes('.neon.tech');
/** An explicit opt-out for single-session local engines only; a Neon target always runs the concurrency test. */
const skipConcurrency = process.env.TNSI_TEST_SKIP_CONCURRENCY === 'yes' && !onNeon;

type Mods = {
  db: typeof import('@tnsi/db').db;
  users: typeof import('@tnsi/db').users;
  practices: typeof import('@tnsi/db').practices;
  checkIns: typeof import('@tnsi/db').checkIns;
  lib: typeof import('./check-ins');
  practicesLib: typeof import('./practices');
  eq: typeof import('drizzle-orm').eq;
  like: typeof import('drizzle-orm').like;
};
let m: Mods;
const userIds: string[] = [];

async function newUser(label: string) {
  const [row] = await m.db
    .insert(m.users)
    .values({ clerkUserId: `${RUN}-${label}`, email: `${RUN}-${label}@example.test` })
    .returning();
  userIds.push(row!.id);
  return row!.id;
}

async function newPractice(title: string, category: string, extra: Record<string, unknown> = {}) {
  const [row] = await m.db
    .insert(m.practices)
    .values({
      sanityId: `${RUN}-${title}`,
      title,
      contentType: 'audio',
      category,
      sanityData: {},
      isPublished: true,
      ...extra,
    })
    .returning();
  return row!;
}

describe.skipIf(!enabled)('daily check-ins on real PostgreSQL', () => {
  beforeAll(async () => {
    process.env.DATABASE_URL = TEST_URL!;
    const dbMod = await import('@tnsi/db');
    const drizzle = await import('drizzle-orm');
    m = {
      db: dbMod.db,
      users: dbMod.users,
      practices: dbMod.practices,
      checkIns: dbMod.checkIns,
      lib: await import('./check-ins'),
      practicesLib: await import('./practices'),
      eq: drizzle.eq,
      like: drizzle.like,
    };
  });

  afterAll(async () => {
    if (!enabled || !m) return;
    for (const id of userIds) await m.db.delete(m.users).where(m.eq(m.users.id, id)); // cascades
    await m.db.delete(m.practices).where(m.like(m.practices.sanityId, `${RUN}-%`));
  });

  const zone = { timeZone: 'Europe/London', localDate: '2026-11-09', utcOffsetMinutes: 0 };

  it('the first check-in of the day is primary; later ones are additional, each its own row', async () => {
    const u = await newUser('flags');
    const primary = await m.lib.recordCheckIn(u, {
      moodScore: 2,
      capacityScore: 2,
      metadata: zone,
    });
    const a1 = await m.lib.recordCheckIn(u, { moodScore: 5, capacityScore: 5, metadata: zone });
    const a2 = await m.lib.recordCheckIn(u, { moodScore: 1, capacityScore: 1 });
    expect([primary.isPrimary, a1.isPrimary, a2.isPrimary]).toEqual([true, false, false]);
    expect(new Set([primary.id, a1.id, a2.id]).size).toBe(3);
    const rows = await m.db.select().from(m.checkIns).where(m.eq(m.checkIns.userId, u));
    expect(rows.filter((r) => r.isPrimary)).toHaveLength(1);
    expect(rows).toHaveLength(3);
  });

  it('stores the same metadata on primary and additional records, {} when none given', async () => {
    const u = await newUser('meta');
    const p = await m.lib.recordCheckIn(u, { moodScore: 3, capacityScore: 3, metadata: zone });
    const a = await m.lib.recordCheckIn(u, { moodScore: 3, capacityScore: 4, metadata: zone });
    const none = await m.lib.recordCheckIn(u, { moodScore: 3, capacityScore: 4 });
    expect(p.metadata).toEqual(zone);
    expect(a.metadata).toEqual(zone);
    expect(none.metadata).toEqual({});
  });

  it("today's check-in and the latest check-in are the primary, whatever came after", async () => {
    const u = await newUser('today');
    const primary = await m.lib.recordCheckIn(u, { moodScore: 2, capacityScore: 2 });
    await m.lib.recordCheckIn(u, { moodScore: 5, capacityScore: 5 });
    await m.lib.recordCheckIn(u, { moodScore: 1, capacityScore: 1 });
    expect((await m.lib.getTodayCheckIn(u))?.id).toBe(primary.id);
    expect((await m.lib.getLatestCheckIn(u))?.id).toBe(primary.id);
  });

  it('the recommendation follows the primary and ignores additional check-ins', async () => {
    const u = await newUser('reco');
    // Capacity 2 maps to REGULATION; a 5 would map to EXPANSION and a 1 to GROUNDING.
    await newPractice('reg-a', 'REGULATION');
    await newPractice('exp-a', 'EXPANSION');
    await newPractice('gro-a', 'GROUNDING');
    await m.lib.recordCheckIn(u, { moodScore: 2, capacityScore: 2 });
    const before = await m.practicesLib.getRecommendedPractice(u);
    await m.lib.recordCheckIn(u, { moodScore: 5, capacityScore: 5 });
    await m.lib.recordCheckIn(u, { moodScore: 1, capacityScore: 1 });
    const after = await m.practicesLib.getRecommendedPractice(u);
    expect(before?.category).toBe('REGULATION');
    expect(after?.id).toBe(before?.id);
    expect(after?.category).toBe('REGULATION');
  });

  it('there is no recommendation without a primary check-in', async () => {
    const none = await newUser('reco-none');
    expect(await m.practicesLib.getRecommendedPractice(none)).toBeNull();
  });

  it('history returns every check-in, newest first, with correct paging', async () => {
    const u = await newUser('history');
    const at = (h: number) => new Date(Date.UTC(2026, 10, 9, h, 0, 0));
    const first = await m.lib.recordCheckIn(u, {
      moodScore: 3,
      capacityScore: 2,
      completedAt: at(8),
    });
    const second = await m.lib.recordCheckIn(u, {
      moodScore: 3,
      capacityScore: 5,
      completedAt: at(12),
    });
    const third = await m.lib.recordCheckIn(u, {
      moodScore: 3,
      capacityScore: 1,
      completedAt: at(20),
    });
    const page1 = await m.lib.getCheckInHistory(u, 2, 0);
    const page2 = await m.lib.getCheckInHistory(u, 2, 2);
    expect(page1.checkIns.map((c) => c.id)).toEqual([third.id, second.id]);
    expect(page1.hasMore).toBe(true);
    expect(page2.checkIns.map((c) => c.id)).toEqual([first.id]);
    expect(page2.hasMore).toBe(false);
  });

  // Never skipped on Neon: the opt-out below is ignored there.
  it.skipIf(skipConcurrency)(
    'six simultaneous first check-ins give exactly one primary',
    async () => {
      const u = await newUser('race');
      const saved = await Promise.all(
        Array.from({ length: 6 }, (_, i) =>
          m.lib.recordCheckIn(u, { moodScore: 3, capacityScore: 1 + (i % 5) }),
        ),
      );
      expect(saved.filter((r) => r.isPrimary)).toHaveLength(1);
      const rows = await m.db.select().from(m.checkIns).where(m.eq(m.checkIns.userId, u));
      expect(rows).toHaveLength(6);
      expect(rows.filter((r) => r.isPrimary)).toHaveLength(1);
    },
  );
});
