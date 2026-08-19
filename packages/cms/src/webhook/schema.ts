import { z } from '@tnsi/validation';

/**
 * The exact same 6 values as `practice_content_type` in Postgres
 * (packages/db/src/schema/enums.ts) and the `practice` Sanity schema's
 * `contentType` options list (packages/cms/src/schema/documents/practice.ts).
 * Deliberately duplicated rather than imported from `@tnsi/db` — `packages/cms`
 * has no dependency on the database package (Sanity/Postgres stay
 * architecturally separate, per ARCHITECTURE.md), and this schema already
 * hardcodes the same list independently.
 */
export const PRACTICE_CONTENT_TYPES = [
  'audio',
  'video',
  'meditation',
  'breathwork',
  'movement',
  'journal',
] as const;

export type PracticeContentType = (typeof PRACTICE_CONTENT_TYPES)[number];

/**
 * Shape of the `document` field the Sanity webhook is configured to
 * project (see packages/cms/src/webhook/README in apps/web's webhook route
 * for the exact GROQ). A 1:1 mirror of the `practice` Sanity schema's
 * editable fields, plus `status` (published/draft).
 */
export const sanityPracticeDocumentSchema = z.object({
  title: z.string(),
  description: z.string().nullable().optional(),
  contentType: z.enum(PRACTICE_CONTENT_TYPES),
  mediaUrl: z.string().nullable().optional(),
  thumbnailUrl: z.string().nullable().optional(),
  durationSeconds: z.number().nullable().optional(),
  category: z.string().nullable().optional(),
  tags: z.array(z.string()).nullable().optional(),
  difficulty: z.number().nullable().optional(),
  status: z.enum(['published', 'draft']).nullable().optional(),
});

export type SanityPracticeDocument = z.infer<typeof sanityPracticeDocumentSchema>;

/**
 * The full webhook payload. `document` is present for create/update and
 * absent (or null) for delete — Sanity can't project fields off a document
 * that no longer exists.
 */
export const sanityPracticeWebhookSchema = z.object({
  _id: z.string().min(1),
  _type: z.literal('practice'),
  operation: z.enum(['create', 'update', 'delete']),
  document: sanityPracticeDocumentSchema.nullable().optional(),
});

export type SanityPracticeWebhookPayload = z.infer<typeof sanityPracticeWebhookSchema>;
