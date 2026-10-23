import { isMembershipCheckoutConfigured } from '@tnsi/integrations';

/**
 * Whether Regulation Suite membership is open for purchase.
 *
 * Open ONLY when it has been deliberately launched
 * (`REGULATION_SUITE_MEMBERSHIP_OPEN=true`, exactly) AND billing is fully
 * configured (Stripe secret key, webhook secret, and both the monthly and
 * annual Price). Either half missing keeps it closed, so a half-configured
 * environment can never expose a checkout. The safe default - the variable
 * unset - is closed.
 *
 * Server-side only: every checkout decision goes through here and nothing a
 * client sends is consulted.
 */
export function isMembershipOpen(): boolean {
  return (
    process.env.REGULATION_SUITE_MEMBERSHIP_OPEN === 'true' && isMembershipCheckoutConfigured()
  );
}
