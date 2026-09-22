import { db, somaticSeries, somaticCards } from '@tnsi/db';
import { eq } from 'drizzle-orm';
import {
  buildSomaticSeriesSyncPlan,
  prepareSomaticCardSync,
  type SanitySomaticSeriesWebhookPayload,
  type SanitySomaticCardWebhookPayload,
} from '@tnsi/cms/webhook';
import { somaticSeriesContentSchema, somaticCardContentSchema } from '@tnsi/validation';

/**
 * Executes Sanity `somaticSeries`/`somaticCard` webhook events against
 * Postgres. Genuinely separate from `sync-practice.ts` - no shared
 * function, no shared table, no shared plan type - per
 * docs/TNSI_Somatic_Card_Sync_v1.md. The only things reused from the
 * Practice sync path are proven, content-agnostic infrastructure
 * (`@tnsi/db`'s `db` client, the webhook signature verification used by
 * the route that calls these functions) - never Practice-specific logic.
 *
 * Series sync can reuse Practice's "decision logic is pure, execution
 * does the I/O" shape unchanged (`buildSomaticSeriesSyncPlan` is fully
 * pure). Card sync cannot be fully pure the same way - it must resolve
 * the referenced Series against Postgres before it knows what to write
 * - so `prepareSomaticCardSync` only does the pure part, and the I/O
 * (resolve Series, check for an existing Card, then write) all happens
 * here.
 */

export type SomaticSyncOutcome =
  | { status: 'synced'; action: 'upserted' | 'archived' | 'skipped'; sanityId: string }
  /** The Card's Series hasn't synced yet - do not create an orphan. Caller should treat this as retryable (the Series event, once processed, doesn't automatically retry this Card - a future webhook delivery/retry of the Card event itself resolves it). */
  | { status: 'missing-series'; sanityId: string; seriesSanityId: string; retryable: true }
  /** An existing Card's Series reference resolved to a different `collection` than the Card currently has - refused rather than silently changed. Permanent failure until the CMS content is corrected (see docs/TNSI_Somatic_Card_Sync_v1.md §8). */
  | {
      status: 'collection-mismatch';
      sanityId: string;
      existingCollection: string;
      resolvedCollection: string;
    }
  /** The assembled row failed final Zod validation (e.g. missing alt text on a present image, malformed ordered array) - permanent failure until the CMS content is corrected. */
  | { status: 'invalid-content'; sanityId: string; issues: string[] }
  /** A database constraint was violated at write time (e.g. duplicate `(collection, card_number)`) - a data conflict requiring correction, not a transient failure. */
  | { status: 'conflict'; sanityId: string; message: string };

/**
 * Series sync. Upsert is a single atomic `INSERT ... ON CONFLICT
 * (sanity_id) DO UPDATE`, keyed on the existing unique constraint -
 * idempotent by construction, no select-then-branch race window, same
 * pattern as `syncPractice`. Never deletes a row - a delete/unpublish
 * event archives it instead (see `buildSomaticSeriesSyncPlan`), which
 * is what keeps `somatic_cards.seriesId`'s `ON DELETE RESTRICT` safe:
 * this function never even attempts to delete a Series row, so the
 * question of whether dependent Cards would block it never arises.
 */
export async function syncSomaticSeries(
  event: SanitySomaticSeriesWebhookPayload,
): Promise<SomaticSyncOutcome> {
  const plan = buildSomaticSeriesSyncPlan(event);

  if (plan.action === 'skip') {
    return { status: 'synced', action: 'skipped', sanityId: plan.sanityId };
  }

  if (plan.action === 'archive') {
    await db
      .update(somaticSeries)
      .set({ status: 'archived', updatedAt: new Date() })
      .where(eq(somaticSeries.sanityId, plan.sanityId));
    return { status: 'synced', action: 'archived', sanityId: plan.sanityId };
  }

  const v = plan.values;
  const contentCheck = somaticSeriesContentSchema.safeParse({
    sanityId: v.sanityId,
    seriesNumber: v.seriesNumber,
    title: v.title,
    slug: v.slug,
    collection: v.collection,
    description: v.description ?? undefined,
    coreQuestion: v.coreQuestion ?? undefined,
    visualTreatment: v.visualTreatment ?? undefined,
    defaultLayout: v.defaultLayout ?? undefined,
    status: v.status,
    sortOrder: v.sortOrder,
  });
  if (!contentCheck.success) {
    return {
      status: 'invalid-content',
      sanityId: plan.sanityId,
      issues: contentCheck.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`),
    };
  }

  const values = { ...v, updatedAt: new Date() };
  try {
    await db
      .insert(somaticSeries)
      .values(values)
      .onConflictDoUpdate({ target: somaticSeries.sanityId, set: values });
  } catch (err) {
    return {
      status: 'conflict',
      sanityId: plan.sanityId,
      message: err instanceof Error ? err.message : 'Unique constraint violation',
    };
  }

  return { status: 'synced', action: 'upserted', sanityId: plan.sanityId };
}

/**
 * Card sync. Resolves the referenced Series first (by `sanityId`, never
 * by title/slug/number - per the locked identity rule), refusing to
 * write anything if it isn't found yet rather than inventing one or
 * inserting with a null Series (`missing-series`, retryable - the Card
 * event can simply be delivered again later, e.g. Sanity's own webhook
 * retry, once the Series has synced).
 *
 * `collection` is always derived from the resolved Series row, never
 * trusted from the Card's own payload - there is no independent
 * "Card's collection" to disagree with a brand-new Card. For an
 * *existing* Card, if the newly-resolved Series' `collection` differs
 * from the row's current value (its Series reference changed to point
 * at a different-collection Series since last sync), this is refused
 * as `collection-mismatch` rather than silently applied - changing a
 * Card's `collection` also changes which `(collection, card_number)`
 * uniqueness bucket it lives in, exactly the kind of consequential,
 * silent change docs/TNSI_Somatic_Card_Pre_Sync_Readiness.md §7 warned
 * against automating without an explicit decision.
 */
export async function syncSomaticCard(
  event: SanitySomaticCardWebhookPayload,
): Promise<SomaticSyncOutcome> {
  const prepared = prepareSomaticCardSync(event);

  if (prepared.action === 'skip') {
    return { status: 'synced', action: 'skipped', sanityId: prepared.sanityId };
  }

  if (prepared.action === 'archive') {
    await db
      .update(somaticCards)
      .set({ status: 'archived', updatedAt: new Date() })
      .where(eq(somaticCards.sanityId, prepared.sanityId));
    return { status: 'synced', action: 'archived', sanityId: prepared.sanityId };
  }

  const seriesRows = await db
    .select({ id: somaticSeries.id, collection: somaticSeries.collection })
    .from(somaticSeries)
    .where(eq(somaticSeries.sanityId, prepared.seriesSanityId))
    .limit(1);
  const seriesRow = seriesRows[0];

  if (!seriesRow) {
    return {
      status: 'missing-series',
      sanityId: prepared.sanityId,
      seriesSanityId: prepared.seriesSanityId,
      retryable: true,
    };
  }

  const existingRows = await db
    .select({ collection: somaticCards.collection })
    .from(somaticCards)
    .where(eq(somaticCards.sanityId, prepared.sanityId))
    .limit(1);
  const existing = existingRows[0];

  if (existing && existing.collection !== seriesRow.collection) {
    return {
      status: 'collection-mismatch',
      sanityId: prepared.sanityId,
      existingCollection: existing.collection,
      resolvedCollection: seriesRow.collection,
    };
  }

  const c = prepared.candidateValues;
  const contentCheck = somaticCardContentSchema.safeParse({
    sanityId: c.sanityId,
    cardNumber: c.cardNumber,
    title: c.title,
    slug: c.slug,
    seriesId: seriesRow.id,
    collection: seriesRow.collection,
    status: c.status,
    sortOrder: c.sortOrder,
    invitation: c.invitation ?? undefined,
    purpose: c.purpose ?? undefined,
    description: c.description ?? undefined,
    orientation: c.orientation ?? undefined,
    gentleNote: c.gentleNote ?? undefined,
    anchor: c.anchor ?? undefined,
    visualTreatment: c.visualTreatment ?? undefined,
    cardArtworkUrl: c.cardArtworkUrl ?? undefined,
    cardArtworkAlt: c.cardArtworkAlt ?? undefined,
    heroImageUrl: c.heroImageUrl ?? undefined,
    heroImageAlt: c.heroImageAlt ?? undefined,
    practiceSteps: c.practiceSteps,
    whatToNotice: c.whatToNotice,
    supportingImages: c.supportingImages,
    demonstrationSequence: c.demonstrationSequence,
  });

  if (!contentCheck.success) {
    return {
      status: 'invalid-content',
      sanityId: prepared.sanityId,
      issues: contentCheck.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`),
    };
  }

  const values = {
    sanityId: c.sanityId,
    cardNumber: c.cardNumber,
    title: c.title,
    slug: c.slug,
    seriesId: seriesRow.id,
    collection: seriesRow.collection,
    status: c.status,
    sortOrder: c.sortOrder,
    invitation: c.invitation,
    purpose: c.purpose,
    description: c.description,
    orientation: c.orientation,
    gentleNote: c.gentleNote,
    anchor: c.anchor,
    visualTreatment: c.visualTreatment,
    cardArtworkUrl: c.cardArtworkUrl,
    cardArtworkAlt: c.cardArtworkAlt,
    heroImageUrl: c.heroImageUrl,
    heroImageAlt: c.heroImageAlt,
    practiceSteps: c.practiceSteps,
    whatToNotice: c.whatToNotice,
    supportingImages: c.supportingImages,
    demonstrationSequence: c.demonstrationSequence,
    sanityData: c.sanityData,
    updatedAt: new Date(),
  };

  try {
    await db
      .insert(somaticCards)
      .values(values)
      .onConflictDoUpdate({ target: somaticCards.sanityId, set: values });
  } catch (err) {
    return {
      status: 'conflict',
      sanityId: prepared.sanityId,
      message: err instanceof Error ? err.message : 'Unique constraint violation',
    };
  }

  return { status: 'synced', action: 'upserted', sanityId: prepared.sanityId };
}
