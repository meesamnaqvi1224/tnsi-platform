import { pgEnum } from 'drizzle-orm/pg-core';

export const entitlementTierEnum = pgEnum('entitlement_tier', [
  'free',
  'monthly',
  'annual',
  'lifetime',
]);

export const entitlementStatusEnum = pgEnum('entitlement_status', [
  'active',
  'past_due',
  'canceled',
  'trialing',
  'expired',
]);

export const practiceContentTypeEnum = pgEnum('practice_content_type', [
  'audio',
  'video',
  'meditation',
  'breathwork',
  'movement',
  'journal',
]);

/**
 * A member's optional, purely self-reported answer to "how do you feel
 * after that practice?" - never a score, never a diagnosis, never
 * interpreted. Uppercase (unlike this file's other enums) to match the
 * naming convention `packages/core/src/practices/recommendation.ts`
 * already established for this same "self-reported daily-experience
 * state" domain (`CapacityState`'s `LOW`/`MODERATE`/etc.) - not a general
 * house style, just the closest existing precedent for this specific kind
 * of value.
 */
export const postPracticeResponseEnum = pgEnum('post_practice_response', [
  'DIFFERENT',
  'SAME',
  'NOT_SURE',
]);

/**
 * Somatic Series/Card editorial lifecycle - distinct from `practices`'
 * `isPublished` boolean on purpose. That boolean only ever needed to
 * answer "show this or not," and stays a boolean because unpublishing a
 * Practice risks orphaning `practice_completions` rows (see
 * `practice-completions.ts`'s FK comment) - there's no such record to
 * protect for a Somatic Card, so there's no structural reason to
 * compress Sanity's real draft/published/archived authoring state down
 * to two values here the way Practice's sync does.
 */
export const somaticPublicationStatusEnum = pgEnum('somatic_publication_status', [
  'draft',
  'published',
  'archived',
]);
