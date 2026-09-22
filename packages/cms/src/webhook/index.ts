// Server-only exports (uses node:crypto) — practice webhook sync.
// Import via '@tnsi/cms/webhook', never from the main '@tnsi/cms' barrel,
// which the client-side Sanity Studio config also imports.

export {
  PRACTICE_CONTENT_TYPES,
  sanityPracticeDocumentSchema,
  sanityPracticeWebhookSchema,
  type PracticeContentType,
  type SanityPracticeDocument,
  type SanityPracticeWebhookPayload,
} from './schema';
export { SANITY_WEBHOOK_SIGNATURE_HEADER, verifySanityWebhookSignature } from './verify';
export {
  buildPracticeSyncPlan,
  normalizeSanityId,
  type PracticeSyncPlan,
  type PracticeUpsertValues,
} from './sync-plan';

// Somatic Series/Card - a genuinely separate sync path from Practice's
// above, per docs/TNSI_Somatic_Card_Sync_v1.md. Nothing here shares a
// schema, plan type, or execution function with the Practice exports.
export {
  sanitySomaticSeriesDocumentSchema,
  sanitySomaticSeriesWebhookSchema,
  sanitySomaticCardDocumentSchema,
  sanitySomaticCardWebhookSchema,
  sanitySomaticWebhookSchema,
  type SanitySomaticSeriesDocument,
  type SanitySomaticSeriesWebhookPayload,
  type SanitySomaticCardDocument,
  type SanitySomaticCardWebhookPayload,
  type SanitySomaticWebhookPayload,
} from './schema-somatic';
export {
  buildSomaticSeriesSyncPlan,
  prepareSomaticCardSync,
  normalizeSomaticSanityId,
  type SomaticSeriesSyncPlan,
  type SomaticSeriesUpsertValues,
  type SomaticCardPrepared,
  type SomaticCardCandidateValues,
} from './sync-plan-somatic';
