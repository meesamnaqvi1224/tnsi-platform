import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth-api';
import {
  describeStripeFailure,
  MembershipClosedError,
  StripeConfigError,
  UnpurchasableTierError,
} from '@tnsi/integrations';
import { checkoutRequestSchema } from '@/lib/validation';
import {
  error as apiError,
  success,
  unauthorized,
  badRequest,
  internalError,
} from '@/lib/api-response';
import { absoluteUrl } from '@/lib/seo';
import { isMembershipOpen } from '@/lib/membership';
import { startCheckout } from '@/lib/start-checkout';

export const runtime = 'nodejs';

/**
 * Starts a Stripe Checkout Session for the authenticated user. The only
 * client input is `tier` — a closed enum of the two purchasable plans (see
 * `checkoutRequestSchema`; "lifetime" is rejected here, it is closed to new
 * purchases). The Stripe Price id and amount are resolved server-side from that
 * tier, never accepted from the request body.
 *
 * Regulation Suite™ membership rules enforced here, all server-side:
 * - Closed until membership is deliberately opened AND billing is fully
 *   configured (`isMembershipOpen`) — no checkout is ever started, or
 *   pretended, before then.
 * - A member who already holds paid access (trialing, active, or in
 *   payment grace) is refused a second subscription — they manage their
 *   plan in the billing portal instead. Decided on the member's locked,
 *   current row (see `startCheckout`), so simultaneous requests cannot race.
 * - At most one payable checkout exists per member: a repeat for the same plan
 *   is sent back to the open session, a different plan expires the earlier one
 *   first, and a purchase that has completed but not yet been recorded blocks a
 *   second one (see `startCheckout`).
 * - Checkout never carries a trial. The 30-day free trial is app-managed
 *   (POST /api/v1/billing/trial): no card, no Stripe subscription, and it
 *   returns to Free at the end. A subscription is only ever created here, by
 *   an explicit plan choice, and is charged from the start.
 */
export async function POST(request: Request) {
  let user;
  try {
    user = await requireAuth();
  } catch {
    return unauthorized();
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return badRequest('Invalid JSON body');
  }

  const result = checkoutRequestSchema.safeParse(body);
  if (!result.success) {
    return badRequest('Validation failed', { errors: result.error.flatten().fieldErrors });
  }

  if (!isMembershipOpen()) {
    return NextResponse.json({ error: 'Billing is not available right now.' }, { status: 503 });
  }

  try {
    const outcome = await startCheckout({
      userId: user.id,
      userEmail: user.email,
      tier: result.data.tier,
      // `{CHECKOUT_SESSION_ID}` is substituted by Stripe. The return page treats it
      // as an unverified claim: it re-reads the session from Stripe and checks it
      // belongs to this member before anything is recorded.
      successUrl: `${absoluteUrl('/dashboard/billing?success=true')}&session_id={CHECKOUT_SESSION_ID}`,
      cancelUrl: absoluteUrl('/dashboard/billing?canceled=true'),
    });

    if (outcome.status === 'already_a_member') {
      return apiError(
        'ALREADY_A_MEMBER',
        'You already have a membership. Manage it from the billing page.',
        409,
      );
    }
    if (outcome.status === 'checkout_in_progress') {
      return apiError(
        'CHECKOUT_IN_PROGRESS',
        'Your payment is still being confirmed. Please check your membership page in a few minutes before trying again.',
        409,
      );
    }
    if (outcome.status === 'review_required') {
      return apiError(
        'REVIEW_REQUIRED',
        'Your membership needs a quick manual check before another purchase can be made. Please contact us - you will not be charged again in the meantime.',
        409,
      );
    }
    if (outcome.status === 'no_account') {
      return apiError('FORBIDDEN', 'Member access required.', 403);
    }
    return success({ url: outcome.url });
  } catch (error) {
    if (error instanceof UnpurchasableTierError) {
      return badRequest(error.message);
    }
    if (error instanceof StripeConfigError || error instanceof MembershipClosedError) {
      return NextResponse.json({ error: 'Billing is not available right now.' }, { status: 503 });
    }
    // Class, code, status and request id only: a Stripe or database error's
    // message can echo request parameters.
    console.error('[billing checkout] failed:', describeStripeFailure(error));
    return internalError('Could not start checkout. Please try again.');
  }
}
