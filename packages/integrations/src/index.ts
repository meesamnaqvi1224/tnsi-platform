export const VERSION = '0.0.0';

export {
  upsertFlowiContact,
  buildUpsertBody,
  classifyFlowiFailure,
  addFlowiContactTags,
  FLOWI_DEFAULT_TIMEOUT_MS,
  type FlowiCallOptions,
  type FlowiFailureKind,
  type FlowiCustomFieldValue,
  FlowiConfigError,
  FlowiRequestError,
  type FlowiUpsertContactInput,
  type FlowiUpsertContactResult,
} from './flowi';

export {
  getStripeConfig,
  isMembershipCheckoutConfigured,
  isMembershipOpen,
  getPortalConfigurationId,
  StripeConfigError,
  type StripeConfig,
} from './stripe/config';
export {
  MEMBERSHIP_TRIAL_DAYS,
  MEMBERSHIP_PLANS,
  MEMBERSHIP_ANNUAL_SAVING_PERCENT,
  MEMBERSHIP_FREE_POWERDROPS,
  type MembershipPlanTier,
} from './stripe/plans';
export { getStripeClient, isStripeConfigured } from './stripe/client';
export { verifyStripeWebhookEvent, StripeWebhookVerificationError } from './stripe/verify';
export {
  planForCheckoutSessionCompleted,
  planForSubscriptionEvent,
  planForInvoicePaymentFailed,
  planForSubscriptionLifecycleEvent,
  type EntitlementSyncPlan,
  type SubscriptionSyncValues,
  type PaymentFailureUpdate,
  type CheckoutSessionCompletedInput,
  type SubscriptionEventInput,
  type InvoicePaymentFailedInput,
  type SubscriptionLifecycleEventInput,
} from './stripe/sync-plan';
export {
  createCheckoutSession,
  ensureStripeCustomer,
  MembershipClosedError,
  UnpurchasableTierError,
  type CreateCheckoutSessionInput,
} from './stripe/checkout';
export {
  classifyStripeFailure,
  describeStripeFailure,
  type StripeFailureKind,
} from './stripe/failure';
export {
  CHECKOUT_ABANDONED_SESSION_TTL_MINUTES,
  CHECKOUT_RECONCILIATION_LOOKBACK_MS,
} from './stripe/checkout-windows';
export {
  liveCheckoutSessionGateway,
  toCheckoutSessionInfo,
  type CheckoutSessionGateway,
  type CheckoutSessionInfo,
} from './stripe/checkout-sessions';
export { createBillingPortalSession, NoStripeCustomerError } from './stripe/portal';
export {
  ENTITLEMENT_TIERS,
  PURCHASABLE_TIERS,
  CHECKOUT_TIERS,
  ENTITLEMENT_STATUSES,
  isPurchasableTier,
  isCheckoutTier,
  checkoutModeForTier,
  resolvePriceId,
  mapPriceIdToTier,
  mapStripeSubscriptionStatus,
  type EntitlementTier,
  type PurchasableTier,
  type CheckoutTier,
  type EntitlementStatus,
} from './stripe/tier-mapping';
export { FLOWI_FIELD } from './flowi-fields';
