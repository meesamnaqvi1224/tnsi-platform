export const VERSION = '0.0.0';

export {
  upsertFlowiContact,
  FlowiConfigError,
  FlowiRequestError,
  type FlowiUpsertContactInput,
  type FlowiUpsertContactResult,
} from './flowi';

export { getStripeConfig, StripeConfigError, type StripeConfig } from './stripe/config';
export { getStripeClient, isStripeConfigured } from './stripe/client';
export {
  ENTITLEMENT_TIERS,
  PURCHASABLE_TIERS,
  ENTITLEMENT_STATUSES,
  isPurchasableTier,
  checkoutModeForTier,
  resolvePriceId,
  mapPriceIdToTier,
  mapStripeSubscriptionStatus,
  type EntitlementTier,
  type PurchasableTier,
  type EntitlementStatus,
} from './stripe/tier-mapping';
