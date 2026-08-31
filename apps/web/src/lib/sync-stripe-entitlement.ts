import { db, entitlements, users } from '@tnsi/db';
import { eq } from 'drizzle-orm';
import {
  getStripeClient,
  getStripeConfig,
  planForCheckoutSessionCompleted,
  planForInvoicePaymentFailed,
  planForSubscriptionEvent,
  type EntitlementSyncPlan,
} from '@tnsi/integrations';
import type Stripe from 'stripe';

export interface SyncStripeEntitlementResult {
  action: EntitlementSyncPlan['action'];
  detail: string;
}

/**
 * Extracts the plain values `packages/integrations`'s pure planners need
 * from a real Stripe event, builds the plan, then executes it — the
 * database write is the only side effect in this module; the decision of
 * *what* to write lives entirely in `@tnsi/integrations` (mirrors
 * apps/web/src/lib/sync-practice.ts's split for the Sanity webhook).
 *
 * Every branch below ends in a plain `UPDATE ... WHERE`, never an insert —
 * the `entitlements` row for a user always already exists (created on
 * `user.created`, see packages/auth/src/sync/user.ts's
 * `DEFAULT_ENTITLEMENTS`), so this only ever changes which values it
 * holds. That's what makes replaying the same Stripe event twice safe:
 * the second run just writes the same values again.
 */
export async function syncStripeEvent(event: Stripe.Event): Promise<SyncStripeEntitlementResult> {
  const { priceIds } = getStripeConfig();

  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object as Stripe.Checkout.Session;
      const priceId = await resolveCheckoutPriceId(session);
      const plan = planForCheckoutSessionCompleted(
        {
          mode: session.mode,
          customerId: typeof session.customer === 'string' ? session.customer : null,
          userId: session.metadata?.userId ?? null,
          paymentStatus: session.payment_status,
          priceId,
        },
        priceIds,
      );
      return applyPlan(plan);
    }

    case 'customer.subscription.created':
    case 'customer.subscription.updated':
    case 'customer.subscription.deleted': {
      const subscription = event.data.object as Stripe.Subscription;
      const plan = planForSubscriptionEvent(
        {
          customerId: typeof subscription.customer === 'string' ? subscription.customer : null,
          subscriptionId: subscription.id,
          status: subscription.status,
          priceId: subscription.items.data[0]?.price?.id ?? null,
          currentPeriodStart: toDate(subscription.current_period_start),
          currentPeriodEnd: toDate(subscription.current_period_end),
          cancelAtPeriodEnd: subscription.cancel_at_period_end,
          canceledAt: toDate(subscription.canceled_at),
        },
        priceIds,
      );
      return applyPlan(plan);
    }

    case 'invoice.payment_failed': {
      const invoice = event.data.object as Stripe.Invoice;
      const plan = planForInvoicePaymentFailed({
        customerId: typeof invoice.customer === 'string' ? invoice.customer : null,
        subscriptionId:
          typeof invoice.subscription === 'string'
            ? invoice.subscription
            : (invoice.subscription?.id ?? null),
      });
      return applyPlan(plan);
    }

    default:
      return { action: 'skip', detail: `unhandled event type: ${event.type}` };
  }
}

function toDate(unixSeconds: number | null | undefined): Date | null {
  return typeof unixSeconds === 'number' ? new Date(unixSeconds * 1000) : null;
}

/**
 * A `checkout.session.completed` webhook payload doesn't include line
 * items unless the Stripe webhook endpoint is specifically configured to
 * expand them. Only the one-time-payment (lifetime) path actually needs
 * the price id from this event — the subscription path gets its price
 * from the `customer.subscription.created` event instead, which always
 * carries it — so this only makes the extra Stripe API call when it's a
 * payment-mode session, never for every checkout completion.
 */
async function resolveCheckoutPriceId(session: Stripe.Checkout.Session): Promise<string | null> {
  const inline = session.line_items?.data[0]?.price?.id;
  if (inline) return inline;
  if (session.mode !== 'payment') return null;

  try {
    const full = await getStripeClient().checkout.sessions.retrieve(session.id, {
      expand: ['line_items'],
    });
    return full.line_items?.data[0]?.price?.id ?? null;
  } catch (error) {
    console.error('[stripe webhook] failed to retrieve checkout session line items:', error);
    return null;
  }
}

async function applyPlan(plan: EntitlementSyncPlan): Promise<SyncStripeEntitlementResult> {
  switch (plan.action) {
    case 'skip':
      return { action: 'skip', detail: plan.reason };

    case 'link-customer': {
      const user = await db.select().from(users).where(eq(users.id, plan.userId)).limit(1);
      if (!user[0]) {
        return { action: 'skip', detail: `checkout session userId ${plan.userId} does not exist` };
      }
      await db
        .update(entitlements)
        .set({ stripeCustomerId: plan.stripeCustomerId, updatedAt: new Date() })
        .where(eq(entitlements.userId, plan.userId));
      return { action: 'link-customer', detail: `linked customer ${plan.stripeCustomerId}` };
    }

    case 'grant-lifetime': {
      const user = await db.select().from(users).where(eq(users.id, plan.userId)).limit(1);
      if (!user[0]) {
        return { action: 'skip', detail: `checkout session userId ${plan.userId} does not exist` };
      }
      await db
        .update(entitlements)
        .set({
          tier: 'lifetime',
          status: 'active',
          stripeCustomerId: plan.stripeCustomerId,
          stripeSubscriptionId: null,
          currentPeriodStart: null,
          currentPeriodEnd: null,
          cancelAtPeriodEnd: false,
          canceledAt: null,
          updatedAt: new Date(),
        })
        .where(eq(entitlements.userId, plan.userId));
      return { action: 'grant-lifetime', detail: `granted lifetime to user ${plan.userId}` };
    }

    case 'sync-subscription': {
      const result = await db
        .update(entitlements)
        .set({
          tier: plan.values.tier,
          status: plan.values.status,
          stripeSubscriptionId: plan.values.stripeSubscriptionId,
          currentPeriodStart: plan.values.currentPeriodStart,
          currentPeriodEnd: plan.values.currentPeriodEnd,
          cancelAtPeriodEnd: plan.values.cancelAtPeriodEnd,
          canceledAt: plan.values.canceledAt,
          updatedAt: new Date(),
        })
        .where(eq(entitlements.stripeCustomerId, plan.stripeCustomerId))
        .returning({ userId: entitlements.userId });

      if (result.length === 0) {
        return {
          action: 'skip',
          detail: `no entitlement row is linked to Stripe customer ${plan.stripeCustomerId}`,
        };
      }
      return {
        action: 'sync-subscription',
        detail: `synced subscription for customer ${plan.stripeCustomerId}`,
      };
    }

    case 'mark-past-due': {
      const result = await db
        .update(entitlements)
        .set({ status: 'past_due', updatedAt: new Date() })
        .where(eq(entitlements.stripeCustomerId, plan.stripeCustomerId))
        .returning({ userId: entitlements.userId });

      if (result.length === 0) {
        return {
          action: 'skip',
          detail: `no entitlement row is linked to Stripe customer ${plan.stripeCustomerId}`,
        };
      }
      return {
        action: 'mark-past-due',
        detail: `marked customer ${plan.stripeCustomerId} past due`,
      };
    }
  }
}
