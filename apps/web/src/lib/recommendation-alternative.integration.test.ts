import { afterAll, beforeAll, describe, expect, it } from 'vitest';

/**
 * Real-PostgreSQL tests for Home's alternative recommendation and progress summary
 * (`getRecommendedPractices`, `getPracticeProgressSummary` in lib/practices.ts).
 *
 * SKIPPED unless `TNSI_TEST_DATABASE_URL` is set; never reads `DATABASE_URL` from the environment or any
 * file; refuses the production host. The target must be an ISOLATED database with the repository's
 * migrations applied. Run with the server's day pinned to UTC, as Vercel runs it:
 *
 *   TZ=UTC TNSI_TEST_DATABASE_URL="<isolated database>" \
 *     pnpm --filter @tnsi/web exec vitest run src/lib/recommendation-alternative.integration.test.ts
 *
 * It creates its own member and practices (all tagged with RUN) and deletes them afterwards.
 */

const PRODUCTION_DB_HOST = 'ep-damp-flower-ayp7i2gc';
const TEST_URL = process.env.TNSI_TEST_DATABASE_URL;
const RUN = `reco-alt-it-${Date.now()}`;
const enabled = !!TEST_URL && !TEST_URL.includes(PRODUCTION_DB_HOST);

type Mods = {
  db: typeof import('@tnsi/db').db;
  users: typeof import('@tnsi/db').users;
  practices: typeof import('@tnsi/db').practices;
  checkIns: typeof import('@tnsi/db').checkIns;
  practiceCompletions: typeof import('@tnsi/db').practiceCompletions;
  lib: typeof import('./practices');
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

async function newPractice(title: string, category: string) {
  const [row] = await m.db
    .insert(m.practices)
    .values({
      sanityId: `${RUN}-${title}`,
      title,
      contentType: 'audio',
      category,
      sanityData: {},
      isPublished: true,
    })
    .returning();
  return row!;
}

/** One check-in on today's day (server-local), written directly so this file needs nothing beyond what main has. */
async function checkInToday(userId: string, capacityScore: number) {
  const now = new Date();
  await m.db.insert(m.checkIns).values({
    userId,
    moodScore: capacityScore,
    capacityScore,
    completedAt: now,
    completedDate: new Date(now.getFullYear(), now.getMonth(), now.getDate()),
  });
}

describe.skipIf(!enabled)(
  'alternative recommendation and progress summary on real PostgreSQL',
  () => {
    beforeAll(async () => {
      process.env.DATABASE_URL = TEST_URL!;
      const dbMod = await import('@tnsi/db');
      const drizzle = await import('drizzle-orm');
      m = {
        db: dbMod.db,
        users: dbMod.users,
        practices: dbMod.practices,
        checkIns: dbMod.checkIns,
        practiceCompletions: dbMod.practiceCompletions,
        lib: await import('./practices'),
        eq: drizzle.eq,
        like: drizzle.like,
      };
    });

    afterAll(async () => {
      if (!enabled || !m) return;
      for (const id of userIds) await m.db.delete(m.users).where(m.eq(m.users.id, id)); // cascades
      await m.db.delete(m.practices).where(m.like(m.practices.sanityId, `${RUN}-%`));
    });

    it('gives the primary and the next practice in the same category, in the same fixed order', async () => {
      const u = await newUser('alt');
      const a = await newPractice('reg-a', 'REGULATION');
      const b = await newPractice('reg-b', 'REGULATION');
      await newPractice('gro-a', 'GROUNDING');
      await checkInToday(u, 2); // capacity 2 maps to REGULATION
      const { primary, alternative } = await m.lib.getRecommendedPractices(u);
      const regulation = (
        await m.db
          .select({ id: m.practices.id })
          .from(m.practices)
          .where(m.eq(m.practices.category, 'REGULATION'))
      )
        .map((r) => r.id)
        .sort();
      expect([a.id, b.id].every((id) => regulation.includes(id))).toBe(true);
      expect(primary?.id).toBe(regulation[0]);
      expect(alternative?.id).toBe(regulation[1]);
      // The single-pick function the rest of the app uses agrees with the primary.
      expect((await m.lib.getRecommendedPractice(u))?.id).toBe(primary?.id);
    });

    it('has no alternative when the category holds one practice, and nothing without a check-in', async () => {
      const none = await newUser('alt-none');
      expect(await m.lib.getRecommendedPractices(none)).toEqual({
        primary: null,
        alternative: null,
      });
      const u = await newUser('alt-one');
      await newPractice('cen-only', 'CENTERING');
      await checkInToday(u, 3); // CENTERING
      const r = await m.lib.getRecommendedPractices(u);
      expect(r.primary).not.toBeNull();
      expect(r.alternative).toBeNull();
    });

    it('has no recommendation when nothing is published for the mapped category', async () => {
      const u = await newUser('alt-empty');
      await checkInToday(u, 4); // EMBODIMENT; none created by this file (and none expected in an isolated database)
      const embodiment = await m.db
        .select({ id: m.practices.id })
        .from(m.practices)
        .where(m.eq(m.practices.category, 'EMBODIMENT'));
      if (embodiment.length === 0) {
        expect(await m.lib.getRecommendedPractices(u)).toEqual({
          primary: null,
          alternative: null,
        });
      }
    });

    it('the progress summary counts completed sessions (repeats included) and names the latest', async () => {
      const u = await newUser('progress');
      const p = await newPractice('prog-a', 'GROUNDING');
      expect(await m.lib.getPracticeProgressSummary(u)).toEqual({
        completedSessions: 0,
        lastCompleted: null,
      });
      for (const day of [3, 5]) {
        await m.db.insert(m.practiceCompletions).values({
          userId: u,
          practiceId: p.id,
          completed: true,
          completedAt: new Date(Date.UTC(2026, 10, day, 9, 0, 0)),
          progressPct: 1,
          playCount: 1,
        });
      }
      // An unfinished session does not count.
      await m.db.insert(m.practiceCompletions).values({
        userId: u,
        practiceId: p.id,
        completed: false,
        progressPct: 0.4,
        playCount: 1,
      });
      const s = await m.lib.getPracticeProgressSummary(u);
      expect(s.completedSessions).toBe(2);
      expect(s.lastCompleted?.title).toBe('prog-a');
      expect(new Date(s.lastCompleted!.completedAt).getUTCDate()).toBe(5);
    });
  },
);
