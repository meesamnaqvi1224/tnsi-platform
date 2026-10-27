import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth-api';
import { db, entitlements } from '@tnsi/db';
import { and, eq, isNull } from 'drizzle-orm';
import {
  AlreadySubscribedError,
  CheckoutInProgressError,
  createCheckoutSession,
  ensureStripeCustomer,
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
import { holdsPaidMembership, isMembershipOpen } from '@/lib/membership';

export const runtime = 'nodejs';

/**
 * Starts a Stripe Checkout Session for the authenticated user. The only client
 * input is `tier` - a closed enum of the approved plans (monthly and annual;
 * there is no Lifetime plan - see `checkoutRequestSchema`); the Price and amount
 * are resolved server-side from that tier, never accepted from the request.
 *
 * Enforced here, all server-side (the browser cannot bypass any of it):
 * - authentication first;
 * - closed unless membership is deliberately open AND billing fully configured;
 * - a member who already holds paid membership (active, trialing, or in payment
 *   grace) is refused a second subscription (409) - they use the billing portal;
 * - one Stripe customer per user, created once with an idempotency key and saved
 *   with a compare-and-set UPDATE, so concurrent first requests cannot make two;
 * - `createCheckoutSession` then checks Stripe itself for a live subscription and
 *   reuses or expires this member's own open session (see checkout.ts).
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

  // Closed unless membership has been deliberately opened AND billing is fully
  // configured. Nothing is started - or pretended - before then.
  if (!isMembershipOpen()) {
    return NextResponse.json({ error: 'Billing is not available right now.' }, { status: 503 });
  }

  if (holdsPaidMembership(user.entitlements)) {
    return apiError(
      'ALREADY_A_MEMBER',
      'You already have a membership. Manage it from the billing page.',
      409,
    );
  }

  try {
    const existing = await db
      .select({ stripeCustomerId: entitlements.stripeCustomerId })
      .from(entitlements)
      .where(eq(entitlements.userId, user.id))
      .limit(1);

    let stripeCustomerId = existing[0]?.stripeCustomerId ?? null;
    if (!stripeCustomerId) {
      const created = await ensureStripeCustomer({ userId: user.id, email: user.email });
      // First writer wins; a concurrent request that lost re-reads the winner's id.
      const saved = await db
        .update(entitlements)
        .set({ stripeCustomerId: created, updatedAt: new Date() })
        .where(and(eq(entitlements.userId, user.id), isNull(entitlements.stripeCustomerId)))
        .returning({ stripeCustomerId: entitlements.stripeCustomerId });
      stripeCustomerId = saved[0]?.stripeCustomerId ?? created;
    }

    const { url } = await createCheckoutSession({
      tier: result.data.tier,
      userId: user.id,
      stripeCustomerId,
      successUrl: absoluteUrl('/dashboard/billing?success=true'),
      cancelUrl: absoluteUrl('/dashboard/billing?canceled=true'),
    });
    return success({ url });
  } catch (error) {
    if (error instanceof AlreadySubscribedError) {
      return apiError(
        'ALREADY_A_MEMBER',
        'You already have a membership. Manage it from the billing page.',
        409,
      );
    }
    if (error instanceof CheckoutInProgressError) {
      return apiError(
        'CHECKOUT_IN_PROGRESS',
        'A checkout is already in progress. Please wait a moment and try again.',
        409,
      );
    }
    if (error instanceof UnpurchasableTierError) {
      return badRequest(error.message);
    }
    if (error instanceof StripeConfigError || error instanceof MembershipClosedError) {
      return NextResponse.json({ error: 'Billing is not available right now.' }, { status: 503 });
    }
    // Log the error's type only: provider messages can echo parts of keys or customer data.
    console.error(
      '[billing checkout] failed:',
      error instanceof Error ? error.name : 'UnknownError',
    );
    return internalError('Could not start checkout. Please try again.');
  }
}
