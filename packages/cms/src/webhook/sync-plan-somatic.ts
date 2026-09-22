import type {
  SanitySomaticCardDocument,
  SanitySomaticCardWebhookPayload,
  SanitySomaticSeriesWebhookPayload,
} from './schema-somatic';

const DRAFT_PREFIX = 'drafts.';

/**
 * Deliberately a separate copy of `./sync-plan.ts`'s identical helper,
 * not a shared import - "prefer separate Somatic Card sync logic" per
 * this milestone's own instructions. `drafts.<id>` → `<id>`; `<id>`
 * stays `<id>`.
 */
export function normalizeSomaticSanityId(id: string): string {
  return id.startsWith(DRAFT_PREFIX) ? id.slice(DRAFT_PREFIX.length) : id;
}

function isSanityDraftId(id: string): boolean {
  return id.startsWith(DRAFT_PREFIX);
}

export interface SomaticSeriesUpsertValues {
  sanityId: string;
  seriesNumber: number;
  title: string;
  slug: string;
  collection: string;
  description: string | null;
  coreQuestion: string | null;
  visualTreatment: string | null;
  defaultLayout: string | null;
  status: 'draft' | 'published' | 'archived';
  sortOrder: number;
  sanityData: Record<string, unknown>;
}

export type SomaticSeriesSyncPlan =
  | { action: 'upsert'; sanityId: string; values: SomaticSeriesUpsertValues }
  /** A Sanity delete event (or any event with no `document` payload) - archive the existing row if one exists; a no-op if it doesn't. Never an insert, since there's no content to insert. */
  | { action: 'archive'; sanityId: string }
  /** Sanity's own draft state - never synced as the current read-model document, regardless of the document's own `status` field. See docs/TNSI_Somatic_Card_Sync_v1.md §5. */
  | { action: 'skip'; sanityId: string; reason: 'sanity-draft' };

/**
 * Decides what a Sanity `somaticSeries` webhook event should do to
 * Postgres - pure and deterministic, no database access, mirroring
 * `./sync-plan.ts`'s `buildPracticeSyncPlan` shape but with genuinely
 * different semantics: Series/Card have a real 3-state editorial
 * `status` (draft/published/archived) that Sanity's own publish state
 * must never silently overwrite (unlike Practice, which collapses
 * everything non-published into one boolean).
 *
 * Defensive by design, same reasoning as Practice's sync-plan: even
 * though the webhook should be configured with a draft-exclusion filter
 * (matching the Practice webhook's own `!(_id in path("drafts.**"))`
 * convention), this checks `event._id`'s own `drafts.` prefix directly
 * rather than trusting the filter was configured correctly.
 */
export function buildSomaticSeriesSyncPlan(
  event: SanitySomaticSeriesWebhookPayload,
): SomaticSeriesSyncPlan {
  const sanityId = normalizeSomaticSanityId(event._id);

  if (isSanityDraftId(event._id)) {
    return { action: 'skip', sanityId, reason: 'sanity-draft' };
  }

  if (event.operation === 'delete' || !event.document) {
    return { action: 'archive', sanityId };
  }

  const doc = event.document;
  return {
    action: 'upsert',
    sanityId,
    values: {
      sanityId,
      seriesNumber: doc.seriesNumber,
      title: doc.title,
      slug: doc.slug,
      collection: doc.collection,
      description: doc.description ?? null,
      coreQuestion: doc.coreQuestion ?? null,
      visualTreatment: doc.visualTreatment ?? null,
      defaultLayout: doc.defaultLayout ?? null,
      status: doc.status ?? 'draft',
      sortOrder: doc.sortOrder ?? 0,
      sanityData: doc,
    },
  };
}

export interface SomaticCardCandidateValues {
  sanityId: string;
  cardNumber: number;
  title: string;
  slug: string;
  status: 'draft' | 'published' | 'archived';
  sortOrder: number;
  invitation: string | null;
  purpose: string | null;
  description: string | null;
  orientation: string | null;
  gentleNote: string | null;
  anchor: string | null;
  visualTreatment: string | null;
  cardArtworkUrl: string | null;
  cardArtworkAlt: string | null;
  heroImageUrl: string | null;
  heroImageAlt: string | null;
  practiceSteps: SanitySomaticCardDocument['practiceSteps'];
  whatToNotice: SanitySomaticCardDocument['whatToNotice'];
  supportingImages: SanitySomaticCardDocument['supportingImages'];
  demonstrationSequence: SanitySomaticCardDocument['demonstrationSequence'];
  sanityData: Record<string, unknown>;
}

export type SomaticCardPrepared =
  | {
      action: 'needs-series-resolution';
      sanityId: string;
      /** The Card's `series` reference's Sanity `_id`, already resolved by the webhook's own GROQ projection (`series->_id`) - not something this function looks up itself, since it's pure/no I/O. */
      seriesSanityId: string;
      candidateValues: SomaticCardCandidateValues;
    }
  | { action: 'archive'; sanityId: string }
  | { action: 'skip'; sanityId: string; reason: 'sanity-draft' };

/**
 * The pure half of Card sync: validates and extracts everything
 * available from the webhook payload alone, without touching the
 * database. Unlike Series sync, Card sync can never be fully pure - it
 * must resolve the referenced Series against Postgres to get a stable
 * internal `seriesId` and to verify collection consistency (see
 * `apps/web/src/lib/sync-somatic.ts`, which calls this function and
 * then performs the actual database resolution/write). This function
 * only prepares the parts that don't require I/O.
 */
export function prepareSomaticCardSync(
  event: SanitySomaticCardWebhookPayload,
): SomaticCardPrepared {
  const sanityId = normalizeSomaticSanityId(event._id);

  if (isSanityDraftId(event._id)) {
    return { action: 'skip', sanityId, reason: 'sanity-draft' };
  }

  if (event.operation === 'delete' || !event.document) {
    return { action: 'archive', sanityId };
  }

  const doc = event.document;
  return {
    action: 'needs-series-resolution',
    sanityId,
    seriesSanityId: normalizeSomaticSanityId(doc.seriesId),
    candidateValues: {
      sanityId,
      cardNumber: doc.cardNumber,
      title: doc.title,
      slug: doc.slug,
      status: doc.status ?? 'draft',
      sortOrder: doc.sortOrder ?? 0,
      invitation: doc.invitation ?? null,
      purpose: doc.purpose ?? null,
      description: doc.description ?? null,
      orientation: doc.orientation ?? null,
      gentleNote: doc.gentleNote ?? null,
      anchor: doc.anchor ?? null,
      visualTreatment: doc.visualTreatment ?? null,
      cardArtworkUrl: doc.cardArtworkUrl ?? null,
      cardArtworkAlt: doc.cardArtworkAlt ?? null,
      heroImageUrl: doc.heroImageUrl ?? null,
      heroImageAlt: doc.heroImageAlt ?? null,
      practiceSteps: doc.practiceSteps ?? [],
      whatToNotice: doc.whatToNotice ?? [],
      supportingImages: doc.supportingImages ?? [],
      demonstrationSequence: doc.demonstrationSequence ?? [],
      sanityData: doc,
    },
  };
}
