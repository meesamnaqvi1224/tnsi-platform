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
