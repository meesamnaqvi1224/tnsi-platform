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
  /**
   * The membership tier, when the caller has it. Optional because
   * `authorizeEntitlement`'s programme/certification/feature checks have always
   * worked from status alone; the paid-through date rules below apply only
   * when this is a Stripe-backed tier (`monthly` / `annual`), so a record
   * without a tier behaves exactly as it did before.
   */
  tier?: EntitlementTier;
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
  /**
   * The end of the period the member has paid for (`entitlements.current_period_end`,
   * Stripe's `current_period_end`). Paid access to a Stripe-backed tier runs to
   * this instant - not to whenever a webhook happens to arrive.
   */
  currentPeriodEnd?: Date | null;
  /**
   * The Stripe subscription backing this membership, when there is one. Its
   * presence is what makes the paid-through date rules (and Stripe
   * reconciliation) apply; a membership granted by hand, with no subscription,
   * is never refreshed from Stripe.
   */
  stripeSubscriptionId?: string | null;
  /**
   * The app-managed free trial window (`entitlements.trial_started_at` /
   * `trial_ends_at`). Both null/undefined until a trial is claimed. Only a Free
   * account's trial grants access; see `resolveMembership`.
   */
  trialStartedAt?: Date | null;
  trialEndsAt?: Date | null;
  /**
   * Set by the code that loads the record, never stored: it tried to refresh
   * this Stripe-backed membership from Stripe and Stripe was genuinely
   * unavailable (a connection failure, a Stripe-side error or throttling - not
   * any other kind of failure). Only then may an unconfirmed renewal be held
   * (see `renewalUnconfirmedUntil`); absent means "no attempt was made", and
   * an unconfirmed renewal is then not granted.
   */
  stripeUnreachable?: boolean;
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

/** A usable instant: a real `Date` whose time is a finite number. Anything else is "missing". */
function validDate(value: Date | null | undefined): Date | null {
  return value instanceof Date && Number.isFinite(value.getTime()) ? value : null;
}

/**
 * Stripe-backed tiers - the ones whose paid access is bounded by a paid-through
 * date. `lifetime` is deliberately excluded: a legacy Lifetime membership has no
 * period and is never cut off by a date; `free` has nothing paid.
 */
function isStripeBackedTier(tier: EntitlementTier | undefined): boolean {
  return tier === 'monthly' || tier === 'annual';
}

/**
 * Who decides when the renewal state of a Stripe-backed membership is uncertain
 * (the row says `active` but its paid period has already ended - a renewal that
 * has not been recorded yet, or a webhook that has not arrived).
 *
 * Options considered, and why the third is used:
 *  1. Cut access at the period end. Simple, but a paying member whose renewal
 *     webhook is merely delayed is locked out of something they paid for.
 *  2. Add a fixed buffer after the period end (e.g. 48 hours). Rejected: it is an
 *     arbitrary number nobody approved, and it extends access for members who
 *     really have lapsed even when Stripe could simply be asked.
 *  3. Ask Stripe (the source of truth) before deciding. The caller refreshes the
 *     row first (`needsStripeReconciliation`). When Stripe ANSWERS, its answer
 *     decides immediately - no extension of any kind. Only when Stripe CANNOT be
 *     reached (`stripeUnreachable`) is access held, and then only for the
 *     owner-approved 7-day payment grace, counted from the period end: an
 *     unconfirmed renewal can never leave a member worse off than a confirmed
 *     failed payment, and access can never be open-ended.
 */
export function renewalUnconfirmedUntil(currentPeriodEnd: Date): Date {
  return graceEndsAt(currentPeriodEnd);
}

export interface ResolveOptions {
  /**
   * The caller tried to refresh this row from Stripe and could not reach it.
   * Leave unset when no refresh was attempted - an unconfirmed renewal then
   * resolves as NOT paid, with `reconciliation: 'required'`, rather than
   * quietly granting access.
   */
  stripeUnreachable?: boolean;
}

type PaidAccessKind =
  'lifetime' | 'paid-through' | 'payment-grace' | 'renewal-unconfirmed' | 'none';

interface PaidAccess {
  kind: PaidAccessKind;
  hasAccess: boolean;
  /** When a grace-style hold (`payment-grace` / `renewal-unconfirmed`) ends. */
  graceEndsAt: Date | null;
  /** The end of the paid period, for a Stripe-backed membership whose period is known. */
  paidThrough: Date | null;
  /** The row must be refreshed from Stripe before it can be trusted. */
  reconciliation: 'none' | 'required';
}

const NO_PAID_ACCESS: PaidAccess = {
  kind: 'none',
  hasAccess: false,
  graceEndsAt: null,
  paidThrough: null,
  reconciliation: 'none',
};

/**
 * The single decision for PAID access (the trial is separate - see
 * `evaluateTrial`). Deterministic and pure: the same record, `now` and options
 * always give the same answer. It never writes, never charges, and never starts
 * a subscription.
 *
 * - Legacy `lifetime` + `active`/`trialing`: paid, no dates consulted.
 * - `monthly`/`annual` + `active`/`trialing` with a Stripe subscription: paid
 *   while `now` is before the paid-through date. (Without a subscription - a
 *   membership granted by hand - status decides, bounded by an end date only if
 *   one was recorded, and Stripe is never consulted.) A cancelling member (`cancelAtPeriodEnd`) is the same
 *   case - access simply ends at the date, with no webhook needed. At or after
 *   the date the renewal is unconfirmed (see `renewalUnconfirmedUntil`). A
 *   missing or invalid period end on an active Stripe-backed row is inconsistent:
 *   with no anchor to bound it, access fails closed and the row is flagged for
 *   refresh.
 * - `past_due`: the existing 7-day grace from the FIRST failed payment.
 * - `canceled`/`expired`: none.
 * - A record with no tier (status-only callers) keeps the original status rules.
 */
function evaluatePaidAccess(
  record: EntitlementRecord,
  now: Date,
  options: ResolveOptions,
): PaidAccess {
  const { tier, status } = record;

  if (tier === 'free') return NO_PAID_ACCESS;

  const activeLike = status === 'active' || status === 'trialing';

  if (tier === 'lifetime' && activeLike) {
    return { ...NO_PAID_ACCESS, kind: 'lifetime', hasAccess: true };
  }

  if (activeLike) {
    const end = validDate(record.currentPeriodEnd);
    const stripeBacked = isStripeBackedTier(tier) && Boolean(record.stripeSubscriptionId);

    if (!stripeBacked) {
      // No Stripe subscription to ask (a membership granted by hand, or a
      // status-only caller): status decides, bounded by an explicit end date
      // when one was recorded. Never refreshed from Stripe.
      if (end && now.getTime() >= end.getTime()) {
        return { ...NO_PAID_ACCESS, paidThrough: end };
      }
      return { ...NO_PAID_ACCESS, kind: 'paid-through', hasAccess: true, paidThrough: end };
    }

    if (!end) {
      // Stripe always supplies a period end, so its absence is an
      // inconsistency; with no anchor to bound it, fail closed and flag for
      // refresh rather than guess.
      return { ...NO_PAID_ACCESS, reconciliation: 'required' };
    }
    if (now.getTime() < end.getTime()) {
      return { ...NO_PAID_ACCESS, kind: 'paid-through', hasAccess: true, paidThrough: end };
    }

    // The paid period has ended but the row still says active: unconfirmed.
    const holdUntil = renewalUnconfirmedUntil(end);
    if (options.stripeUnreachable === true && now.getTime() < holdUntil.getTime()) {
      return {
        kind: 'renewal-unconfirmed',
        hasAccess: true,
        graceEndsAt: holdUntil,
        paidThrough: end,
        reconciliation: 'required',
      };
    }
    return { ...NO_PAID_ACCESS, paidThrough: end, reconciliation: 'required' };
  }

  if (isInPaymentGrace(record, now)) {
    return {
      kind: 'payment-grace',
      hasAccess: true,
      graceEndsAt: record.paymentFailedAt ? graceEndsAt(record.paymentFailedAt) : null,
      paidThrough: validDate(record.currentPeriodEnd),
      reconciliation: 'none',
    };
  }

  return NO_PAID_ACCESS;
}

/**
 * The state of the app-managed free trial. Only a Free account has one, and it
 * is evaluated purely from its dates: inside `[trialStartedAt, trialEndsAt)` the
 * account has full paid-feature access; at or after `trialEndsAt` it is simply a
 * Free account again - nothing is stored, charged or converted.
 *
 * Inconsistent dates fail closed (no access): only one of the two set, an end
 * that is not after the start, an unparseable date, or a start in the future.
 */
export interface TrialStatus {
  active: boolean;
  endsAt: Date | null;
  /** A valid trial existed and its end has passed. */
  expired: boolean;
  /** Dates were present but unusable, so no trial access was granted. */
  inconsistent: boolean;
}

export function evaluateTrial(
  record: Pick<EntitlementRecord, 'tier' | 'trialStartedAt' | 'trialEndsAt'>,
  now: Date,
): TrialStatus {
  const none: TrialStatus = { active: false, endsAt: null, expired: false, inconsistent: false };
  if (record.tier !== 'free') return none;

  const hasStart = record.trialStartedAt != null;
  const hasEnd = record.trialEndsAt != null;
  if (!hasStart && !hasEnd) return none;

  const started = validDate(record.trialStartedAt);
  const ends = validDate(record.trialEndsAt);
  if (!started || !ends || ends.getTime() <= started.getTime()) {
    return { ...none, inconsistent: true };
  }
  if (now.getTime() < started.getTime()) {
    return { ...none, inconsistent: true };
  }
  if (now.getTime() < ends.getTime()) {
    return { active: true, endsAt: ends, expired: false, inconsistent: false };
  }
  return { active: false, endsAt: null, expired: true, inconsistent: false };
}

/**
 * Whether this record's Stripe-derived state is too uncertain to trust and must
 * be refreshed from Stripe before an access decision: an active Stripe-backed
 * row whose paid period has ended (or has no period end at all). Callers that
 * can reach Stripe do so, then re-resolve; this function itself does nothing.
 */
export function needsStripeReconciliation(
  record: EntitlementRecord,
  now: Date = new Date(),
): boolean {
  return evaluatePaidAccess(record, now, {}).reconciliation === 'required';
}

function hasEligibleStatus(entitlement: EntitlementRecord, now: Date): boolean {
  if (isStripeBackedTier(entitlement.tier) || entitlement.tier === 'lifetime') {
    return evaluatePaidAccess(entitlement, now, {
      stripeUnreachable: entitlement.stripeUnreachable,
    }).hasAccess;
  }
  // No tier supplied (status-only callers): the original rules, unchanged.
  if (entitlement.status === 'active' || entitlement.status === 'trialing') return true;
  return isInPaymentGrace(entitlement, now);
}

/**
 * Does this user have a member account — i.e. may they use the member area
 * (Today, Practices, Practice Detail, Saved Practices, Practice History,
 * My Journey) and whatever free content the commercial model gives a Free
 * Member?
 *
 * Approved Regulation Suite™ model: Free account → Paid membership →
 * Membership ends → back to the Free account. A paid membership that has
 * ended (cancelled and the paid period over, expired, or payment unresolved
 * past the 7-day grace period) must never cost the user their free
 * account, so member-area access does NOT depend on `status`: every user
 * who has an entitlement row has it.
 *
 * What a status-ineligible record loses is PAID access, which is decided
 * elsewhere and unchanged: `hasPaidAccess` / `resolveMembership` for the
 * paid library, and `authorizeEntitlement` for programme, certification and
 * feature requirements (all still gated on `active`/`trialing`/grace).
 * Which content a free account may open is `canAccessContent`'s job.
 *
 * `null` (no entitlement row at all) has no access - fails closed. In
 * practice this should be rare: a default `free`/`active` row is created
 * synchronously as part of Clerk's `user.created` sync
 * (`packages/auth/src/sync/user.ts`), so almost every authenticated user
 * already has one.
 */
export function hasMemberAccess(entitlement: EntitlementRecord | null): boolean {
  return entitlement !== null;
}

/**
 * Throwing form of `hasMemberAccess`, mirroring `assertEntitlement`'s
 * shape below. Throws `EntitlementRequiredError` (403,
 * `ENTITLEMENT_REQUIRED`) only when the user has no entitlement row at all;
 * a user whose paid membership has ended still has their free account and
 * does not throw.
 */
export function assertMemberAccess(entitlement: EntitlementRecord | null): void {
  if (hasMemberAccess(entitlement)) return;

  throw new EntitlementRequiredError(['member'], [], 'Member access required.', {
    reason: 'NO_ENTITLEMENT',
  });
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

/**
 * Where a member stands, in the commercial model's own vocabulary:
 *
 * - `free` - a free account (no paid plan, no unexpired trial).
 * - `trialing` - inside the 30-day app-managed free trial (full paid access).
 *   No card is held and nothing converts when it ends.
 * - `active` - paying member (paid access). `cancelsAtPeriodEnd` is set when
 *   they have cancelled: access still runs to the end of the paid period.
 *   Legacy Lifetime members are `active` and never date-limited.
 * - `grace` - paid access is being held while something is unresolved: a
 *   recurring payment failed (`graceReason: 'payment_failed'`, the 7-day grace),
 *   or Stripe could not be asked to confirm a renewal
 *   (`graceReason: 'renewal_unconfirmed'`, bounded by the same 7 days).
 * - `inactive` - had a paid plan but is no longer eligible: cancelled and the
 *   period ended, expired, payment unresolved past the grace period, or a
 *   renewal that needs confirming (`reconciliation: 'required'`). Paid access
 *   is gone; the user's free account remains.
 */
export type MembershipState = 'free' | 'trialing' | 'active' | 'grace' | 'inactive';

export interface MembershipRecord extends EntitlementRecord {
  tier: EntitlementTier;
}

/** Why a member is in `grace`: a failed renewal payment, or a renewal Stripe could not be asked about. */
export type GraceReason = 'payment_failed' | 'renewal_unconfirmed';

export interface ResolvedMembership {
  state: MembershipState;
  /** Full paid Regulation Suite library: active, an unexpired trial, or inside a grace hold. */
  hasPaidAccess: boolean;
  /** Only while `state` is `grace`: when access ends if nothing changes. */
  graceEndsAt: Date | null;
  graceReason: GraceReason | null;
  cancelsAtPeriodEnd: boolean;
  /** The end of the paid period, for a Stripe-backed membership whose period is known. */
  paidThrough: Date | null;
  /** Only while `state` is `trialing`: when the free trial ends. */
  trialEndsAt: Date | null;
  /** A Free account whose trial has run out (it is Free again; no second trial). */
  trialExpired: boolean;
  /** The row must be refreshed from Stripe before this result can be trusted. */
  reconciliation: 'none' | 'required';
}

/**
 * Resolves what a member is entitled to - the single server-side decision
 * behind every access check and the account page.
 *
 *   free -> (30-day trial, no card) -> free
 *   free -> explicit checkout -> paid -> ended -> free
 *
 * A trial is a Free account with an unexpired window and has full paid access;
 * when it expires the account is Free again - there is no charge and no
 * conversion, ever. A paid membership ends at its paid-through date (or after
 * the 7-day failed-payment grace). A legacy Lifetime membership is never
 * date-limited. Paid state always outranks a trial. `hasMemberAccess` (the
 * member area itself) never depends on any of this.
 */
export function resolveMembership(
  record: (MembershipRecord & { cancelAtPeriodEnd?: boolean }) | null,
  now: Date = new Date(),
  options: ResolveOptions = {},
): ResolvedMembership {
  const base: ResolvedMembership = {
    state: 'inactive',
    hasPaidAccess: false,
    graceEndsAt: null,
    graceReason: null,
    cancelsAtPeriodEnd: false,
    paidThrough: null,
    trialEndsAt: null,
    trialExpired: false,
    reconciliation: 'none',
  };

  if (!record) return base;

  if (record.tier === 'free') {
    const trial = evaluateTrial(record, now);
    if (trial.active) {
      return { ...base, state: 'trialing', hasPaidAccess: true, trialEndsAt: trial.endsAt };
    }
    return { ...base, state: 'free', trialExpired: trial.expired };
  }

  const paid = evaluatePaidAccess(record, now, {
    stripeUnreachable: options.stripeUnreachable ?? record.stripeUnreachable,
  });
  const common = { paidThrough: paid.paidThrough, reconciliation: paid.reconciliation };

  if (!paid.hasAccess) {
    // Paid period genuinely over (or never validly running): paid access is
    // gone, the Free account remains.
    return { ...base, ...common };
  }

  if (paid.kind === 'payment-grace' || paid.kind === 'renewal-unconfirmed') {
    return {
      ...base,
      ...common,
      state: 'grace',
      hasPaidAccess: true,
      graceEndsAt: paid.graceEndsAt,
      graceReason: paid.kind === 'payment-grace' ? 'payment_failed' : 'renewal_unconfirmed',
    };
  }

  // A Stripe-run trial (`trialing`) can no longer be created - trials are
  // app-managed - but a pre-existing row is still reported as a trial rather
  // than silently relabelled, with its end date.
  if (record.status === 'trialing' && paid.kind === 'paid-through') {
    return {
      ...base,
      ...common,
      state: 'trialing',
      hasPaidAccess: true,
      trialEndsAt: paid.paidThrough,
      cancelsAtPeriodEnd: record.cancelAtPeriodEnd === true,
    };
  }

  return {
    ...base,
    ...common,
    state: 'active',
    hasPaidAccess: true,
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
  if (!hasMemberAccess(record)) return false;
  if (!gatingActive) return true;
  return content.isFree || hasPaidAccess(record, now);
}
