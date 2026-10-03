import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth-api';
import { db, entitlements } from '@tnsi/db';
import { eq } from 'drizzle-orm';
import {
  createCheckoutSession,
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
import { resolveMembership } from '@tnsi/auth/authorize/entitlements';

export const runtime = 'nodejs';

/**
 * Starts a Stripe Checkout Session for the authenticated user. The only
 * client input is `tier` — a closed enum of the three tiers this app
 * already knows about (see `checkoutRequestSchema`); the actual Stripe
 * Price id, checkout mode, and amount are all resolved server-side from
 * that tier, never accepted from the request body.
 *
 * Regulation Suite™ membership rules enforced here, all server-side:
 * - Closed until membership is deliberately opened AND billing is fully
 *   configured (`isMembershipOpen`) — no checkout is ever started, or
 *   pretended, before then.
 * - A member who already holds paid access (trialing, active, or in
 *   payment grace) is refused a second subscription — they manage their
 *   plan in the billing portal instead.
 * - The 30-day trial is offered only to an account that has never had a
 *   subscription. Decided here from the entitlement row, never from the
 *   request, so it can't be claimed twice or granted by a client.
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

  if (user.entitlements && resolveMembership(user.entitlements).hasPaidAccess) {
    return apiError(
      'ALREADY_A_MEMBER',
      'You already have a membership. Manage it from the billing page.',
      409,
    );
  }

  const existing = await db
    .select({
      stripeCustomerId: entitlements.stripeCustomerId,
      stripeSubscriptionId: entitlements.stripeSubscriptionId,
    })
    .from(entitlements)
    .where(eq(entitlements.userId, user.id))
    .limit(1);

  try {
    const { url } = await createCheckoutSession({
      tier: result.data.tier,
      userId: user.id,
      userEmail: user.email,
      existingStripeCustomerId: existing[0]?.stripeCustomerId ?? null,
      offerTrial: !existing[0]?.stripeSubscriptionId,
      successUrl: absoluteUrl('/dashboard/billing?success=true'),
      cancelUrl: absoluteUrl('/dashboard/billing?canceled=true'),
    });
    return success({ url });
  } catch (error) {
    if (error instanceof UnpurchasableTierError) {
      return badRequest(error.message);
    }
    if (error instanceof StripeConfigError) {
      return NextResponse.json({ error: 'Billing is not available right now.' }, { status: 503 });
    }
    console.error('[billing checkout] failed:', error);
    return internalError('Could not start checkout. Please try again.');
  }
}
