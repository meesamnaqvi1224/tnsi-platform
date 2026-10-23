import { isMembershipOpen } from '@tnsi/integrations';

/**
 * Whether Regulation Suite membership is open for purchase. The single
 * definition lives in `@tnsi/integrations` (`isMembershipOpen`): open only when
 * `REGULATION_SUITE_MEMBERSHIP_OPEN` is exactly "true" AND Stripe is fully
 * configured (secret key, webhook secret, monthly and annual Prices). The safe
 * default - the variable unset - is closed.
 *
 * Re-exported here so the web app has one import point for "is membership open?".
 */
export { isMembershipOpen };
