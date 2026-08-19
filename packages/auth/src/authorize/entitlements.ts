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
 * certification, feature) content, per the approved C6.2 product rule:
 *
 * - `active`, `trialing` — eligible (explicitly required by the rule).
 * - `expired` — not eligible (explicitly required by the rule).
 * - `past_due` — treated as NOT eligible. This is a deliberate fail-closed
 *   default, not a confirmed business rule: no product decision exists for
 *   whether a payment-retry window should retain access. Flagged as an
 *   open ambiguity in the C6.2 report rather than inventing grace-period
 *   behavior here.
 * - `canceled` — treated as NOT eligible. The schema carries
 *   `currentPeriodEnd`/`cancelAtPeriodEnd`, which in typical billing
 *   systems can mean a canceled subscription is still within a paid
 *   period — but nothing in this repository establishes when `status`
 *   actually transitions to `canceled` (immediately on cancellation vs.
 *   only once the paid period ends), because no Stripe webhook logic
 *   exists yet (C10 is deferred). Treating `canceled` as ineligible is the
 *   safe default until that lifecycle is actually defined; do not add
 *   period-end grace logic speculatively.
 */
const ELIGIBLE_STATUSES: ReadonlySet<EntitlementStatus> = new Set(['active', 'trialing']);

function hasEligibleStatus(entitlement: EntitlementRecord): boolean {
  return ELIGIBLE_STATUSES.has(entitlement.status);
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
): AuthorizationResult {
  if (requirement.type === 'free') {
    return ALLOW;
  }

  if (!entitlement) {
    return deny('NO_ENTITLEMENT');
  }

  if (!hasEligibleStatus(entitlement)) {
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
): void {
  const result = authorizeEntitlement(entitlement, requirement);
  if (result.allowed) return;

  throw new EntitlementRequiredError(
    [requirement.type],
    [],
    'This content requires additional access.',
    { reason: result.reason },
  );
}
