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
import { success, unauthorized, badRequest, internalError } from '@/lib/api-response';
import { absoluteUrl } from '@/lib/seo';

export const runtime = 'nodejs';

/**
 * Starts a Stripe Checkout Session for the authenticated user. The only
 * client input is `tier` — a closed enum of the three tiers this app
 * already knows about (see `checkoutRequestSchema`); the actual Stripe
 * Price id, checkout mode, and amount are all resolved server-side from
 * that tier, never accepted from the request body.
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

  const existing = await db
    .select({ stripeCustomerId: entitlements.stripeCustomerId })
    .from(entitlements)
    .where(eq(entitlements.userId, user.id))
    .limit(1);

  try {
    const { url } = await createCheckoutSession({
      tier: result.data.tier,
      userId: user.id,
      userEmail: user.email,
      existingStripeCustomerId: existing[0]?.stripeCustomerId ?? null,
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
