/**
 * Free-trial eligibility and the transactional claim, as pure domain logic.
 *
 * Policy (owner-confirmed): 30 days, full paid-feature access, no payment card,
 * one trial per verified normalised email. When the trial ends the account is
 * simply Free again - nothing here, or anywhere in the trial flow, creates a
 * Stripe subscription, takes a payment or converts the account to a paid tier;
 * becoming a paying member needs an explicit checkout.
 *
 * This file contains no database or HTTP code. `claimTrial` is written against
 * the `TrialClaimTx` contract, which the API stage implements with a real
 * Postgres transaction (`db.transaction`):
 *
 *   loadEntitlement          SELECT ... FROM entitlements WHERE user_id = $1 FOR UPDATE
 *   findClaims               SELECT ... FROM trial_claims WHERE email_key = ANY($1)
 *   insertClaimIfAbsent      INSERT ... ON CONFLICT (email_key) DO NOTHING RETURNING
 *   rekeyClaim               UPDATE trial_claims SET email_key, key_version WHERE email_key = $old
 *   startTrialIfEligible     UPDATE entitlements SET trial_started_at, trial_ends_at
 *                              WHERE user_id = $1 AND tier = 'free'
 *                                AND trial_started_at IS NULL AND stripe_subscription_id IS NULL
 *
 * The PRIMARY KEY on `trial_claims.email_key` is what makes simultaneous claims
 * safe: whichever transaction inserts first wins, and a competing INSERT either
 * waits for it and conflicts, or - if the winner rolls back - proceeds. The
 * claim and the entitlement's trial dates are written in ONE transaction, so a
 * claim can never be burned without a trial, nor a trial granted without a claim.
 */
import type { EntitlementTier } from '../authorize/entitlements';
import {
  buildEligibilityKeys,
  loadTrialKeyConfig,
  rekeyPlan,
  requireVerifiedPrimaryEmail,
  type EligibilityKeys,
  type ProviderUserEmails,
  type TrialKeyConfig,
} from './email';

/** Approved trial length. (The web app's display constant `MEMBERSHIP_TRIAL_DAYS` must equal this; a test checks.) */
export const TRIAL_DURATION_DAYS = 30;

const MS_PER_DAY = 24 * 60 * 60 * 1000;

export interface TrialWindow {
  startedAt: Date;
  endsAt: Date;
}

/** The trial that starts at `now`: exactly 30 days, to the millisecond. */
export function trialWindow(now: Date): TrialWindow {
  return { startedAt: now, endsAt: new Date(now.getTime() + TRIAL_DURATION_DAYS * MS_PER_DAY) };
}

export type TrialRefusalReason =
  | 'no_account'
  | 'paid_membership'
  | 'previous_subscription'
  | 'trial_already_used'
  | 'trial_already_claimed'
  | 'not_eligible';

/** The facts about an account that bear on eligibility - a subset of the `entitlements` row. */
export interface TrialEntitlementFacts {
  tier: EntitlementTier;
  stripeSubscriptionId: string | null;
  trialStartedAt: Date | null;
  trialEndsAt: Date | null;
}

export type TrialEligibility = { eligible: true } | { eligible: false; reason: TrialRefusalReason };

/**
 * Whether this account may start its one free trial. Checked in a fixed order
 * so the refusal reason is deterministic:
 *  1. no entitlement row at all;
 *  2. any paid tier - including an ended one and legacy Lifetime;
 *  3. a Free account that has ever had a Stripe subscription;
 *  4. a trial already recorded on the account (even half-recorded);
 *  5. a claim already held for this email under any active key version.
 */
export function decideTrialEligibility(input: {
  entitlement: TrialEntitlementFacts | null;
  existingClaim: boolean;
}): TrialEligibility {
  const { entitlement, existingClaim } = input;
  if (!entitlement) return { eligible: false, reason: 'no_account' };
  if (entitlement.tier !== 'free') return { eligible: false, reason: 'paid_membership' };
  if (entitlement.stripeSubscriptionId) return { eligible: false, reason: 'previous_subscription' };
  if (entitlement.trialStartedAt != null || entitlement.trialEndsAt != null) {
    return { eligible: false, reason: 'trial_already_used' };
  }
  if (existingClaim) return { eligible: false, reason: 'trial_already_claimed' };
  return { eligible: true };
}

export interface TrialClaimRecord {
  emailKey: string;
  keyVersion: number;
  userId: string | null;
  trialEndsAt: Date;
}

/** The transactional operations `claimTrial` needs. See the file header for the SQL each maps to. */
export interface TrialClaimTx {
  loadEntitlement(userId: string): Promise<TrialEntitlementFacts | null>;
  findClaims(emailKeys: string[]): Promise<Array<{ emailKey: string; keyVersion: number }>>;
  /** True only if this call inserted the row; false if the key already exists. */
  insertClaimIfAbsent(claim: TrialClaimRecord & { claimedAt: Date }): Promise<boolean>;
  rekeyClaim(fromKey: string, toKey: string, toVersion: number): Promise<void>;
  /** True only if exactly this account was still an unused Free account and now has the trial. */
  startTrialIfEligible(userId: string, window: TrialWindow): Promise<boolean>;
}

/** Runs `fn` in one transaction: commits if it returns, rolls everything back if it throws. */
export type RunTrialTransaction = <T>(fn: (tx: TrialClaimTx) => Promise<T>) => Promise<T>;

export type TrialClaimResult =
  | { status: 'started'; trialStartedAt: Date; trialEndsAt: Date; keyVersion: number }
  | { status: 'refused'; reason: TrialRefusalReason };

/** Thrown inside the transaction to roll it back while still returning a normal refusal. */
class RollbackWithRefusal extends Error {
  constructor(readonly reason: TrialRefusalReason) {
    super(reason);
  }
}

/**
 * Claims the one free trial for `userId`, atomically.
 *
 * `keys` come from `buildEligibilityKeys` for the account's VERIFIED primary
 * email. Writes happen in this order, all inside one transaction:
 *  - read the entitlement and refuse if it is ineligible (nothing written);
 *  - look the email up under every active key version; if a claim exists,
 *    refuse - and, if it sits under an older key version, move it to the
 *    current one first so rotation completes on touch (this write commits);
 *  - insert the claim under the current key; losing the race refuses;
 *  - start the trial on the entitlement; if that no longer applies (the
 *    account changed since it was read) roll the claim back too, so an
 *    eligibility is never burned without a trial.
 */
export async function claimTrial(
  runTransaction: RunTrialTransaction,
  input: { userId: string; keys: EligibilityKeys; now: Date },
): Promise<TrialClaimResult> {
  const { userId, keys, now } = input;

  try {
    return await runTransaction<TrialClaimResult>(async (tx) => {
      const entitlement = await tx.loadEntitlement(userId);
      const early = decideTrialEligibility({ entitlement, existingClaim: false });
      if (!early.eligible) return { status: 'refused', reason: early.reason };

      const existing = await tx.findClaims(keys.lookup.map((k) => k.key));
      if (existing.length > 0) {
        for (const found of existing) {
          const plan = rekeyPlan(found, keys);
          if (plan.rekey) await tx.rekeyClaim(plan.fromKey, plan.toKey, plan.toVersion);
        }
        return { status: 'refused', reason: 'trial_already_claimed' };
      }

      const window = trialWindow(now);
      const inserted = await tx.insertClaimIfAbsent({
        emailKey: keys.current.key,
        keyVersion: keys.current.version,
        userId,
        claimedAt: now,
        trialEndsAt: window.endsAt,
      });
      if (!inserted) return { status: 'refused', reason: 'trial_already_claimed' };

      const started = await tx.startTrialIfEligible(userId, window);
      if (!started) throw new RollbackWithRefusal('not_eligible');

      return {
        status: 'started',
        trialStartedAt: window.startedAt,
        trialEndsAt: window.endsAt,
        keyVersion: keys.current.version,
      };
    });
  } catch (error) {
    if (error instanceof RollbackWithRefusal) return { status: 'refused', reason: error.reason };
    throw error;
  }
}

/**
 * The whole server-side path in one call, failing closed at every step before
 * any write: the identity provider must report a VERIFIED PRIMARY email
 * (`UnverifiedEmailError` otherwise) and the HMAC secret and version must be
 * configured (`TrialKeyConfigError` otherwise). `env` and `keyConfig` exist so
 * tests and callers can supply configuration explicitly.
 */
export async function claimTrialForUser(
  runTransaction: RunTrialTransaction,
  input: {
    userId: string;
    providerUser: ProviderUserEmails;
    now?: Date;
    keyConfig?: TrialKeyConfig;
    env?: Readonly<Record<string, string | undefined>>;
  },
): Promise<TrialClaimResult> {
  const email = requireVerifiedPrimaryEmail(input.providerUser);
  const config = input.keyConfig ?? loadTrialKeyConfig(input.env);
  const keys = buildEligibilityKeys(email, config);
  return claimTrial(runTransaction, { userId: input.userId, keys, now: input.now ?? new Date() });
}
