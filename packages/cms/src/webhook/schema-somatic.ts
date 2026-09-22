import { z } from '@tnsi/validation';
import {
  somaticPublicationStatusSchema,
  somaticVisualTreatmentSchema,
  somaticPracticeStepsSchema,
  somaticWhatToNoticeSchema,
  somaticSupportingImagesSchema,
  somaticDemonstrationSequenceSchema,
  somaticSeriesNumberSchema,
  somaticCardNumberSchema,
  somaticSlugSchema,
  somaticCollectionSchema,
  somaticSortOrderSchema,
} from '@tnsi/validation';

/**
 * Somatic Series/Card webhook payload shapes - genuinely separate from
 * `./schema.ts`'s Practice webhook schemas, per
 * docs/TNSI_PowerDrops_Somatic_Cards_Relationship_Audit.md and
 * docs/TNSI_Somatic_Card_Schema_Design_v1.md ("Somatic Cards are a
 * separate domain"). Nothing here is imported from or shared with the
 * Practice webhook schemas, on purpose - this file, not `./schema.ts`,
 * is the one that changes if the Somatic Card shape ever changes.
 *
 * Unlike the Practice webhook schema (which hardcodes its enum list
 * independently, since `packages/cms` has no dependency on `@tnsi/db`),
 * the array/enum shapes here are imported from `@tnsi/validation`
 * directly - `packages/cms` already depends on that package, and
 * duplicating `somaticPracticeStepsSchema` etc. here would create a
 * second copy of validation logic to keep in sync for no benefit.
 */

/**
 * Shape of the `document` field for a `somaticSeries` webhook event -
 * see apps/web/src/app/api/webhooks/sanity-somatic/README.md for the
 * exact GROQ projection this expects.
 */
export const sanitySomaticSeriesDocumentSchema = z.object({
  seriesNumber: somaticSeriesNumberSchema,
  title: z.string().min(1),
  slug: somaticSlugSchema,
  collection: somaticCollectionSchema,
  description: z.string().nullable().optional(),
  coreQuestion: z.string().nullable().optional(),
  visualTreatment: somaticVisualTreatmentSchema.nullable().optional(),
  defaultLayout: z.string().nullable().optional(),
  status: somaticPublicationStatusSchema.nullable().optional(),
  sortOrder: somaticSortOrderSchema.nullable().optional(),
});

export type SanitySomaticSeriesDocument = z.infer<typeof sanitySomaticSeriesDocumentSchema>;

export const sanitySomaticSeriesWebhookSchema = z.object({
  _id: z.string().min(1),
  _type: z.literal('somaticSeries'),
  operation: z.enum(['create', 'update', 'delete']),
  document: sanitySomaticSeriesDocumentSchema.nullable().optional(),
});

export type SanitySomaticSeriesWebhookPayload = z.infer<typeof sanitySomaticSeriesWebhookSchema>;

/**
 * Shape of the `document` field for a `somaticCard` webhook event.
 * `seriesId`/`seriesCollection` are the Card's `series` reference,
 * resolved by the GROQ projection itself (`series->_id`,
 * `series->collection`) - the webhook payload never needs to duplicate
 * the referenced Series' full content, only enough to resolve and
 * verify it. `imageAlt` fields are intentionally NOT required at this
 * layer (the raw Sanity shape may legitimately have a URL with no alt
 * yet, mid-authoring) - the alt-required rule is enforced later, once,
 * via `somaticCardContentSchema` (`@tnsi/validation`) immediately before
 * persistence, not duplicated here.
 */
export const sanitySomaticCardDocumentSchema = z.object({
  cardNumber: somaticCardNumberSchema,
  title: z.string().min(1),
  slug: somaticSlugSchema,
  seriesId: z.string().min(1),
  seriesCollection: somaticCollectionSchema,
  status: somaticPublicationStatusSchema.nullable().optional(),
  sortOrder: somaticSortOrderSchema.nullable().optional(),
  invitation: z.string().nullable().optional(),
  purpose: z.string().nullable().optional(),
  description: z.string().nullable().optional(),
  orientation: z.string().nullable().optional(),
  gentleNote: z.string().nullable().optional(),
  anchor: z.string().nullable().optional(),
  visualTreatment: somaticVisualTreatmentSchema.nullable().optional(),
  cardArtworkUrl: z.string().nullable().optional(),
  cardArtworkAlt: z.string().nullable().optional(),
  heroImageUrl: z.string().nullable().optional(),
  heroImageAlt: z.string().nullable().optional(),
  practiceSteps: somaticPracticeStepsSchema.nullable().optional(),
  whatToNotice: somaticWhatToNoticeSchema.nullable().optional(),
  supportingImages: somaticSupportingImagesSchema.nullable().optional(),
  demonstrationSequence: somaticDemonstrationSequenceSchema.nullable().optional(),
});

export type SanitySomaticCardDocument = z.infer<typeof sanitySomaticCardDocumentSchema>;

export const sanitySomaticCardWebhookSchema = z.object({
  _id: z.string().min(1),
  _type: z.literal('somaticCard'),
  operation: z.enum(['create', 'update', 'delete']),
  document: sanitySomaticCardDocumentSchema.nullable().optional(),
});

export type SanitySomaticCardWebhookPayload = z.infer<typeof sanitySomaticCardWebhookSchema>;

/**
 * The full webhook payload accepted by the Somatic sync endpoint - a
 * discriminated union on `_type`, so any document type other than
 * `somaticSeries`/`somaticCard` (a `practice`, `powerDrop`, `article`,
 * etc. payload delivered here by mistake) fails parsing outright rather
 * than being silently routed anywhere. This is the same "reject anything
 * not explicitly matched" behavior the existing Practice webhook already
 * has via its own `_type: z.literal('practice')` - just extended to two
 * literals instead of one.
 */
export const sanitySomaticWebhookSchema = z.discriminatedUnion('_type', [
  sanitySomaticSeriesWebhookSchema,
  sanitySomaticCardWebhookSchema,
]);

export type SanitySomaticWebhookPayload = z.infer<typeof sanitySomaticWebhookSchema>;
