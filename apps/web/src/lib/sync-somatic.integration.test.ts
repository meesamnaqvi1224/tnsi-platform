import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { eq, sql } from 'drizzle-orm';
import { db, somaticSeries, somaticCards, practices, powerDropUsages, users } from '@tnsi/db';
import { syncSomaticSeries, syncSomaticCard } from './sync-somatic';
import type {
  SanitySomaticCardWebhookPayload,
  SanitySomaticSeriesWebhookPayload,
} from '@tnsi/cms/webhook';

/**
 * Isolated-database integration tests for the Somatic Series/Card sync
 * layer - required by this milestone's "REQUIRED TEST MATRIX", items
 * 9-29 (everything that genuinely needs a real Postgres connection;
 * pure decision-logic is covered separately by
 * packages/cms/src/webhook/sync-plan-somatic.test.ts, which needs no
 * database at all).
 *
 * SAFETY: this suite writes real rows and must never run against
 * production. `db` (from `@tnsi/db`) reads `process.env.DATABASE_URL`
 * directly at import time - note this is a *different* mechanism from
 * `packages/db/drizzle.config.ts`'s new `TNSI_TEST_DATABASE_URL` guard
 * (§3 of docs/TNSI_Somatic_Card_Pre_Sync_Readiness.md), which only
 * protects `drizzle-kit` CLI commands, not arbitrary application code
 * that imports the runtime `db` client - so this file does its own,
 * independent, content-based check (not a name-based one - "do not rely
 * solely on environment variable names") before any write runs.
 *
 * Run with the isolated branch's connection string as `DATABASE_URL`,
 * e.g.:
 *   DATABASE_URL="<isolated branch>" pnpm --filter @tnsi/web exec vitest run src/lib/sync-somatic.integration.test.ts
 */

const PRODUCTION_DB_HOST = 'ep-damp-flower-ayp7i2gc';

function assertNotProductionDatabase() {
  const url = process.env.DATABASE_URL ?? '';
  if (!url) {
    throw new Error('DATABASE_URL is not set - refusing to run integration tests with no target.');
  }
  if (url.includes(PRODUCTION_DB_HOST)) {
    throw new Error(
      'Refusing to run destructive integration tests against the production database. ' +
        'Set DATABASE_URL to an isolated test branch before running this suite.',
    );
  }
}

// Runs at module load, before any `describe`/`it` - the earliest
// possible point, so a misconfigured environment fails immediately
// rather than after tests have already started writing.
assertNotProductionDatabase();

const TEST_RUN_ID = `test-${Date.now()}`;
function seriesId(suffix: string) {
  return `somaticSeries.${TEST_RUN_ID}.${suffix}`;
}
function cardId(suffix: string) {
  return `somaticCard.${TEST_RUN_ID}.${suffix}`;
}

// Every independent Series/Card fixture needs its own seriesNumber/
// cardNumber, since (collection, seriesNumber)/(collection, cardNumber)
// are real unique constraints and every fixture in this suite shares
// the same default collection - auto-incrementing avoids every test
// having to hand-pick a number that doesn't collide with every other
// test's fixtures. Tests that specifically exercise the uniqueness
// constraint (e.g. #14) still pass an explicit, deliberately-repeated
// number.
let nextSeriesNumber = 1;
let nextCardNumber = 1;

function seriesEvent(
  id: string,
  overrides: Partial<NonNullable<SanitySomaticSeriesWebhookPayload['document']>> = {},
  eventOverrides: Partial<SanitySomaticSeriesWebhookPayload> = {},
): SanitySomaticSeriesWebhookPayload {
  const n = nextSeriesNumber++;
  return {
    _id: id,
    _type: 'somaticSeries',
    operation: 'update',
    document: {
      seriesNumber: n,
      title: 'Synthetic Test Series',
      // A slug built from `id` (a dotted Sanity _id like
      // "somaticSeries.test-....s1") would fail somaticSlugSchema's
      // lowercase-hyphenated-only regex - dots aren't valid slug
      // characters. Built from the numeric TEST_RUN_ID/seriesNumber
      // instead, which are already guaranteed unique and regex-valid.
      slug: `synthetic-test-series-${TEST_RUN_ID.replace(/[^a-z0-9]/g, '')}-${n}`,
      collection: `test-collection-${TEST_RUN_ID}`,
      description: 'Synthetic content for integration testing only.',
      coreQuestion: null,
      visualTreatment: 'singleHero',
      defaultLayout: null,
      status: 'published',
      sortOrder: 0,
      ...overrides,
    },
    ...eventOverrides,
  };
}

function cardEvent(
  id: string,
  referencedSeriesId: string,
  overrides: Partial<NonNullable<SanitySomaticCardWebhookPayload['document']>> = {},
  eventOverrides: Partial<SanitySomaticCardWebhookPayload> = {},
): SanitySomaticCardWebhookPayload {
  const n = nextCardNumber++;
  return {
    _id: id,
    _type: 'somaticCard',
    operation: 'update',
    document: {
      cardNumber: n,
      title: 'Synthetic Test Card',
      // Same reasoning as seriesEvent()'s slug above - built from the
      // numeric run id/counter, never from the dotted `id`.
      slug: `synthetic-test-card-${TEST_RUN_ID.replace(/[^a-z0-9]/g, '')}-${n}`,
      seriesId: referencedSeriesId,
      seriesCollection: `test-collection-${TEST_RUN_ID}`,
      status: 'published',
      sortOrder: 0,
      invitation: null,
      purpose: null,
      description: null,
      orientation: null,
      gentleNote: null,
      anchor: null,
      visualTreatment: null,
      cardArtworkUrl: null,
      cardArtworkAlt: null,
      heroImageUrl: null,
      heroImageAlt: null,
      practiceSteps: [{ order: 0, instruction: 'Synthetic step.' }],
      whatToNotice: [],
      supportingImages: [],
      demonstrationSequence: [],
      ...overrides,
    },
    ...eventOverrides,
  };
}

// Baseline rows to prove Practice/PowerDrop are untouched (items 28-29).
// A real `users` row is needed as the FK target for a PowerDrop usage row.
let baselineUserId: string;
let baselinePracticeId: string;

beforeAll(async () => {
  const [user] = await db
    .insert(users)
    .values({ clerkUserId: `test-clerk-${TEST_RUN_ID}`, email: `${TEST_RUN_ID}@example.test` })
    .returning({ id: users.id });
  baselineUserId = user!.id;

  const [practice] = await db
    .insert(practices)
    .values({
      sanityId: `practice.${TEST_RUN_ID}`,
      title: 'Baseline Practice (isolation control)',
      contentType: 'journal',
      sanityData: {},
      isPublished: true,
    })
    .returning({ id: practices.id });
  baselinePracticeId = practice!.id;

  await db.insert(powerDropUsages).values({
    userId: baselineUserId,
    powerDropId: `powerDrop.${TEST_RUN_ID}`,
    powerDropSlug: `baseline-${TEST_RUN_ID}`,
  });
});

afterAll(async () => {
  // Clean up every row this suite created, in dependency order.
  await db.delete(somaticCards).where(sql`sanity_id like ${'%' + TEST_RUN_ID + '%'}`);
  await db.delete(somaticSeries).where(sql`sanity_id like ${'%' + TEST_RUN_ID + '%'}`);
  await db.delete(powerDropUsages).where(eq(powerDropUsages.userId, baselineUserId));
  await db.delete(practices).where(eq(practices.id, baselinePracticeId));
  await db.delete(users).where(eq(users.id, baselineUserId));
});

describe('Series sync', () => {
  it('1. syncs a valid published Series', async () => {
    const outcome = await syncSomaticSeries(seriesEvent(seriesId('s1')));
    expect(outcome).toMatchObject({ status: 'synced', action: 'upserted' });
    const [row] = await db
      .select()
      .from(somaticSeries)
      .where(eq(somaticSeries.sanityId, seriesId('s1')));
    expect(row?.status).toBe('published');
  });

  it('2. syncs a valid draft-status Series (Sanity published, editorial draft)', async () => {
    await syncSomaticSeries(seriesEvent(seriesId('s2'), { status: 'draft' }));
    const [row] = await db
      .select()
      .from(somaticSeries)
      .where(eq(somaticSeries.sanityId, seriesId('s2')));
    expect(row?.status).toBe('draft');
  });

  it('3. syncs a valid archived-status Series', async () => {
    await syncSomaticSeries(seriesEvent(seriesId('s3'), { status: 'archived' }));
    const [row] = await db
      .select()
      .from(somaticSeries)
      .where(eq(somaticSeries.sanityId, seriesId('s3')));
    expect(row?.status).toBe('archived');
  });

  it('4. is idempotent on a duplicate Series webhook (no duplicate row)', async () => {
    const event = seriesEvent(seriesId('s4'));
    await syncSomaticSeries(event);
    await syncSomaticSeries(event);
    const rows = await db
      .select()
      .from(somaticSeries)
      .where(eq(somaticSeries.sanityId, seriesId('s4')));
    expect(rows).toHaveLength(1);
  });

  it('5. updates the same row on a Series update event', async () => {
    await syncSomaticSeries(seriesEvent(seriesId('s5'), { title: 'Original Title' }));
    await syncSomaticSeries(seriesEvent(seriesId('s5'), { title: 'Updated Title' }));
    const rows = await db
      .select()
      .from(somaticSeries)
      .where(eq(somaticSeries.sanityId, seriesId('s5')));
    expect(rows).toHaveLength(1);
    expect(rows[0]?.title).toBe('Updated Title');
  });

  it('6. rejects a malformed Series payload without writing anything', async () => {
    const malformed = seriesEvent(seriesId('s6'), {
      // @ts-expect-error - deliberately malformed for the test
      seriesNumber: 'not-a-number',
    });
    // syncSomaticSeries returns a typed 'invalid-content' outcome for a
    // validation failure - it does not throw. Throwing is reserved for
    // genuinely unexpected errors (see the 'conflict' branch's try/catch).
    const outcome = await syncSomaticSeries(malformed);
    expect(outcome.status).toBe('invalid-content');
    const rows = await db
      .select()
      .from(somaticSeries)
      .where(eq(somaticSeries.sanityId, seriesId('s6')));
    expect(rows).toHaveLength(0);
  });

  it('7. rejects an invalid Series status value', async () => {
    const malformed = seriesEvent(seriesId('s7'), {
      // @ts-expect-error - deliberately invalid for the test
      status: 'not-a-real-status',
    });
    const outcome = await syncSomaticSeries(malformed);
    expect(outcome.status).toBe('invalid-content');
  });

  it('8. rejects an invalid Series visual treatment value', async () => {
    const malformed = seriesEvent(seriesId('s8'), {
      // @ts-expect-error - deliberately invalid for the test
      visualTreatment: 'clinicalDiagnosis',
    });
    const outcome = await syncSomaticSeries(malformed);
    expect(outcome.status).toBe('invalid-content');
  });
});

describe('Card sync', () => {
  it('9. syncs a valid Card with an existing Series', async () => {
    await syncSomaticSeries(seriesEvent(seriesId('c9-series')));
    const outcome = await syncSomaticCard(cardEvent(cardId('c9'), seriesId('c9-series')));
    expect(outcome).toMatchObject({ status: 'synced', action: 'upserted' });
    const [row] = await db
      .select()
      .from(somaticCards)
      .where(eq(somaticCards.sanityId, cardId('c9')));
    expect(row?.title).toBe('Synthetic Test Card');
    expect(row?.collection).toBe(`test-collection-${TEST_RUN_ID}`);
  });

  it('10. is idempotent on a duplicate Card webhook (no duplicate row)', async () => {
    await syncSomaticSeries(seriesEvent(seriesId('c10-series')));
    const event = cardEvent(cardId('c10'), seriesId('c10-series'), { cardNumber: 10 });
    await syncSomaticCard(event);
    await syncSomaticCard(event);
    const rows = await db
      .select()
      .from(somaticCards)
      .where(eq(somaticCards.sanityId, cardId('c10')));
    expect(rows).toHaveLength(1);
  });

  it('11. updates the same row on a Card update event', async () => {
    await syncSomaticSeries(seriesEvent(seriesId('c11-series')));
    await syncSomaticCard(
      cardEvent(cardId('c11'), seriesId('c11-series'), { cardNumber: 11, title: 'Original' }),
    );
    await syncSomaticCard(
      cardEvent(cardId('c11'), seriesId('c11-series'), { cardNumber: 11, title: 'Updated' }),
    );
    const rows = await db
      .select()
      .from(somaticCards)
      .where(eq(somaticCards.sanityId, cardId('c11')));
    expect(rows).toHaveLength(1);
    expect(rows[0]?.title).toBe('Updated');
  });

  it('12. fails safely when a Card arrives before its Series (no orphan)', async () => {
    const outcome = await syncSomaticCard(
      cardEvent(cardId('c12'), seriesId('c12-nonexistent-series'), { cardNumber: 12 }),
    );
    expect(outcome).toMatchObject({ status: 'missing-series', retryable: true });
    const rows = await db
      .select()
      .from(somaticCards)
      .where(eq(somaticCards.sanityId, cardId('c12')));
    expect(rows).toHaveLength(0);
  });

  it('13. rejects a Card whose resolved Series collection disagrees with its existing row', async () => {
    await syncSomaticSeries(
      seriesEvent(seriesId('c13-series-a'), {
        collection: `${TEST_RUN_ID}-collection-a`,
        seriesNumber: 20,
      }),
    );
    await syncSomaticSeries(
      seriesEvent(seriesId('c13-series-b'), {
        collection: `${TEST_RUN_ID}-collection-b`,
        seriesNumber: 21,
      }),
    );
    // First sync under series-a - establishes the row with collection-a.
    await syncSomaticCard(
      cardEvent(cardId('c13'), seriesId('c13-series-a'), {
        cardNumber: 13,
        seriesCollection: `${TEST_RUN_ID}-collection-a`,
      }),
    );
    // Re-point the same Card at series-b (a different collection) - must be rejected, not silently repaired.
    const outcome = await syncSomaticCard(
      cardEvent(cardId('c13'), seriesId('c13-series-b'), {
        cardNumber: 13,
        seriesCollection: `${TEST_RUN_ID}-collection-b`,
      }),
    );
    expect(outcome).toMatchObject({ status: 'collection-mismatch' });
    const [row] = await db
      .select()
      .from(somaticCards)
      .where(eq(somaticCards.sanityId, cardId('c13')));
    expect(row?.collection).toBe(`${TEST_RUN_ID}-collection-a`); // unchanged
  });

  it('14. surfaces a duplicate (collection, cardNumber) as a conflict, not a crash', async () => {
    await syncSomaticSeries(seriesEvent(seriesId('c14-series')));
    await syncSomaticCard(cardEvent(cardId('c14a'), seriesId('c14-series'), { cardNumber: 14 }));
    const outcome = await syncSomaticCard(
      cardEvent(cardId('c14b'), seriesId('c14-series'), { cardNumber: 14 }),
    );
    expect(outcome.status).toBe('conflict');
  });

  it('15. rejects a malformed Card payload without writing anything', async () => {
    await syncSomaticSeries(seriesEvent(seriesId('c15-series')));
    const malformed = cardEvent(cardId('c15'), seriesId('c15-series'), {
      // @ts-expect-error - deliberately malformed for the test
      cardNumber: 'not-a-number',
    });
    const outcome = await syncSomaticCard(malformed);
    expect(outcome.status).toBe('invalid-content');
    const rows = await db
      .select()
      .from(somaticCards)
      .where(eq(somaticCards.sanityId, cardId('c15')));
    expect(rows).toHaveLength(0);
  });

  it('16. rejects an invalid ordered JSONB structure (practiceSteps missing required instruction)', async () => {
    await syncSomaticSeries(seriesEvent(seriesId('c16-series')));
    const malformed = cardEvent(cardId('c16'), seriesId('c16-series'), {
      cardNumber: 16,
      // @ts-expect-error - deliberately invalid for the test (missing `instruction`)
      practiceSteps: [{ order: 0 }],
    });
    const outcome = await syncSomaticCard(malformed);
    expect(outcome.status).toBe('invalid-content');
  });

  it('17. rejects a Card with a meaningful image but missing alt text', async () => {
    await syncSomaticSeries(seriesEvent(seriesId('c17-series')));
    const outcome = await syncSomaticCard(
      cardEvent(cardId('c17'), seriesId('c17-series'), {
        cardNumber: 17,
        cardArtworkUrl: 'https://cdn.example.com/artwork.jpg',
        cardArtworkAlt: null,
      }),
    );
    expect(outcome).toMatchObject({ status: 'invalid-content' });
    const rows = await db
      .select()
      .from(somaticCards)
      .where(eq(somaticCards.sanityId, cardId('c17')));
    expect(rows).toHaveLength(0);
  });

  it('18. syncs a valid Card with no optional supporting images', async () => {
    await syncSomaticSeries(seriesEvent(seriesId('c18-series')));
    const outcome = await syncSomaticCard(
      cardEvent(cardId('c18'), seriesId('c18-series'), { cardNumber: 18, supportingImages: [] }),
    );
    expect(outcome).toMatchObject({ status: 'synced', action: 'upserted' });
  });

  it('19. syncs a valid Card with a populated demonstration sequence', async () => {
    await syncSomaticSeries(seriesEvent(seriesId('c19-series')));
    const outcome = await syncSomaticCard(
      cardEvent(cardId('c19'), seriesId('c19-series'), {
        cardNumber: 19,
        demonstrationSequence: [
          { order: 0, imageUrl: 'https://cdn.example.com/f1.jpg', imageAlt: 'Frame one.' },
          { order: 1, imageUrl: 'https://cdn.example.com/f2.jpg', imageAlt: 'Frame two.' },
        ],
      }),
    );
    expect(outcome).toMatchObject({ status: 'synced', action: 'upserted' });
    const [row] = await db
      .select()
      .from(somaticCards)
      .where(eq(somaticCards.sanityId, cardId('c19')));
    expect(row?.demonstrationSequence).toHaveLength(2);
  });

  it('20. syncs a valid Card with variable-length practice steps (no 3-step limit)', async () => {
    await syncSomaticSeries(seriesEvent(seriesId('c20-series')));
    const sixSteps = Array.from({ length: 6 }, (_, i) => ({ order: i, instruction: `Step ${i}.` }));
    const outcome = await syncSomaticCard(
      cardEvent(cardId('c20'), seriesId('c20-series'), { cardNumber: 20, practiceSteps: sixSteps }),
    );
    expect(outcome).toMatchObject({ status: 'synced', action: 'upserted' });
    const [row] = await db
      .select()
      .from(somaticCards)
      .where(eq(somaticCards.sanityId, cardId('c20')));
    expect(row?.practiceSteps).toHaveLength(6);
  });
});

describe('Publication rules', () => {
  it('21. a Sanity draft document is not synced as the current document', async () => {
    const outcome = await syncSomaticSeries(
      seriesEvent(seriesId('p21'), { status: 'published' }, { _id: `drafts.${seriesId('p21')}` }),
    );
    expect(outcome).toMatchObject({ status: 'synced', action: 'skipped' });
    const rows = await db
      .select()
      .from(somaticSeries)
      .where(eq(somaticSeries.sanityId, seriesId('p21')));
    expect(rows).toHaveLength(0);
  });

  it('22. published Sanity document + status=draft syncs with status=draft', async () => {
    await syncSomaticSeries(seriesEvent(seriesId('p22'), { status: 'draft' }));
    const [row] = await db
      .select()
      .from(somaticSeries)
      .where(eq(somaticSeries.sanityId, seriesId('p22')));
    expect(row?.status).toBe('draft');
  });

  it('23. published Sanity document + status=published syncs with status=published', async () => {
    await syncSomaticSeries(seriesEvent(seriesId('p23'), { status: 'published' }));
    const [row] = await db
      .select()
      .from(somaticSeries)
      .where(eq(somaticSeries.sanityId, seriesId('p23')));
    expect(row?.status).toBe('published');
  });

  it('24. published Sanity document + status=archived syncs with status=archived', async () => {
    await syncSomaticSeries(seriesEvent(seriesId('p24'), { status: 'archived' }));
    const [row] = await db
      .select()
      .from(somaticSeries)
      .where(eq(somaticSeries.sanityId, seriesId('p24')));
    expect(row?.status).toBe('archived');
  });
});

describe('Idempotency', () => {
  it('25. repeated Series event does not duplicate or error', async () => {
    const event = seriesEvent(seriesId('i25'));
    const first = await syncSomaticSeries(event);
    const second = await syncSomaticSeries(event);
    expect(first.status).toBe('synced');
    expect(second.status).toBe('synced');
    const rows = await db
      .select()
      .from(somaticSeries)
      .where(eq(somaticSeries.sanityId, seriesId('i25')));
    expect(rows).toHaveLength(1);
  });

  it('26. repeated Card event does not duplicate or error', async () => {
    await syncSomaticSeries(seriesEvent(seriesId('i26-series')));
    const event = cardEvent(cardId('i26'), seriesId('i26-series'), { cardNumber: 26 });
    await syncSomaticCard(event);
    const second = await syncSomaticCard(event);
    expect(second.status).toBe('synced');
    const rows = await db
      .select()
      .from(somaticCards)
      .where(eq(somaticCards.sanityId, cardId('i26')));
    expect(rows).toHaveLength(1);
  });

  it('27. a repeated update event updates the same row, not a new one', async () => {
    await syncSomaticSeries(seriesEvent(seriesId('i27'), { title: 'v1' }));
    await syncSomaticSeries(seriesEvent(seriesId('i27'), { title: 'v2' }));
    await syncSomaticSeries(seriesEvent(seriesId('i27'), { title: 'v3' }));
    const rows = await db
      .select()
      .from(somaticSeries)
      .where(eq(somaticSeries.sanityId, seriesId('i27')));
    expect(rows).toHaveLength(1);
    expect(rows[0]?.title).toBe('v3');
  });
});

describe('Isolation from Practice/PowerDrop', () => {
  it('28. no Practice rows were changed by any Somatic sync in this suite', async () => {
    const [row] = await db.select().from(practices).where(eq(practices.id, baselinePracticeId));
    expect(row?.title).toBe('Baseline Practice (isolation control)');
    expect(row?.isPublished).toBe(true);
  });

  it('29. no PowerDrop usage rows were changed by any Somatic sync in this suite', async () => {
    const rows = await db
      .select()
      .from(powerDropUsages)
      .where(eq(powerDropUsages.userId, baselineUserId));
    expect(rows).toHaveLength(1);
    expect(rows[0]?.powerDropSlug).toBe(`baseline-${TEST_RUN_ID}`);
  });
});
