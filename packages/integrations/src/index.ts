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
export { verifyStripeWebhookEvent, StripeWebhookVerificationError } from './stripe/verify';
export {
  planForCheckoutSessionCompleted,
  planForSubscriptionEvent,
  planForInvoicePaymentFailed,
  type EntitlementSyncPlan,
  type SubscriptionSyncValues,
  type CheckoutSessionCompletedInput,
  type SubscriptionEventInput,
  type InvoicePaymentFailedInput,
} from './stripe/sync-plan';
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
