import { eq } from 'drizzle-orm';
import { db, entitlements } from '@tnsi/db';
import {
  describeStripeFailure,
  liveCheckoutSessionGateway,
  type CheckoutSessionGateway,
} from '@tnsi/integrations';
import {
  readTimeSubscriptionReader,
  refreshSubscription,
  type SyncDeps,
} from './sync-stripe-entitlement';

/**
 * What the member's return from Stripe Checkout turned out to be. This is the
 * ONLY thing the caller learns: no Stripe id, subscription id or session detail
 * ever leaves this module.
 *
 *  - `confirmed`   Stripe says the session completed and paid, and the member's
 *                  subscription state was read from Stripe and recorded.
 *  - `pending`     the session is still open, or its payment has not cleared
 *                  yet (asynchronous method). Nothing is granted; the webhook
 *                  records it when Stripe confirms.
 *  - `expired`     the session expired unpaid.
 *  - `review`      paid, but the subscription could not be applied (e.g. a
 *                  second live subscription, or a protected membership). Left
 *                  for manual review; nothing is overwritten.
 *  - `unavailable` Stripe could not be reached. Nothing is granted; the webhook
 *                  or the next page load will record it.
 *  - `not_found`   the identifier is unknown, or is not THIS member's session.
 *                  The two are deliberately indistinguishable.
 *  - `invalid`     not a plausible session identifier; Stripe is not called.
 */
export type CheckoutReturnOutcome = {
  status: 'confirmed' | 'pending' | 'expired' | 'review' | 'unavailable' | 'not_found' | 'invalid';
};

const SESSION_ID = /^cs_(test|live)_[A-Za-z0-9]{8,250}$/;

export interface CheckoutReturnDeps {
  sessions?: CheckoutSessionGateway;
  sync?: Pick<SyncDeps, 'reader' | 'runTransaction' | 'now'>;
  /** The member's Stripe customer id; defaults to a database read. Injectable for tests. */
  customerOf?: (userId: string) => Promise<string | null>;
}

async function customerFromDatabase(userId: string): Promise<string | null> {
  const [row] = await db
    .select({ stripeCustomerId: entitlements.stripeCustomerId })
    .from(entitlements)
    .where(eq(entitlements.userId, userId))
    .limit(1);
  return row?.stripeCustomerId ?? null;
}

/**
 * Reconciles a Checkout session the browser says it has just completed.
 *
 * The identifier from the URL is an UNTRUSTED CLAIM, and arriving at the success
 * URL is not payment. Nothing is granted on the strength of either. Instead:
 *  1. the identifier must look like a session id (else Stripe is not called);
 *  2. the session is retrieved from Stripe, server-side;
 *  3. it must be a subscription session that carries THIS member's id in the
 *     metadata and client reference we stamped at creation, AND belong to THIS
 *     member's own Stripe customer (taken from our database, never the request);
 *  4. only a COMPLETE session whose payment is settled leads anywhere. Then the
 *     subscription's current state is read from Stripe and recorded by exactly
 *     the code the webhook uses (`refreshSubscription`): under the member's row
 *     lock, from Stripe's current state, never touching a Lifetime row.
 *
 * Because it records Stripe's CURRENT state (not state carried by the session
 * or the redirect) under the same lock as the webhook, repeating this, or
 * racing it against the webhook, writes the same values; neither can overwrite
 * newer state with older.
 */
export async function reconcileCheckoutReturn(
  input: { userId: string; sessionId: string },
  deps: CheckoutReturnDeps = {},
): Promise<CheckoutReturnOutcome> {
  if (typeof input.sessionId !== 'string' || !SESSION_ID.test(input.sessionId)) {
    return { status: 'invalid' };
  }
  const sessions = deps.sessions ?? liveCheckoutSessionGateway;

  let customerId: string | null;
  try {
    customerId = await (deps.customerOf ?? customerFromDatabase)(input.userId);
  } catch (error) {
    console.error('[checkout return] member lookup failed:', describeStripeFailure(error));
    return { status: 'unavailable' };
  }
  if (!customerId) return { status: 'not_found' };

  let session;
  try {
    session = await sessions.retrieve(input.sessionId);
  } catch (error) {
    if ((error as { code?: unknown } | null)?.code === 'resource_missing') {
      return { status: 'not_found' };
    }
    console.error('[checkout return] Stripe lookup failed:', describeStripeFailure(error));
    return { status: 'unavailable' };
  }

  const ours =
    session.mode === 'subscription' &&
    session.userId === input.userId &&
    session.clientReferenceId === input.userId &&
    session.customerId === customerId;
  if (!ours) return { status: 'not_found' };

  if (session.status === 'expired') return { status: 'expired' };
  if (session.status !== 'complete') return { status: 'pending' };
  if (session.paymentStatus === 'unpaid' || !session.subscriptionId) return { status: 'pending' };

  try {
    const outcome = await refreshSubscription(
      {
        action: 'refresh-subscription',
        subscriptionId: session.subscriptionId,
        stripeCustomerId: customerId,
        userId: input.userId,
        eventTime: null,
      },
      { reader: readTimeSubscriptionReader, ...deps.sync },
    );
    return { status: outcome.status === 'synced' ? 'confirmed' : 'review' };
  } catch (error) {
    console.error(
      '[checkout return] could not record the subscription:',
      describeStripeFailure(error),
    );
    return { status: 'unavailable' };
  }
}
