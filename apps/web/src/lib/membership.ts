import { isMembershipCheckoutConfigured } from '@tnsi/integrations';
import {
  canAccessContent,
  resolveMembership,
  type MembershipRecord,
  type ResolvedMembership,
} from '@tnsi/auth/authorize/entitlements';

/**
 * Regulation Suite™ free + paid membership — the web app's single place to
 * ask "is membership open?" and "may this member open this content?".
 * Every API route, Server Component and the mobile-facing entitlements
 * endpoint goes through here, so the answer cannot differ between website
 * and app. All decisions are server-side, from the entitlement row; nothing
 * a client sends is ever consulted.
 */

/**
 * Membership is OPEN only when it has been deliberately launched
 * (`REGULATION_SUITE_MEMBERSHIP_OPEN=true`) AND billing is genuinely
 * configured (Stripe key, webhook secret, and both plan Prices — see
 * `isMembershipCheckoutConfigured`).
 *
 * While closed (today's state) the website keeps its "not yet open for
 * enrolment" behaviour, no checkout is offered, and NO content is locked —
 * nothing may be locked before the paid product can actually be bought.
 * Missing either half keeps it closed, so a half-configured environment can
 * never expose a broken checkout or lock members out of content.
 */
export function isMembershipOpen(): boolean {
  return (
    process.env.REGULATION_SUITE_MEMBERSHIP_OPEN === 'true' && isMembershipCheckoutConfigured()
  );
}

/** The slice of an entitlement row membership resolution needs (the real DB `Entitlement` row satisfies this). */
export type MembershipEntitlement = (MembershipRecord & { cancelAtPeriodEnd?: boolean }) | null;

export interface ContentAccess {
  /** Whether free/paid locking is in force at all (membership is open). */
  gatingActive: boolean;
  membership: ResolvedMembership;
  /** May this member open a piece of content that is (`isFree`) or isn't part of the free selection? */
  canOpen(content: { isFree: boolean }): boolean;
}

/**
 * Resolves what a member may open. `gatingActive` defaults to the live
 * `isMembershipOpen()`; tests (and callers that already know) can pass it.
 */
export function contentAccessFor(
  entitlement: MembershipEntitlement,
  options: { gatingActive?: boolean; now?: Date } = {},
): ContentAccess {
  const gatingActive = options.gatingActive ?? isMembershipOpen();
  const now = options.now ?? new Date();
  return {
    gatingActive,
    membership: resolveMembership(entitlement, now),
    canOpen: (content) => canAccessContent(entitlement, content, gatingActive, now),
  };
}

/**
 * Practice fields that carry the paid content itself. For a practice the
 * member cannot open, these are withheld by the server (not hidden by the
 * client): the media file location and the raw CMS document, which also
 * contains it. Title, description, thumbnail, duration and category stay,
 * so the library can still show what is available with membership.
 */
export function withPracticeAccess<
  T extends { isFree: boolean; mediaUrl: string | null; sanityData?: unknown },
>(row: T, access: ContentAccess): T & { locked: boolean } {
  if (access.canOpen(row)) return { ...row, locked: false };
  const redacted: T & { locked: boolean } = { ...row, mediaUrl: null, locked: true };
  if ('sanityData' in redacted) redacted.sanityData = {};
  return redacted;
}
