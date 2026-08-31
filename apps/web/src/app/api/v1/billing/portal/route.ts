import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth-api';
import { db, entitlements } from '@tnsi/db';
import { eq } from 'drizzle-orm';
import {
  createBillingPortalSession,
  NoStripeCustomerError,
  StripeConfigError,
} from '@tnsi/integrations';
import { success, unauthorized, badRequest, internalError } from '@/lib/api-response';
import { absoluteUrl } from '@/lib/seo';

export const runtime = 'nodejs';

/**
 * Opens a Stripe Billing Portal session for the authenticated user's
 * existing Stripe customer — self-service cancel/update-payment-method/
 * view-invoices, per ARCHITECTURE.md's "Payments: Stripe" decision. Takes
 * no request body: the customer is always the authenticated user's own,
 * looked up server-side, never supplied by the client.
 */
export async function POST() {
  let user;
  try {
    user = await requireAuth();
  } catch {
    return unauthorized();
  }

  const existing = await db
    .select({ stripeCustomerId: entitlements.stripeCustomerId })
    .from(entitlements)
    .where(eq(entitlements.userId, user.id))
    .limit(1);

  try {
    const { url } = await createBillingPortalSession({
      stripeCustomerId: existing[0]?.stripeCustomerId ?? null,
      returnUrl: absoluteUrl('/dashboard/billing'),
    });
    return success({ url });
  } catch (error) {
    if (error instanceof NoStripeCustomerError) {
      return badRequest(error.message);
    }
    if (error instanceof StripeConfigError) {
      return NextResponse.json({ error: 'Billing is not available right now.' }, { status: 503 });
    }
    console.error('[billing portal] failed:', error);
    return internalError('Could not open billing management. Please try again.');
  }
}
