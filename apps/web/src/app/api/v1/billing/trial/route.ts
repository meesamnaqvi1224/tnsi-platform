import { requireAuth } from '@/lib/auth-api';
import { error as apiError, success, unauthorized, internalError } from '@/lib/api-response';
import { isMembershipOpen } from '@/lib/membership';
import { runTrialTransaction } from '@/lib/trial';
import { fetchProviderUserEmails, ProviderLookupError } from '@tnsi/auth/verify/email';
import { TrialKeyConfigError, UnverifiedEmailError } from '@tnsi/auth/trial/email';
import {
  claimTrialForUser,
  decideTrialEligibility,
  type TrialRefusalReason,
} from '@tnsi/auth/trial/eligibility';

export const runtime = 'nodejs';

/**
 * Starts the member's one free trial: 30 days, full paid-feature access, no
 * payment card, no Stripe. When it ends the account is simply Free again - this
 * route never creates a subscription, takes a payment or converts anything.
 *
 * Rules enforced here, all server-side and none taken from the request (it has
 * no body):
 * - Closed until membership is deliberately opened (`isMembershipOpen`), the
 *   same switch as checkout, so it stays dormant until launch.
 * - The identity provider must report a VERIFIED PRIMARY email; the address in
 *   our own database is never used for eligibility.
 * - One trial per verified, normalised email, decided by the database's primary
 *   key inside one transaction (see `claimTrial` in @tnsi/auth).
 * - Refused for any account that holds or has held a paid membership.
 *
 * Fails closed: a missing HMAC secret, an unverified email or an unreachable
 * identity provider all refuse and write nothing. Nothing logged here contains
 * an email address or the derived eligibility key - only an error class name.
 */
const REFUSAL_MESSAGES: Record<Exclude<TrialRefusalReason, 'no_account'>, string> = {
  paid_membership: 'A free trial is only available to accounts that have never had a membership.',
  previous_subscription:
    'A free trial is only available to accounts that have never had a membership.',
  trial_already_used: 'You have already used your free trial.',
  trial_already_claimed: 'A free trial has already been used for this email address.',
  not_eligible: 'A free trial is not available for this account.',
};

function refusal(reason: TrialRefusalReason) {
  if (reason === 'no_account') {
    return apiError('FORBIDDEN', 'Member access required.', 403);
  }
  return apiError('TRIAL_NOT_AVAILABLE', REFUSAL_MESSAGES[reason], 409, { reason });
}

/** What is safe to write to logs about a failure: its class, and a Postgres/Stripe-style code if any. */
function describeFailure(failure: unknown): { name: string; code?: string } {
  if (failure instanceof Error) {
    const code = (failure as { code?: unknown }).code;
    return { name: failure.name, ...(typeof code === 'string' ? { code } : {}) };
  }
  return { name: 'UnknownError' };
}

export async function POST() {
  let user;
  try {
    user = await requireAuth();
  } catch {
    return unauthorized();
  }

  if (!isMembershipOpen()) {
    return apiError('TRIAL_UNAVAILABLE', 'Free trials are not available right now.', 503);
  }

  // Obviously ineligible accounts are refused before any provider call or write.
  const row = user.entitlements;
  const early = decideTrialEligibility({
    entitlement: row && {
      tier: row.tier,
      stripeSubscriptionId: row.stripeSubscriptionId,
      trialStartedAt: row.trialStartedAt,
      trialEndsAt: row.trialEndsAt,
    },
    existingClaim: false,
  });
  if (!early.eligible) return refusal(early.reason);

  try {
    const providerUser = await fetchProviderUserEmails(user.clerkUserId);
    const result = await claimTrialForUser(runTrialTransaction, {
      userId: user.id,
      providerUser,
    });

    if (result.status === 'refused') return refusal(result.reason);

    return success({ trialStartedAt: result.trialStartedAt, trialEndsAt: result.trialEndsAt }, 201);
  } catch (failure) {
    if (failure instanceof UnverifiedEmailError) {
      return apiError(
        'EMAIL_NOT_VERIFIED',
        'Please verify your primary email address to start a free trial.',
        403,
      );
    }
    if (failure instanceof TrialKeyConfigError || failure instanceof ProviderLookupError) {
      console.error('[trial] unavailable:', describeFailure(failure));
      return apiError('TRIAL_UNAVAILABLE', 'Free trials are not available right now.', 503);
    }
    console.error('[trial] failed:', describeFailure(failure));
    return internalError('Could not start your free trial. Please try again.');
  }
}
