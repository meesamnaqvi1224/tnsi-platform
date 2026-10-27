/**
 * Where a visitor is sent to start with Regulation Suite™ membership.
 *
 * Nothing here starts a trial or a payment. Both need an account, so the public
 * page sends a visitor to account creation and then straight to the membership
 * page (`/dashboard/billing`), where the server decides what is offered. Links
 * carry `redirect_url`; the sign-in and sign-up pages validate it against an
 * allow-list (`parseAuthRedirect`) before giving it to Clerk, and fall back to
 * `/dashboard` for anything else.
 */

export const MEMBERSHIP_PAGE_PATH = '/dashboard/billing';

/** The two plans a link can preselect. The membership page validates this again; it never trusts the query. */
export const PRESELECTABLE_PLANS = ['monthly', 'annual'] as const;
export type PreselectablePlan = (typeof PRESELECTABLE_PLANS)[number];

/** Narrows an untrusted query value to a plan, or `undefined`. */
export function parsePreselectedPlan(
  value: string | string[] | undefined,
): PreselectablePlan | undefined {
  return typeof value === 'string' && (PRESELECTABLE_PLANS as readonly string[]).includes(value)
    ? (value as PreselectablePlan)
    : undefined;
}

/** Account creation, then the membership page, optionally with a plan preselected (checkout is NOT started). */
export function signUpToMembershipHref(plan?: PreselectablePlan): string {
  const target = plan ? `${MEMBERSHIP_PAGE_PATH}?plan=${plan}` : MEMBERSHIP_PAGE_PATH;
  return `/sign-up?redirect_url=${encodeURIComponent(target)}`;
}
