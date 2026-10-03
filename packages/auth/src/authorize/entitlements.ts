/**
 * Entitlement authorization — decides whether an entitlement record
 * satisfies an access requirement. Pure and synchronous: no database,
 * network, or Clerk calls. Fetching the entitlement record (Clerk session
 * -> DB user -> DB entitlement row) is the caller's job — see
 * `requireEntitlement` in apps/web/src/lib/auth-api.ts for the app-layer
 * wrapper that fetches the record and calls into this module.
 *
 * Scope is deliberately limited to what the approved C6.2 product model
 * requires: free access, programme access, certification access, and
 * feature access. This is not a general permissions/roles framework.
 */

import { EntitlementRequiredError } from '../errors/auth';

export type EntitlementStatus = 'active' | 'past_due' | 'canceled' | 'trialing' | 'expired';

/**
 * The subset of the `entitlements` DB row this module needs. Deliberately
 * structural rather than imported from `@tnsi/db` — this package has no
 * dependency on the database package, so the decision logic stays a pure
 * function of plain data and is unit-testable without any DB setup. The
 * real `Entitlement` row type (packages/db/src/schema/entitlements.ts)
 * satisfies this shape.
 */
export interface EntitlementRecord {
  status: EntitlementStatus;
  programs: string[];
  certifications: string[];
  features: string[];
  /**
   * When the first still-unresolved recurring payment failure happened
   * (`entitlements.payment_failed_at`). Only meaningful while `status` is
   * `past_due`: it anchors the grace period below. Optional so callers that
   * don't care about grace (and every pre-existing test fixture) are
   * unaffected — a `past_due` record without it is simply not in grace.
   */
  paymentFailedAt?: Date | null;
}

/**
 * Approved Regulation Suite™ commercial rule (Membership & Commercial
 * Model v1): after a failed recurring payment, membership access continues
 * for 7 days. Counted from the FIRST failure, not each retry — a repeated
 * failed retry must never restart the clock.
 */
export const PAYMENT_GRACE_PERIOD_DAYS = 7;

const MS_PER_DAY = 24 * 60 * 60 * 1000;

/** The instant a payment-failure grace period ends (access is NOT granted at this exact instant). */
export function graceEndsAt(paymentFailedAt: Date): Date {
  return new Date(paymentFailedAt.getTime() + PAYMENT_GRACE_PERIOD_DAYS * MS_PER_DAY);
}

/**
 * An access requirement a route/component can express.
 *
 * `free` means "no entitlement beyond authentication is required" — per
 * the approved product model, every authenticated user (any tier, any
 * status) satisfies it. The Member Dashboard and its free content/features
 * use this; it must never become paid-gated.
 *
 * No canonical programme, certification, or feature identifiers exist
 * anywhere in this repository yet (nothing populates or reads the
 * `programs`/`certifications`/`features` arrays outside of the empty
 * default). Identifiers are therefore supplied by the caller as plain
 * strings — do not hardcode guessed IDs here or at call sites. When C7 (or
 * later product work) establishes canonical IDs for a programme,
 * certification, or feature, callers must use those, not invented ones.
 */
export type EntitlementRequirement =
  | { type: 'free' }
  | { type: 'programme'; programId: string }
  | { type: 'certification'; certificationId: string }
  | { type: 'feature'; featureId: string };

export type AuthorizationDenialReason =
  | 'NO_ENTITLEMENT'
  | 'STATUS_NOT_ELIGIBLE'
  | 'PROGRAMME_NOT_ENTITLED'
  | 'CERTIFICATION_NOT_ENTITLED'
  | 'FEATURE_NOT_ENTITLED';

export interface AuthorizationResult {
  allowed: boolean;
  reason: AuthorizationDenialReason | null;
}

const ALLOW: AuthorizationResult = { allowed: true, reason: null };
function deny(reason: AuthorizationDenialReason): AuthorizationResult {
  return { allowed: false, reason };
}

/**
 * Entitlement statuses that grant access to protected (programme,
 * certification, feature) content, per the approved C6.2 product rule,
 * extended by the approved Regulation Suite™ payment-failure rule:
 *
 * - `active`, `trialing` — eligible.
 * - `expired` — not eligible.
 * - `past_due` — eligible ONLY during the 7-day grace period that starts at
 *   the first failed payment (`paymentFailedAt`). A `past_due` record with
 *   no recorded failure time is not in grace — fail closed rather than
 *   assuming one. Once the grace period has elapsed the record is treated
 *   exactly like any other ineligible status: the existing entitlement
 *   architecture applies unchanged.
 * - `canceled` — not eligible. A member who cancels keeps `active` status
 *   (Stripe cancel-at-period-end semantics, see `cancelAtPeriodEnd`) until
 *   the paid period actually ends; Stripe only reports `canceled` after
 *   that, so no period-end logic is needed here.
 */
function isInPaymentGrace(entitlement: EntitlementRecord, now: Date): boolean {
  if (entitlement.status !== 'past_due' || !entitlement.paymentFailedAt) return false;
  return now.getTime() < graceEndsAt(entitlement.paymentFailedAt).getTime();
}

function hasEligibleStatus(entitlement: EntitlementRecord, now: Date): boolean {
  if (entitlement.status === 'active' || entitlement.status === 'trialing') return true;
  return isInPaymentGrace(entitlement, now);
}

/**
 * Does this entitlement grant access to member content (Today, Practices,
 * Practice Detail, Saved Practices, Practice History, My Journey)?
 *
 * Deliberately NOT the same question `authorizeEntitlement`'s `free`
 * requirement answers above - `free` ignores status entirely by design
 * ("every authenticated user... satisfies it", see its own comment).
 * `hasMemberAccess` is a genuine, status-aware ACTIVE/INACTIVE gate: the
 * seam a future paid-membership requirement plugs into, per the
 * Membership & Entitlements v1 milestone. It reuses the exact same
 * active/trialing-eligible rule already established for
 * programme/certification/feature access above, rather than inventing a
 * second, different eligibility rule.
 *
 * `null` (no entitlement row at all) has no access - fails closed. In
 * practice this should be rare: a default `free`/`active` row is created
 * synchronously as part of Clerk's `user.created` sync
 * (`packages/auth/src/sync/user.ts`), so almost every authenticated user
 * already has one, and `active` is exactly the state `hasMemberAccess`
 * allows - which is precisely why wiring this in changes no *current*
 * user's access: everyone is `active` by default today, and nothing in
 * this codebase yet transitions a row away from that (Stripe sync exists
 * but is unconfigured/dormant - see packages/integrations/src/stripe).
 */
export function hasMemberAccess(
  entitlement: EntitlementRecord | null,
  now: Date = new Date(),
): boolean {
  if (!entitlement) return false;
  return hasEligibleStatus(entitlement, now);
}

/**
 * Throwing form of `hasMemberAccess`, mirroring `assertEntitlement`'s
 * shape below. Throws `EntitlementRequiredError` (403,
 * `ENTITLEMENT_REQUIRED`) when the user has no active/trialing
 * entitlement; returns normally when they do.
 */
export function assertMemberAccess(
  entitlement: EntitlementRecord | null,
  now: Date = new Date(),
): void {
  if (hasMemberAccess(entitlement, now)) return;

  throw new EntitlementRequiredError(
    ['member'],
    entitlement ? [entitlement.status] : [],
    'Member access required.',
    { reason: entitlement ? 'STATUS_NOT_ELIGIBLE' : 'NO_ENTITLEMENT' },
  );
}

/**
 * Decide whether `entitlement` satisfies `requirement`. Deterministic, no
 * I/O. Returns a reason on denial rather than throwing — callers decide
 * how to surface that (see `assertEntitlement` below for the throwing form
 * used by server code).
 *
 * `entitlement` is `null` when the user has no entitlement row at all
 * (shouldn't normally happen post-C5, since the Clerk webhook creates a
 * default free-tier row on `user.created` — callers may still pass `null`
 * defensively, e.g. before that row exists). `null` satisfies `free`
 * requirements and denies every programme/certification/feature
 * requirement.
 */
export function authorizeEntitlement(
  entitlement: EntitlementRecord | null,
  requirement: EntitlementRequirement,
  now: Date = new Date(),
): AuthorizationResult {
  if (requirement.type === 'free') {
    return ALLOW;
  }

  if (!entitlement) {
    return deny('NO_ENTITLEMENT');
  }

  if (!hasEligibleStatus(entitlement, now)) {
    return deny('STATUS_NOT_ELIGIBLE');
  }

  switch (requirement.type) {
    case 'programme':
      return entitlement.programs.includes(requirement.programId)
        ? ALLOW
        : deny('PROGRAMME_NOT_ENTITLED');
    case 'certification':
      return entitlement.certifications.includes(requirement.certificationId)
        ? ALLOW
        : deny('CERTIFICATION_NOT_ENTITLED');
    case 'feature':
      return entitlement.features.includes(requirement.featureId)
        ? ALLOW
        : deny('FEATURE_NOT_ENTITLED');
  }
}

/**
 * Throwing form of `authorizeEntitlement`, for server code that already
 * uses the throw-and-catch style established by `requireAuth()`
 * (apps/web/src/lib/auth-api.ts). Throws `EntitlementRequiredError` (403,
 * code `ENTITLEMENT_REQUIRED`) on denial; returns normally when allowed.
 *
 * Does not include the user's actual entitlement contents in the thrown
 * error — only the denial `reason` code — so a route handler can log or
 * inspect it without risk of leaking entitlement details in an HTTP
 * response built from the error.
 */
export function assertEntitlement(
  entitlement: EntitlementRecord | null,
  requirement: EntitlementRequirement,
  now: Date = new Date(),
): void {
  const result = authorizeEntitlement(entitlement, requirement, now);
  if (result.allowed) return;

  throw new EntitlementRequiredError(
    [requirement.type],
    [],
    'This content requires additional access.',
    { reason: result.reason },
  );
}

// ---------------------------------------------------------------------------
// Regulation Suite™ membership (Free + Paid) — Membership & Commercial Model v1
// ---------------------------------------------------------------------------

export type EntitlementTier = 'free' | 'monthly' | 'annual' | 'lifetime';

/** An entitlement record that also carries the billing tier — everything `resolveMembership` needs. */
export interface MembershipRecord extends EntitlementRecord {
  tier: EntitlementTier;
}

/**
 * Where a member stands, in the commercial model's own vocabulary:
 *
 * - `free` — a free account (no paid plan).
 * - `trialing` — inside the 30-day Stripe trial (paid access).
 * - `active` — paying member (paid access). `cancelsAtPeriodEnd` is set when
 *   they have cancelled: access still runs to the end of the paid period.
 * - `grace` — a recurring payment failed; inside the 7-day grace period
 *   (paid access continues).
 * - `inactive` — had a paid plan but is no longer eligible: cancelled and
 *   period ended, expired, or payment unresolved past the grace period.
 *   Falls under the existing entitlement architecture's ineligible rule
 *   (no member access).
 */
export type MembershipState = 'free' | 'trialing' | 'active' | 'grace' | 'inactive';

export interface ResolvedMembership {
  state: MembershipState;
  /** Full Regulation Suite™ library (all Practices and PowerDrops™). */
  hasPaidAccess: boolean;
  /** Grace period end, only while `state` is `grace`. */
  graceEndsAt: Date | null;
  /** True for a paying/trialing member who has cancelled and will not renew. */
  cancelsAtPeriodEnd: boolean;
}

/**
 * The single deterministic answer to "what membership does this user have
 * right now?" — a pure function of the entitlement record and `now`, so the
 * website, API routes and mobile app (via `/api/v1/me/entitlements`) can
 * never disagree about it. Never trusts client state.
 *
 * `null` (no entitlement row) resolves to `inactive`: no account state at
 * all fails closed, same as `hasMemberAccess(null)`.
 */
export function resolveMembership(
  record: (MembershipRecord & { cancelAtPeriodEnd?: boolean }) | null,
  now: Date = new Date(),
): ResolvedMembership {
  const inactive: ResolvedMembership = {
    state: 'inactive',
    hasPaidAccess: false,
    graceEndsAt: null,
    cancelsAtPeriodEnd: false,
  };

  if (!record || !hasMemberAccess(record, now)) return inactive;

  if (record.tier === 'free') {
    return { state: 'free', hasPaidAccess: false, graceEndsAt: null, cancelsAtPeriodEnd: false };
  }

  if (record.status === 'past_due') {
    // hasMemberAccess already proved we're inside grace, so paymentFailedAt is set.
    return {
      state: 'grace',
      hasPaidAccess: true,
      graceEndsAt: record.paymentFailedAt ? graceEndsAt(record.paymentFailedAt) : null,
      cancelsAtPeriodEnd: false,
    };
  }

  return {
    state: record.status === 'trialing' ? 'trialing' : 'active',
    hasPaidAccess: true,
    graceEndsAt: null,
    cancelsAtPeriodEnd: record.cancelAtPeriodEnd === true,
  };
}

/** Does this user currently hold a paid Regulation Suite™ membership (trialing, active, or in payment grace)? */
export function hasPaidAccess(
  record: (MembershipRecord & { cancelAtPeriodEnd?: boolean }) | null,
  now: Date = new Date(),
): boolean {
  return resolveMembership(record, now).hasPaidAccess;
}

/**
 * Can this user open a specific piece of Regulation Suite™ content
 * (a Practice or a PowerDrop™)?
 *
 * - No member access at all → never.
 * - `gatingActive` false → yes. Membership is not commercially open yet
 *   (see `isMembershipOpen` in the web app): nothing is locked, which is
 *   today's behaviour. Content must never be locked before the paid
 *   product can actually be bought.
 * - `gatingActive` true → free-designated content for everyone with member
 *   access; everything else only with paid access.
 */
export function canAccessContent(
  record: (MembershipRecord & { cancelAtPeriodEnd?: boolean }) | null,
  content: { isFree: boolean },
  gatingActive: boolean,
  now: Date = new Date(),
): boolean {
  if (!hasMemberAccess(record, now)) return false;
  if (!gatingActive) return true;
  return content.isFree || hasPaidAccess(record, now);
}
