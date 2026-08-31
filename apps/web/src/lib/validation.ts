import { z } from '@tnsi/validation';
import { practiceContentTypeEnum } from '@tnsi/db/schema';
import { PURCHASABLE_TIERS } from '@tnsi/integrations';

export const practiceContentType = z.enum(practiceContentTypeEnum.enumValues);

export const checkInSchema = z.object({
  moodScore: z.number().int().min(1).max(5),
  capacityScore: z.number().int().min(1).max(5),
  notes: z.string().max(2000).optional(),
  completedAt: z.string().datetime().optional(),
});

export type CheckInInput = z.infer<typeof checkInSchema>;

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
