import { z } from 'zod';

/**
 * Shape validation for Somatic Series/Card content, applied before
 * persistence by whatever future code writes to `somatic_series`/
 * `somatic_cards` (the sync layer - not implemented in this milestone).
 * Genuinely separate from Practice/PowerDrop validation - no schema
 * here is shared with either.
 *
 * This package intentionally has no dependency on `@tnsi/db` (matching
 * the rest of this package's dependency-light role - only `apps/web`
 * currently imports both `@tnsi/validation` and `@tnsi/db/schema`
 * together to compose route-level validators). The enum values below
 * are kept as literal tuples, matching
 * `packages/db/src/schema/enums.ts`'s `somaticPublicationStatusEnum`
 * values exactly - if that enum changes, this file must be updated to
 * match; there is no single source of truth these are generated from.
 */

export const somaticPublicationStatusSchema = z.enum(['draft', 'published', 'archived']);
export type SomaticPublicationStatus = z.infer<typeof somaticPublicationStatusSchema>;

/**
 * Matches `somaticSeries.visualTreatment`/`somaticCard.visualTreatment`'s
 * Sanity `options.list` values exactly (see
 * `packages/cms/src/schema/documents/{somaticSeries,somaticCard}.ts`).
 * A plain constrained string, not a Postgres enum (see
 * docs/TNSI_Somatic_Card_Schema_Design_v1.md §7's "Visual Treatment"
 * discussion for why a hard DB enum was rejected as unnecessary
 * coupling) - this Zod schema is what actually constrains the value at
 * the application boundary instead.
 */
export const somaticVisualTreatmentSchema = z.enum([
  'singleHero',
  'heroWithSupportingImages',
  'movementSequence',
  'sensoryComparison',
  'custom',
]);
export type SomaticVisualTreatment = z.infer<typeof somaticVisualTreatmentSchema>;

/**
 * One Practice Step. `order` is explicit and required - never inferred
 * from array position alone, per the approved architecture's "ordering
 * should be explicit" principle. `label` is optional (not every step
 * needs a short title distinct from its instruction); `instruction` is
 * required (a step with no instruction text isn't a step).
 */
export const somaticPracticeStepSchema = z.object({
  order: z.number().int().min(0),
  label: z.string().trim().min(1).max(200).optional(),
  instruction: z.string().trim().min(1).max(2000),
});
export type SomaticPracticeStep = z.infer<typeof somaticPracticeStepSchema>;

/** Variable-length by design - no min/max item count imposed, per the architecture. */
export const somaticPracticeStepsSchema = z.array(somaticPracticeStepSchema);
export type SomaticPracticeSteps = z.infer<typeof somaticPracticeStepsSchema>;

/**
 * One "What to Notice" prompt - an ordered observation/prompt, never a
 * clinical taxonomy entry. No `label` field: the architecture describes
 * these as plain observations, not titled items.
 */
export const somaticWhatToNoticeItemSchema = z.object({
  order: z.number().int().min(0),
  text: z.string().trim().min(1).max(1000),
});
export type SomaticWhatToNoticeItem = z.infer<typeof somaticWhatToNoticeItemSchema>;

export const somaticWhatToNoticeSchema = z.array(somaticWhatToNoticeItemSchema);
export type SomaticWhatToNotice = z.infer<typeof somaticWhatToNoticeSchema>;

/**
 * One supporting image. `imageUrl` is the resolved Sanity CDN URL (the
 * same resolution step every other image field in this codebase goes
 * through via `urlForImage` - not implemented here, since that's a
 * sync-layer concern, out of scope for this milestone). `caption` is
 * optional per the architecture ("not every card has supporting
 * images" applies per-item too - a supporting image need not be
 * captioned).
 *
 * `imageAlt` is required (locked accessibility direction: meaningful
 * visual assets require alt text). Every image type currently modeled
 * in the Somatic Card architecture - artwork, hero, supporting,
 * demonstration - is meaningful content, not decoration, so nothing is
 * being exempted here; there is no genuinely decorative image type in
 * this schema today. If one is ever needed, it should get its own
 * explicit `isDecorative` field added consistently across the Sanity
 * schema, this Zod schema, and the Postgres columns together (a small,
 * well-scoped follow-up, not something to half-add to one layer only -
 * see docs/TNSI_Somatic_Card_Pre_Sync_Readiness.md §5).
 */
export const somaticSupportingImageSchema = z.object({
  order: z.number().int().min(0),
  imageUrl: z.string().trim().url(),
  imageAlt: z.string().trim().min(1).max(300),
  caption: z.string().trim().min(1).max(300).optional(),
});
export type SomaticSupportingImage = z.infer<typeof somaticSupportingImageSchema>;

/** Ordered; empty array means "no supporting images" - a normal, expected state, not an error. */
export const somaticSupportingImagesSchema = z.array(somaticSupportingImageSchema);
export type SomaticSupportingImages = z.infer<typeof somaticSupportingImagesSchema>;

/**
 * One demonstration-sequence frame. `label` and `instruction` are both
 * optional - the architecture explicitly allows zero, one, or many
 * frames, and a frame need not have either a title or written
 * instructions (the image itself may be sufficient for some movement
 * cards). `imageAlt` is required for the same reason given on
 * `somaticSupportingImageSchema` above - if anything, a wordless
 * movement frame needs its alt text more, not less, since the image is
 * carrying the entire meaning with no accompanying instruction text.
 */
export const somaticDemonstrationFrameSchema = z.object({
  order: z.number().int().min(0),
  imageUrl: z.string().trim().url(),
  imageAlt: z.string().trim().min(1).max(300),
  label: z.string().trim().min(1).max(200).optional(),
  instruction: z.string().trim().min(1).max(1000).optional(),
});
export type SomaticDemonstrationFrame = z.infer<typeof somaticDemonstrationFrameSchema>;

/** Ordered; empty array means "zero frames" - explicitly a valid state per the architecture, most cards outside Series 04 (Movement) will have none. */
export const somaticDemonstrationSequenceSchema = z.array(somaticDemonstrationFrameSchema);
export type SomaticDemonstrationSequence = z.infer<typeof somaticDemonstrationSequenceSchema>;

/**
 * Card number / series number: a positive integer, editorial identity
 * - never validated against a maximum, since new cards/series are
 * always being added.
 */
export const somaticCardNumberSchema = z.number().int().positive();
export const somaticSeriesNumberSchema = z.number().int().positive();

/**
 * Sort order: a non-negative integer. Zero is a valid, common default
 * (matches `sortOrder integer notNull default 0` on both Postgres
 * tables) - not required to be positive.
 */
export const somaticSortOrderSchema = z.number().int().min(0);

/** Matches the `slug`/`maxLength: 96` convention used by every slugged Sanity document in this codebase (see `powerDrop.ts`, `module.ts`). */
export const somaticSlugSchema = z
  .string()
  .trim()
  .min(1)
  .max(96)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Must be a lowercase, hyphenated slug');

/**
 * The collection identifier. Plain string, not an enum - the
 * architecture anticipates future collections beyond the one in use
 * today ("core-series"), so this validates shape (non-empty,
 * reasonable length, lowercase-hyphenated like a slug) rather than a
 * closed set of allowed values.
 */
export const somaticCollectionSchema = z
  .string()
  .trim()
  .min(1)
  .max(96)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Must be a lowercase, hyphenated identifier');

/**
 * Full shape validation for a Somatic Series row, as it would be
 * written by a future sync handler. Required fields mirror the
 * Postgres `NOT NULL` columns in `packages/db/src/schema/somatic-series.ts`
 * exactly; optional fields mirror its nullable columns.
 */
export const somaticSeriesContentSchema = z.object({
  sanityId: z.string().trim().min(1),
  seriesNumber: somaticSeriesNumberSchema,
  title: z.string().trim().min(1).max(200),
  slug: somaticSlugSchema,
  collection: somaticCollectionSchema,
  description: z.string().trim().min(1).optional(),
  coreQuestion: z.string().trim().min(1).max(500).optional(),
  visualTreatment: somaticVisualTreatmentSchema.optional(),
  defaultLayout: z.string().trim().min(1).max(200).optional(),
  status: somaticPublicationStatusSchema,
  sortOrder: somaticSortOrderSchema,
});
export type SomaticSeriesContent = z.infer<typeof somaticSeriesContentSchema>;

/**
 * Full shape validation for a Somatic Card row, as it would be written
 * by a future sync handler. Required fields mirror the Postgres
 * `NOT NULL` columns in `packages/db/src/schema/somatic-cards.ts`
 * exactly (title, seriesId, collection, status, sortOrder, and the four
 * jsonb arrays, which default to empty rather than being nullable);
 * every structured-content and visual-asset field is optional, matching
 * their nullable Postgres columns - a `draft` Card need not have every
 * field authored yet.
 */
const somaticCardContentShape = z.object({
  sanityId: z.string().trim().min(1),
  cardNumber: somaticCardNumberSchema,
  title: z.string().trim().min(1).max(200),
  slug: somaticSlugSchema,
  seriesId: z.string().uuid(),
  collection: somaticCollectionSchema,
  status: somaticPublicationStatusSchema,
  sortOrder: somaticSortOrderSchema,
  invitation: z.string().trim().min(1).optional(),
  purpose: z.string().trim().min(1).optional(),
  description: z.string().trim().min(1).optional(),
  orientation: z.string().trim().min(1).max(200).optional(),
  gentleNote: z.string().trim().min(1).optional(),
  anchor: z.string().trim().min(1).max(500).optional(),
  visualTreatment: somaticVisualTreatmentSchema.optional(),
  cardArtworkUrl: z.string().trim().url().optional(),
  cardArtworkAlt: z.string().trim().min(1).max(300).optional(),
  heroImageUrl: z.string().trim().url().optional(),
  heroImageAlt: z.string().trim().min(1).max(300).optional(),
  practiceSteps: somaticPracticeStepsSchema,
  whatToNotice: somaticWhatToNoticeSchema,
  supportingImages: somaticSupportingImagesSchema,
  demonstrationSequence: somaticDemonstrationSequenceSchema,
});

/**
 * `cardArtworkUrl`/`heroImageUrl` stay optional at the field level (not
 * every Card has a hero image - see the schema design doc), but whenever
 * one *is* present its alt text is required - locked accessibility
 * direction: meaningful visual assets require alt text, and both of
 * these are meaningful (never decorative) by definition in this
 * architecture, the same reasoning as `somaticSupportingImageSchema`/
 * `somaticDemonstrationFrameSchema` above. Expressed as `.superRefine`
 * rather than a plain per-field rule because the requirement genuinely
 * depends on a sibling field (the URL) being present, which a flat
 * per-field validator can't express.
 */
export const somaticCardContentSchema = somaticCardContentShape.superRefine((data, ctx) => {
  if (data.cardArtworkUrl && !data.cardArtworkAlt) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['cardArtworkAlt'],
      message: 'Alt text is required whenever card artwork is present.',
    });
  }
  if (data.heroImageUrl && !data.heroImageAlt) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['heroImageAlt'],
      message: 'Alt text is required whenever a hero image is present.',
    });
  }
});
export type SomaticCardContent = z.infer<typeof somaticCardContentSchema>;
