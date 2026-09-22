/**
 * Server-side mapping from `somatic_series`/`somatic_cards` Postgres rows
 * (synced by `sync-somatic.ts` — see docs/TNSI_Somatic_Card_Sync_v1.md) to
 * the stable JSON contract `/api/v1/somatic-cards*` returns. Same
 * dedicated-mapping-file pattern as `article-api.ts`/`power-drop-api.ts`,
 * except the raw input here is a Drizzle row, not a Sanity GROQ result —
 * this API reads Postgres only, never Sanity (see
 * docs/TNSI_Somatic_Card_Sync_v1.md's architecture diagram).
 *
 * Deliberately excludes `sanityId`/`sanityData` and any other sync-internal
 * column from every mapped shape below — those are sync/debugging
 * implementation detail, never part of the public contract.
 */
import type { SomaticSeries, SomaticCard } from '@tnsi/db/schema';
import {
  somaticPracticeStepsSchema,
  somaticWhatToNoticeSchema,
  somaticSupportingImagesSchema,
  somaticDemonstrationSequenceSchema,
  type SomaticPracticeSteps,
  type SomaticWhatToNotice,
  type SomaticSupportingImages,
  type SomaticDemonstrationSequence,
} from '@tnsi/validation';

export interface ApiSomaticImage {
  url: string;
  alt: string;
}

export interface ApiSomaticSeriesListItem {
  id: string;
  seriesNumber: number;
  title: string;
  slug: string;
  collection: string;
  description: string | null;
  coreQuestion: string | null;
  visualTreatment: string | null;
  defaultLayout: string | null;
  sortOrder: number;
}

export interface ApiSomaticCardSummary {
  id: string;
  cardNumber: number;
  title: string;
  slug: string;
  sortOrder: number;
  visualTreatment: string | null;
  cardArtwork: ApiSomaticImage | null;
}

export interface ApiSomaticSeriesDetail extends ApiSomaticSeriesListItem {
  cards: ApiSomaticCardSummary[];
}

export interface ApiSomaticCardSeriesRef {
  id: string;
  seriesNumber: number;
  title: string;
  slug: string;
  collection: string;
}

export interface ApiSomaticCardDetail {
  id: string;
  cardNumber: number;
  title: string;
  slug: string;
  sortOrder: number;
  series: ApiSomaticCardSeriesRef;
  invitation: string | null;
  purpose: string | null;
  description: string | null;
  orientation: string | null;
  gentleNote: string | null;
  anchor: string | null;
  visualTreatment: string | null;
  cardArtwork: ApiSomaticImage | null;
  heroImage: ApiSomaticImage | null;
  practiceSteps: SomaticPracticeSteps;
  whatToNotice: SomaticWhatToNotice;
  supportingImages: SomaticSupportingImages;
  demonstrationSequence: SomaticDemonstrationSequence;
}

function mapImage(url: string | null, alt: string | null): ApiSomaticImage | null {
  if (!url) return null;
  return { url, alt: alt ?? '' };
}

export function mapSomaticSeriesListItem(row: SomaticSeries): ApiSomaticSeriesListItem {
  return {
    id: row.id,
    seriesNumber: row.seriesNumber,
    title: row.title,
    slug: row.slug,
    collection: row.collection,
    description: row.description,
    coreQuestion: row.coreQuestion,
    visualTreatment: row.visualTreatment,
    defaultLayout: row.defaultLayout,
    sortOrder: row.sortOrder,
  };
}

export function mapSomaticCardSummary(row: SomaticCard): ApiSomaticCardSummary {
  return {
    id: row.id,
    cardNumber: row.cardNumber,
    title: row.title,
    slug: row.slug,
    sortOrder: row.sortOrder,
    visualTreatment: row.visualTreatment,
    cardArtwork: mapImage(row.cardArtworkUrl, row.cardArtworkAlt),
  };
}

export function mapSomaticSeriesDetail(
  series: SomaticSeries,
  cards: SomaticCard[],
): ApiSomaticSeriesDetail {
  return {
    ...mapSomaticSeriesListItem(series),
    cards: cards.map(mapSomaticCardSummary),
  };
}

/**
 * Parses a Card's four JSONB columns against `@tnsi/validation`'s own
 * shape schemas (the same ones the sync layer validates against before
 * writing — see `sync-somatic.ts`). Returns `null` on failure rather than
 * throwing or silently coercing: the sync layer is the thing responsible
 * for correctness at write time, so a shape failure here means Postgres
 * holds data this API's contract doesn't recognize — a genuine server-side
 * data-integrity problem the caller should surface as a 500, never repair
 * or partially render (see docs/TNSI_Somatic_Card_Read_API_v1.md §9).
 */
export function parseSomaticCardJsonbFields(row: SomaticCard): {
  practiceSteps: SomaticPracticeSteps;
  whatToNotice: SomaticWhatToNotice;
  supportingImages: SomaticSupportingImages;
  demonstrationSequence: SomaticDemonstrationSequence;
} | null {
  const practiceSteps = somaticPracticeStepsSchema.safeParse(row.practiceSteps);
  const whatToNotice = somaticWhatToNoticeSchema.safeParse(row.whatToNotice);
  const supportingImages = somaticSupportingImagesSchema.safeParse(row.supportingImages);
  const demonstrationSequence = somaticDemonstrationSequenceSchema.safeParse(
    row.demonstrationSequence,
  );

  if (
    !practiceSteps.success ||
    !whatToNotice.success ||
    !supportingImages.success ||
    !demonstrationSequence.success
  ) {
    return null;
  }

  return {
    practiceSteps: practiceSteps.data,
    whatToNotice: whatToNotice.data,
    supportingImages: supportingImages.data,
    demonstrationSequence: demonstrationSequence.data,
  };
}

export function mapSomaticCardDetail(
  card: SomaticCard,
  series: SomaticSeries,
  jsonbFields: NonNullable<ReturnType<typeof parseSomaticCardJsonbFields>>,
): ApiSomaticCardDetail {
  return {
    id: card.id,
    cardNumber: card.cardNumber,
    title: card.title,
    slug: card.slug,
    sortOrder: card.sortOrder,
    series: {
      id: series.id,
      seriesNumber: series.seriesNumber,
      title: series.title,
      slug: series.slug,
      collection: series.collection,
    },
    invitation: card.invitation,
    purpose: card.purpose,
    description: card.description,
    orientation: card.orientation,
    gentleNote: card.gentleNote,
    anchor: card.anchor,
    visualTreatment: card.visualTreatment,
    cardArtwork: mapImage(card.cardArtworkUrl, card.cardArtworkAlt),
    heroImage: mapImage(card.heroImageUrl, card.heroImageAlt),
    ...jsonbFields,
  };
}
