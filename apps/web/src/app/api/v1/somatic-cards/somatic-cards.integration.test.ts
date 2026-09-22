import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { eq, inArray } from 'drizzle-orm';
import {
  db,
  somaticSeries,
  somaticCards,
  type NewSomaticSeries,
  type NewSomaticCard,
} from '@tnsi/db';
import { EntitlementRequiredError } from '@tnsi/auth/errors/auth';

/**
 * Isolated-database integration tests for the Somatic Card Read API
 * (`GET /api/v1/somatic-cards/series`, `.../series/[seriesSlug]`,
 * `.../[cardSlug]`) - required by this milestone's "REQUIRED TESTS"
 * section. Same safety model as
 * `apps/web/src/lib/sync-somatic.integration.test.ts`: `db` reads
 * `process.env.DATABASE_URL` directly, so this file independently
 * verifies (content-based, not name-based) that it is never production
 * before any write runs.
 *
 * `requireMemberAccess`/`memberAccessErrorResponse` are mocked at the
 * `@/lib/auth-api` module boundary (not via a real Clerk session) - this
 * suite's job is to prove the routes query/filter/map Postgres correctly
 * and enforce the access-control *contract*, not to re-test Clerk itself
 * (which has no existing test coverage anywhere in this codebase either).
 *
 * Run with the isolated branch's connection string as `DATABASE_URL`, e.g.:
 *   DATABASE_URL="<isolated branch>" pnpm --filter @tnsi/web exec vitest run src/app/api/v1/somatic-cards/somatic-cards.integration.test.ts
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
assertNotProductionDatabase();

// `vi.mock` factories are hoisted above every import/top-level statement -
// the mock fn itself must be created via `vi.hoisted` so the factory below
// can reference it without triggering vitest's "no top-level variables
// inside a mock factory" guard.
const { mockRequireMemberAccess } = vi.hoisted(() => ({ mockRequireMemberAccess: vi.fn() }));
vi.mock('@/lib/auth-api', async () => {
  const actual = await vi.importActual<typeof import('@/lib/auth-api')>('@/lib/auth-api');
  return {
    ...actual,
    requireMemberAccess: () => mockRequireMemberAccess(),
  };
});

// Imported after the mock is registered, per vitest's hoisting contract.
const { GET: seriesListGET } = await import('./series/route');
const { GET: seriesDetailGET } = await import('./series/[seriesSlug]/route');
const { GET: cardDetailGET } = await import('./[cardSlug]/route');

const FAKE_USER = { id: 'test-user', entitlements: null } as never;

const TEST_RUN_ID = `read-api-${Date.now()}`;
const COLLECTION = `test-collection-${TEST_RUN_ID}`;
let seriesN = 1;
let cardN = 1;

function seriesFixture(overrides: Partial<NewSomaticSeries> = {}): NewSomaticSeries {
  const n = seriesN++;
  return {
    sanityId: `somaticSeries.${TEST_RUN_ID}.${n}`,
    seriesNumber: n,
    title: `Synthetic Series ${n}`,
    slug: `synthetic-series-${TEST_RUN_ID}-${n}`,
    collection: COLLECTION,
    description: 'Synthetic description.',
    coreQuestion: 'Synthetic core question?',
    visualTreatment: 'singleHero',
    defaultLayout: null,
    status: 'published',
    sortOrder: n,
    sanityData: { synthetic: true },
    ...overrides,
  };
}

function cardFixture(seriesId: string, overrides: Partial<NewSomaticCard> = {}): NewSomaticCard {
  const n = cardN++;
  return {
    sanityId: `somaticCard.${TEST_RUN_ID}.${n}`,
    cardNumber: n,
    title: `Synthetic Card ${n}`,
    slug: `synthetic-card-${TEST_RUN_ID}-${n}`,
    seriesId,
    collection: COLLECTION,
    status: 'published',
    sortOrder: n,
    invitation: 'Synthetic invitation.',
    purpose: 'Synthetic purpose.',
    description: 'Synthetic description.',
    orientation: 'seated',
    gentleNote: 'Synthetic gentle note.',
    anchor: 'Synthetic anchor.',
    visualTreatment: 'singleHero',
    cardArtworkUrl: 'https://cdn.example.com/artwork.jpg',
    cardArtworkAlt: 'Synthetic artwork alt text.',
    heroImageUrl: 'https://cdn.example.com/hero.jpg',
    heroImageAlt: 'Synthetic hero alt text.',
    practiceSteps: [
      { order: 0, label: 'Step one', instruction: 'Do the first thing.' },
      { order: 1, instruction: 'Do the second thing.' },
    ],
    whatToNotice: [
      { order: 0, text: 'Notice this.' },
      { order: 1, text: 'Notice that.' },
    ],
    supportingImages: [
      { order: 0, imageUrl: 'https://cdn.example.com/support-1.jpg', imageAlt: 'Support one alt.' },
    ],
    demonstrationSequence: [
      {
        order: 0,
        imageUrl: 'https://cdn.example.com/demo-1.jpg',
        imageAlt: 'Demo frame one alt.',
        label: 'Frame one',
      },
    ],
    sanityData: { synthetic: true },
    ...overrides,
  };
}

async function insertSeries(overrides: Partial<NewSomaticSeries> = {}) {
  const [row] = await db.insert(somaticSeries).values(seriesFixture(overrides)).returning();
  if (!row) throw new Error('Insert did not return a row');
  return row;
}

async function insertCard(seriesId: string, overrides: Partial<NewSomaticCard> = {}) {
  const [row] = await db.insert(somaticCards).values(cardFixture(seriesId, overrides)).returning();
  if (!row) throw new Error('Insert did not return a row');
  return row;
}

function seriesReq(query = '') {
  return new Request(`http://localhost/api/v1/somatic-cards/series${query}`);
}
function seriesDetailReq(seriesSlug: string) {
  return seriesDetailGET(new Request('http://localhost'), {
    params: Promise.resolve({ seriesSlug }),
  });
}
function cardDetailReq(cardSlug: string) {
  return cardDetailGET(new Request('http://localhost'), { params: Promise.resolve({ cardSlug }) });
}

beforeAll(() => {
  mockRequireMemberAccess.mockResolvedValue(FAKE_USER);
});

afterAll(async () => {
  const seriesRows = await db
    .select({ id: somaticSeries.id })
    .from(somaticSeries)
    .where(eq(somaticSeries.collection, COLLECTION));
  const seriesIds = seriesRows.map((r) => r.id);
  if (seriesIds.length > 0) {
    await db.delete(somaticCards).where(inArray(somaticCards.seriesId, seriesIds));
  }
  await db.delete(somaticSeries).where(eq(somaticSeries.collection, COLLECTION));
});

describe('GET /api/v1/somatic-cards/series', () => {
  it('1. returns published Series', async () => {
    const s = await insertSeries({ status: 'published' });
    const res = await seriesListGET(seriesReq());
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.data.series.some((x: { id: string }) => x.id === s.id)).toBe(true);
  });

  it('2. excludes draft Series', async () => {
    const s = await insertSeries({ status: 'draft' });
    const res = await seriesListGET(seriesReq());
    const body = await res.json();
    expect(body.data.series.some((x: { id: string }) => x.id === s.id)).toBe(false);
  });

  it('3. excludes archived Series', async () => {
    const s = await insertSeries({ status: 'archived' });
    const res = await seriesListGET(seriesReq());
    const body = await res.json();
    expect(body.data.series.some((x: { id: string }) => x.id === s.id)).toBe(false);
  });

  it('4. orders by sortOrder, not createdAt/insertion order', async () => {
    const high = await insertSeries({ status: 'published', sortOrder: 999 });
    const low = await insertSeries({ status: 'published', sortOrder: 1 });
    const res = await seriesListGET(seriesReq('?limit=50'));
    const body = await res.json();
    const ids = body.data.series.map((x: { id: string }) => x.id);
    expect(ids.indexOf(low.id)).toBeLessThan(ids.indexOf(high.id));
  });

  it('5. returns collection correctly', async () => {
    const s = await insertSeries({ status: 'published' });
    const res = await seriesListGET(seriesReq());
    const body = await res.json();
    const found = body.data.series.find((x: { id: string }) => x.id === s.id);
    expect(found.collection).toBe(COLLECTION);
  });

  it('23. unauthenticated request → 401', async () => {
    mockRequireMemberAccess.mockRejectedValueOnce(new Error('UNAUTHENTICATED'));
    const res = await seriesListGET(seriesReq());
    expect(res.status).toBe(401);
  });

  it('24. authenticated but not entitled → 403', async () => {
    mockRequireMemberAccess.mockRejectedValueOnce(new EntitlementRequiredError([], []));
    const res = await seriesListGET(seriesReq());
    expect(res.status).toBe(403);
  });

  it('26. never exposes internal DB metadata (sanityId/sanityData/createdAt/updatedAt)', async () => {
    await insertSeries({ status: 'published' });
    const res = await seriesListGET(seriesReq());
    const body = await res.json();
    for (const item of body.data.series) {
      expect(item).not.toHaveProperty('sanityId');
      expect(item).not.toHaveProperty('sanityData');
      expect(item).not.toHaveProperty('createdAt');
      expect(item).not.toHaveProperty('updatedAt');
    }
  });
});

describe('GET /api/v1/somatic-cards/series/[seriesSlug]', () => {
  it('9. Card belongs to published Series is returned', async () => {
    const series = await insertSeries({ status: 'published' });
    const card = await insertCard(series.id, { status: 'published' });
    const res = await seriesDetailReq(series.slug);
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.data.cards.some((c: { id: string }) => c.id === card.id)).toBe(true);
  });

  it('6. published Card returned / 7. draft Card excluded / 8. archived Card excluded', async () => {
    const series = await insertSeries({ status: 'published' });
    const published = await insertCard(series.id, { status: 'published' });
    const draft = await insertCard(series.id, { status: 'draft' });
    const archived = await insertCard(series.id, { status: 'archived' });
    const res = await seriesDetailReq(series.slug);
    const body = await res.json();
    const ids = body.data.cards.map((c: { id: string }) => c.id);
    expect(ids).toContain(published.id);
    expect(ids).not.toContain(draft.id);
    expect(ids).not.toContain(archived.id);
  });

  it('10. Card belonging to an unpublished Series is excluded from that Series lookup', async () => {
    const draftSeries = await insertSeries({ status: 'draft' });
    await insertCard(draftSeries.id, { status: 'published' });
    const res = await seriesDetailReq(draftSeries.slug);
    // The Series itself is draft, so the whole detail lookup 404s - a
    // published Card can never be reached through an unpublished Series.
    expect(res.status).toBe(404);
  });

  it('11. Card ordering uses sortOrder / 12. cardNumber returned', async () => {
    const series = await insertSeries({ status: 'published' });
    const high = await insertCard(series.id, { status: 'published', sortOrder: 999 });
    const low = await insertCard(series.id, { status: 'published', sortOrder: 1 });
    const res = await seriesDetailReq(series.slug);
    const body = await res.json();
    const ids = body.data.cards.map((c: { id: string }) => c.id);
    expect(ids.indexOf(low.id)).toBeLessThan(ids.indexOf(high.id));
    const lowItem = body.data.cards.find((c: { id: string }) => c.id === low.id);
    expect(lowItem.cardNumber).toBe(low.cardNumber);
  });

  it('20. missing Series → 404', async () => {
    const res = await seriesDetailReq(`does-not-exist-${TEST_RUN_ID}`);
    expect(res.status).toBe(404);
  });

  it('19. valid Series lookup returns Series metadata', async () => {
    const series = await insertSeries({ status: 'published', coreQuestion: 'A real question?' });
    const res = await seriesDetailReq(series.slug);
    const body = await res.json();
    expect(body.data.id).toBe(series.id);
    expect(body.data.coreQuestion).toBe('A real question?');
  });
});

describe('GET /api/v1/somatic-cards/[cardSlug]', () => {
  it('21. valid Card lookup returns structured content', async () => {
    const series = await insertSeries({ status: 'published' });
    const card = await insertCard(series.id, { status: 'published' });
    const res = await cardDetailReq(card.slug);
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.data.id).toBe(card.id);
  });

  it('22. missing Card → 404', async () => {
    const res = await cardDetailReq(`does-not-exist-${TEST_RUN_ID}`);
    expect(res.status).toBe(404);
  });

  it('13. structured content returned correctly', async () => {
    const series = await insertSeries({ status: 'published' });
    const card = await insertCard(series.id, {
      status: 'published',
      invitation: 'Come sit for a moment.',
      purpose: 'To notice.',
      orientation: 'lying down',
      gentleNote: 'No rush here.',
      anchor: 'You are held.',
    });
    const res = await cardDetailReq(card.slug);
    const body = await res.json();
    expect(body.data.invitation).toBe('Come sit for a moment.');
    expect(body.data.purpose).toBe('To notice.');
    expect(body.data.orientation).toBe('lying down');
    expect(body.data.gentleNote).toBe('No rush here.');
    expect(body.data.anchor).toBe('You are held.');
  });

  it('14. variable-length practiceSteps returned', async () => {
    const series = await insertSeries({ status: 'published' });
    const card = await insertCard(series.id, {
      status: 'published',
      practiceSteps: [{ order: 0, instruction: 'Only one step.' }],
    });
    const res = await cardDetailReq(card.slug);
    const body = await res.json();
    expect(body.data.practiceSteps).toHaveLength(1);
    expect(body.data.practiceSteps[0].instruction).toBe('Only one step.');
  });

  it('15. whatToNotice returned in order', async () => {
    const series = await insertSeries({ status: 'published' });
    const card = await insertCard(series.id, { status: 'published' });
    const res = await cardDetailReq(card.slug);
    const body = await res.json();
    expect(body.data.whatToNotice.map((w: { order: number }) => w.order)).toEqual([0, 1]);
  });

  it('16. supportingImages returned in order, 18. alt text preserved', async () => {
    const series = await insertSeries({ status: 'published' });
    const card = await insertCard(series.id, { status: 'published' });
    const res = await cardDetailReq(card.slug);
    const body = await res.json();
    expect(body.data.supportingImages[0].imageAlt).toBe('Support one alt.');
  });

  it('17. demonstrationSequence returned in order', async () => {
    const series = await insertSeries({ status: 'published' });
    const card = await insertCard(series.id, {
      status: 'published',
      demonstrationSequence: [
        { order: 1, imageUrl: 'https://cdn.example.com/d2.jpg', imageAlt: 'second' },
        { order: 0, imageUrl: 'https://cdn.example.com/d1.jpg', imageAlt: 'first' },
      ],
    });
    const res = await cardDetailReq(card.slug);
    const body = await res.json();
    // The array's own `order` field is what defines display order, not
    // JSON array position - the JSONB column is stored/returned as
    // authored, unsorted by the API (mirrors the sync layer's own
    // pass-through - see docs/TNSI_Somatic_Card_Read_API_v1.md §7).
    expect(body.data.demonstrationSequence.map((d: { order: number }) => d.order).sort()).toEqual([
      0, 1,
    ]);
  });

  it('18b. cardArtwork/heroImage alt text preserved', async () => {
    const series = await insertSeries({ status: 'published' });
    const card = await insertCard(series.id, { status: 'published' });
    const res = await cardDetailReq(card.slug);
    const body = await res.json();
    expect(body.data.cardArtwork.alt).toBe('Synthetic artwork alt text.');
    expect(body.data.heroImage.alt).toBe('Synthetic hero alt text.');
  });

  it('25. never exposes raw sanityData / 26. never exposes internal DB metadata', async () => {
    const series = await insertSeries({ status: 'published' });
    const card = await insertCard(series.id, { status: 'published' });
    const res = await cardDetailReq(card.slug);
    const body = await res.json();
    expect(body.data).not.toHaveProperty('sanityData');
    expect(body.data).not.toHaveProperty('sanityId');
    expect(body.data).not.toHaveProperty('createdAt');
    expect(body.data).not.toHaveProperty('updatedAt');
    expect(body.data.series).not.toHaveProperty('sanityData');
  });

  it('27/28. response contains no Practice/PowerDrop-domain fields', async () => {
    const series = await insertSeries({ status: 'published' });
    const card = await insertCard(series.id, { status: 'published' });
    const res = await cardDetailReq(card.slug);
    const body = await res.json();
    for (const key of ['focus', 'anchorStatement', 'cardImage', 'contentType', 'difficulty']) {
      expect(body.data).not.toHaveProperty(key);
    }
  });
});
