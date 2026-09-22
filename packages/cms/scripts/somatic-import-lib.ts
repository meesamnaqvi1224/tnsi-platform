/**
 * Pure logic for the Somatic Core Series bulk importer
 * (`import-somatic-core-series.ts`) - manifest validation and stable
 * document ID derivation. Split into its own module (no network/fs
 * side effects) specifically so it can be unit-tested without
 * accidentally triggering the importer's `main()` Sanity calls.
 */

export interface ManifestPracticeStep {
  order: number;
  label?: string | null;
  instruction: string;
}
export interface ManifestNoticeItem {
  order: number;
  text: string;
}
export interface ManifestCard {
  cardNumber: number;
  seriesNumber: number;
  title: string;
  slug: string;
  sortOrder: number;
  artworkSource: string;
  invitation: string | null;
  purpose: string | null;
  description: string | null;
  orientation: string | null;
  practiceSteps: ManifestPracticeStep[];
  whatToNotice: ManifestNoticeItem[];
  gentleNote: string | null;
  anchor: string | null;
  visualTreatment: string | null;
  heroImageSource: string | null;
  supportingImages: unknown[];
  demonstrationSequence: unknown[];
  sourceReference: string;
  needsReview: boolean;
  reviewNote: string | null;
}
export interface ManifestSeries {
  seriesNumber: number;
  title: string;
  coreQuestion: string;
}
export interface Manifest {
  collection: string;
  series: ManifestSeries[];
  cards: ManifestCard[];
  excludedSource: { artworkSource: string; title: string; reason: string }[];
}

/**
 * Structural validation against the approved Sanity schema's required
 * fields - never repairs or invents content, only reports problems.
 */
export function validateManifest(m: Manifest): string[] {
  const errors: string[] = [];
  if (m.collection !== 'core-series')
    errors.push(`collection must be "core-series", got "${m.collection}"`);
  const seenCardNumbers = new Set<number>();
  const seenSlugs = new Set<string>();
  for (const c of m.cards) {
    if (!c.title?.trim()) errors.push(`card ${c.cardNumber}: missing title`);
    if (!c.slug?.trim()) errors.push(`card ${c.cardNumber}: missing slug`);
    if (seenCardNumbers.has(c.cardNumber)) errors.push(`duplicate cardNumber ${c.cardNumber}`);
    seenCardNumbers.add(c.cardNumber);
    if (seenSlugs.has(c.slug)) errors.push(`duplicate slug ${c.slug}`);
    seenSlugs.add(c.slug);
    if (!m.series.some((s) => s.seriesNumber === c.seriesNumber)) {
      errors.push(`card ${c.cardNumber}: no matching series ${c.seriesNumber} in manifest`);
    }
    for (const step of c.practiceSteps) {
      if (!step.instruction?.trim())
        errors.push(`card ${c.cardNumber}: practice step ${step.order} missing instruction`);
    }
    for (const item of c.whatToNotice) {
      if (!item.text?.trim())
        errors.push(`card ${c.cardNumber}: whatToNotice item ${item.order} missing text`);
    }
  }
  return errors;
}

/** Stable, idempotent Series document ID - re-running the importer reconciles the same document rather than creating a duplicate. */
export function seriesDocId(seriesNumber: number): string {
  return `somaticSeries.core-series-${String(seriesNumber).padStart(2, '0')}`;
}

/** Stable, idempotent Card document ID. */
export function cardDocId(seriesNumber: number, cardNumber: number): string {
  return `somaticCard.core-series-${String(seriesNumber).padStart(2, '0')}.card-${String(cardNumber).padStart(2, '0')}`;
}
