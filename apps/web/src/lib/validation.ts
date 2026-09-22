import { z } from '@tnsi/validation';
import { practiceContentTypeEnum, postPracticeResponseEnum } from '@tnsi/db/schema';
import { PURCHASABLE_TIERS } from '@tnsi/integrations';

export const practiceContentType = z.enum(practiceContentTypeEnum.enumValues);

export const checkInSchema = z.object({
  moodScore: z.number().int().min(1).max(5),
  capacityScore: z.number().int().min(1).max(5),
  notes: z.string().max(2000).optional(),
  completedAt: z.string().datetime().optional(),
});

export type CheckInInput = z.infer<typeof checkInSchema>;

/** Query params for GET /api/v1/check-ins, mirroring `articlesListQuerySchema`'s bounds. */
export const checkInsListQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(50).default(20),
  offset: z.coerce.number().int().min(0).default(0),
});

export type CheckInsListQuery = z.infer<typeof checkInsListQuerySchema>;

export const practiceCompletionSchema = z.object({
  progressPct: z.number().min(0).max(1).optional(),
  positionSeconds: z.number().int().min(0).optional(),
  completed: z.boolean().optional(),
  playCount: z.number().int().min(0).optional(),
});

export type PracticeCompletionInput = z.infer<typeof practiceCompletionSchema>;

export const practiceIdParam = z.object({
  id: z.string().uuid(),
});

export type PracticeIdParam = z.infer<typeof practiceIdParam>;

/** Query params for GET /api/v1/practices/history — same bounds/convention as checkInsListQuerySchema above. */
export const practiceHistoryListQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(50).default(20),
  offset: z.coerce.number().int().min(0).default(0),
});

export type PracticeHistoryListQuery = z.infer<typeof practiceHistoryListQuerySchema>;

/**
 * A post-practice reflection: `response`/`reflection` are both optional
 * and both nullable independently of each other - a member can pick a
 * response without writing anything, write something without picking a
 * response, or send neither (an explicit "clear my reflection" - see the
 * route's own handling). `response` is intentionally the exact enum
 * values from `postPracticeResponseEnum`, not free text, so an invalid
 * value is rejected rather than silently stored.
 *
 * `completionId` is required (not optional) - a reflection is now about
 * one specific practice session, not "this practice" in general (see
 * packages/db/src/schema/practice-reflections.ts's own comment on why).
 * The route itself still verifies the session belongs to the
 * authenticated user and the practice in the URL - this schema only
 * confirms it's a well-formed id.
 */
export const practiceReflectionSchema = z.object({
  completionId: z.string().uuid(),
  response: z.enum(postPracticeResponseEnum.enumValues).optional(),
  reflection: z.string().trim().max(2000).optional(),
});

export type PracticeReflectionInput = z.infer<typeof practiceReflectionSchema>;

export const contactFormSchema = z.object({
  name: z.string().trim().min(1).max(200),
  email: z.string().trim().email().max(320),
  organisation: z.string().trim().max(200).optional(),
  subject: z.string().trim().min(1).max(200),
  message: z.string().trim().min(1).max(5000),
});

export type ContactFormInput = z.infer<typeof contactFormSchema>;

/**
 * Shape-level validation for an assessment submission — confirms the
 * request is well-formed (a real slug, a valid email, answers keyed and
 * valued by plain non-empty strings). This narrows `answers` from the DB
 * column's `Record<string, unknown>` down to the `Record<string, string>`
 * shape packages/core's scoring engine expects — that boundary was
 * previously unvalidated (see the C9 hardening review). It does not know
 * whether the keys/values refer to real questions/choices for the named
 * assessment — that check needs the assessment's live Sanity definition
 * and is done by `prepareAssessmentSubmission` (@tnsi/core) instead.
 * `score`/`resultTier` are deliberately not accepted here at all: they are
 * always computed server-side, never trusted from the client.
 */
export const assessmentSubmissionSchema = z.object({
  assessmentSlug: z.string().trim().min(1).max(200),
  email: z.string().trim().email().max(320),
  answers: z.record(z.string().min(1).max(200), z.string().min(1).max(200)),
});

export type AssessmentSubmissionInput = z.infer<typeof assessmentSubmissionSchema>;

/**
 * The only thing a checkout request is allowed to specify: which of the
 * three already-configured, purchasable tiers to buy. There is no price,
 * product, or amount field here — the server resolves the real Stripe
 * Price id from `tier` alone (see `resolvePriceId` in
 * `@tnsi/integrations`), so a client can never influence what gets
 * charged beyond picking one of these three names.
 */
export const checkoutRequestSchema = z.object({
  tier: z.enum(PURCHASABLE_TIERS),
});

export type CheckoutRequestInput = z.infer<typeof checkoutRequestSchema>;

/**
 * Query params for GET /api/v1/articles. `category` is a Sanity `category`
 * document slug (not a title/label) — matches `ARTICLES_LIST_API_QUERY`'s
 * `category->slug.current` filter, so a filter value only ever narrows
 * against real category documents rather than an invented taxonomy.
 */
export const articlesListQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(50).default(20),
  offset: z.coerce.number().int().min(0).default(0),
  category: z.string().trim().min(1).max(200).optional(),
});

export type ArticlesListQuery = z.infer<typeof articlesListQuerySchema>;

/** Route param for GET /api/v1/articles/[slug]. */
export const articleSlugParamSchema = z.object({
  slug: z.string().trim().min(1).max(200),
});

/** Route param for GET /api/v1/assessments/[slug] — generic across every assessment slug, not just Capacity Assessment. */
export const assessmentSlugParamSchema = z.object({
  slug: z.string().trim().min(1).max(200),
});

/**
 * Query params for GET /api/v1/powerdrops. `category` matches
 * `POWER_DROPS_LIST_API_QUERY`'s plain `category` string field (the
 * controlled taxonomy values on `powerDrop` — see
 * packages/cms/src/schema/documents/powerDrop.ts), not a reference slug.
 * `featured` is a literal `"true"`/`"false"` string (query params are
 * always strings) rather than `z.coerce.boolean()`, which would treat any
 * non-empty string — including `"false"` — as `true`.
 */
export const powerDropsListQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(50).default(20),
  offset: z.coerce.number().int().min(0).default(0),
  category: z.string().trim().min(1).max(200).optional(),
  featured: z.enum(['true', 'false']).optional(),
});

export type PowerDropsListQuery = z.infer<typeof powerDropsListQuerySchema>;

/** Route param for GET/POST /api/v1/powerdrops/[slug]* — generic across every PowerDrop slug. */
export const powerDropSlugParamSchema = z.object({
  slug: z.string().trim().min(1).max(200),
});

/** Route param for GET /api/v1/somatic-cards/series/[seriesSlug]. */
export const somaticSeriesSlugParamSchema = z.object({
  seriesSlug: z.string().trim().min(1).max(200),
});

/** Route param for GET /api/v1/somatic-cards/[cardSlug]. */
export const somaticCardSlugParamSchema = z.object({
  cardSlug: z.string().trim().min(1).max(200),
});
