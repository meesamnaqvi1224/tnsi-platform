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

async function newPractice(title: string, tags: string[], extra: { isFree?: boolean } = {}) {
  const [row] = await m.db
    .insert(m.practices)
    .values({
      sanityId: `${RUN}-${title}`,
      title,
      contentType: 'audio',
      tags,
      sanityData: {},
      isPublished: true,
      ...extra,
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

// Every query is a network round trip to a hosted database, so these tests need far more than vitest's 5 s default.
describe.skipIf(!enabled)(
  'alternative recommendation and progress summary on real PostgreSQL',
  { timeout: 120_000 },
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

    it('recommends by Human Expansion Theory condition: a lower answer gets Safety-first content, with the next best as the alternative', async () => {
      const u = await newUser('alt');
      const safetyA = await newPractice('het-safety-a', ['Safety']);
      const safetyB = await newPractice('het-safety-b', ['Safety', 'Capacity']);
      const exp = await newPractice('het-expansion', ['Expansion']);
      await checkInToday(u, 2); // unsettled: Safety first, then Capacity
      const { primary, alternative, condition } = await m.lib.getRecommendedPractices(u);
      expect(condition).toBe('Safety');
      expect([safetyA.id, safetyB.id]).toContain(primary?.id);
      // A Safety-first answer never offers an Expansion practice while two Safety ones exist.
      expect(primary?.id).not.toBe(exp.id);
      expect(alternative?.id).not.toBe(primary?.id);
      // The single-pick function the rest of the app uses agrees with the primary.
      expect((await m.lib.getRecommendedPractice(u))?.id).toBe(primary?.id);
    });

    it('has no alternative when only one practice is tagged, and nothing without a check-in', async () => {
      const none = await newUser('alt-none');
      expect(await m.lib.getRecommendedPractices(none)).toEqual({
        primary: null,
        alternative: null,
        condition: null,
      });
    });

    it('falls back down the preference order rather than returning nothing, and ignores untagged practices', async () => {
      const u = await newUser('alt-fallback');
      await newPractice('het-untagged', ['Healing']);
      await checkInToday(u, 4); // Availability first; none of this file\'s practices carry it
      const r = await m.lib.getRecommendedPractices(u);
      expect(r.primary).not.toBeNull();
      expect(r.primary?.title).not.toBe('het-untagged');
    });

    it('a free member is only ever recommended free practices; a paid member draws from the whole library', async () => {
      const free = await newPractice('het-free', ['Expansion'], { isFree: true });
      await newPractice('het-paid-a', ['Expansion'], { isFree: false });
      await newPractice('het-paid-b', ['Expansion'], { isFree: false });
      const u = await newUser('entitlement');
      await checkInToday(u, 5);

      const freeMember = await m.lib.getRecommendedPractices(u, { freeOnly: true });
      expect(freeMember.primary?.id).toBe(free.id);
      expect(freeMember.primary?.isFree).toBe(true);
      for (const practice of [freeMember.primary, freeMember.alternative]) {
        expect(practice === null || practice.isFree === true).toBe(true);
      }

      const paidMember = await m.lib.getRecommendedPractices(u);
      expect(paidMember.primary).not.toBeNull();
      expect(paidMember.alternative).not.toBeNull();
      expect(paidMember.alternative?.id).not.toBe(paidMember.primary?.id);
      expect((await m.lib.getRecommendedPractice(u, { freeOnly: true }))?.id).toBe(free.id);
    });

    it('a practice completed this week is offered after an unseen one of the same relevance', async () => {
      const u = await newUser('recent');
      const a = await newPractice('het-recent-a', ['Availability']);
      const b = await newPractice('het-recent-b', ['Availability']);
      await checkInToday(u, 4); // Availability first
      const first = (await m.lib.getRecommendedPractices(u)).primary!;
      expect([a.id, b.id]).toContain(first.id);
      await m.db.insert(m.practiceCompletions).values({
        userId: u,
        practiceId: first.id,
        completed: true,
        completedAt: new Date(),
        progressPct: 1,
        playCount: 1,
      });
      const after = (await m.lib.getRecommendedPractices(u)).primary!;
      expect(after.id).not.toBe(first.id);
    });

    it('a free member whose answer has no free practice gets no paid one', async () => {
      const u = await newUser('entitlement-none');
      await newPractice('het-paid-only', ['Safety'], { isFree: false });
      await checkInToday(u, 1);
      const r = await m.lib.getRecommendedPractices(u, { freeOnly: true });
      for (const practice of [r.primary, r.alternative]) {
        expect(practice === null || practice.isFree === true).toBe(true);
      }
    });

    it('the progress summary counts completed sessions (repeats included) and names the latest', async () => {
      const u = await newUser('progress');
      const p = await newPractice('prog-a', ['Safety']);
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
