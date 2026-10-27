import { and, eq, sql } from 'drizzle-orm';
import { db, entitlements, type DB } from '@tnsi/db';
import {
  describeStripeFailure,
  getStripeClient,
  getStripeConfig,
  planForCheckoutSessionCompleted,
  planForInvoicePaymentFailed,
  planForSubscriptionEvent,
  planForSubscriptionLifecycleEvent,
  type EntitlementSyncPlan,
  type PaymentFailureUpdate,
} from '@tnsi/integrations';
import type Stripe from 'stripe';

export interface SyncStripeEntitlementResult {
  action: 'sync-subscription' | 'skip';
  detail: string;
}

/** The one Stripe read this needs: a subscription's CURRENT state. Injectable so tests need no network. */
export interface SubscriptionReader {
  retrieveSubscription(subscriptionId: string): Promise<Stripe.Subscription>;
}

export type Executor = Parameters<Parameters<DB['transaction']>[0]>[0];
type RunTransaction = <T>(fn: (trx: Executor) => Promise<T>) => Promise<T>;

export interface SyncDeps {
  reader: SubscriptionReader;
  runTransaction?: RunTransaction;
  now?: () => Date;
}

/** Webhook reads: patient (Stripe retries the delivery if this fails anyway). */
export const webhookSubscriptionReader: SubscriptionReader = {
  retrieveSubscription: (id) =>
    getStripeClient().subscriptions.retrieve(id, undefined, {
      timeout: 8000,
      maxNetworkRetries: 1,
    }),
};

/** Read-time reconciliation: a member is waiting, so fail fast - one attempt, short timeout. */
export const readTimeSubscriptionReader: SubscriptionReader = {
  retrieveSubscription: (id) =>
    getStripeClient().subscriptions.retrieve(id, undefined, {
      timeout: 4000,
      maxNetworkRetries: 0,
    }),
};

const defaultRun: RunTransaction = (fn) => db.transaction((trx) => fn(trx));

/**
 * Turns a verified Stripe event into entitlement changes.
 *
 * ## Why this is safe against duplicate, replayed and out-of-order delivery
 * Stripe delivers at least once and in no guaranteed order, and an event's
 * payload can already be stale on arrival. So the event is used ONLY to learn
 * which subscription changed (see `refresh-subscription` in
 * @tnsi/integrations). The subscription's CURRENT state is then read from
 * Stripe - the source of truth - while this transaction holds the member's
 * entitlement row lock (`SELECT ... FOR UPDATE`), and that state is what gets
 * written. Consequently:
 *  - a duplicate or replayed event rewrites the same values (idempotent);
 *  - a stale event delivered late cannot overwrite newer state, because it never
 *    contributes any state of its own;
 *  - two events (or an event and a read-time refresh) for the same member are
 *    serialised by the row lock, and each reads Stripe AFTER the previous one
 *    committed, so the last writer always holds the newest state. No event
 *    timestamp is used to order anything.
 *
 * A failure anywhere (Stripe unreachable, a database error) throws out of the
 * transaction, which rolls back entirely; the route answers 500 and Stripe
 * retries the delivery. Nothing is ever half-written.
 */
export async function syncStripeEvent(
  event: Stripe.Event,
  deps: SyncDeps = { reader: webhookSubscriptionReader },
): Promise<SyncStripeEntitlementResult> {
  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object as Stripe.Checkout.Session;
      return applyPlan(
        planForCheckoutSessionCompleted({
          mode: session.mode,
          customerId: idOf(session.customer),
          subscriptionId: idOf(session.subscription),
          userId: session.metadata?.userId ?? null,
        }),
        deps,
      );
    }

    case 'customer.subscription.created':
    case 'customer.subscription.updated':
    case 'customer.subscription.deleted': {
      const subscription = event.data.object as Stripe.Subscription;
      return applyPlan(
        planForSubscriptionLifecycleEvent({
          customerId: idOf(subscription.customer),
          subscriptionId: subscription.id,
          eventTime: new Date(event.created * 1000),
          userId: subscription.metadata?.userId ?? null,
        }),
        deps,
      );
    }

    case 'invoice.payment_failed': {
      const invoice = event.data.object as Stripe.Invoice;
      return applyPlan(
        planForInvoicePaymentFailed({
          customerId: idOf(invoice.customer),
          subscriptionId: idOf(invoice.subscription),
          eventTime: new Date(event.created * 1000),
        }),
        deps,
      );
    }

    default:
      return { action: 'skip', detail: `unhandled event type: ${event.type}` };
  }
}

function idOf(value: string | { id: string } | null | undefined): string | null {
  if (typeof value === 'string') return value;
  return value?.id ?? null;
}

function toDate(unixSeconds: number | null | undefined): Date | null {
  return typeof unixSeconds === 'number' ? new Date(unixSeconds * 1000) : null;
}

/**
 * The grace-anchor write. `start` records the failure time only if none is
 * recorded yet - `COALESCE` keeps the FIRST failure, so Stripe's repeated
 * retries can never restart the 7-day grace clock. `clear` resets it once the
 * subscription is healthy again; `keep` leaves it untouched. Stored as an ISO
 * string cast to timestamptz so the value is identical whichever driver
 * serialises it.
 */
function paymentFailedAtUpdate(update: PaymentFailureUpdate) {
  switch (update.action) {
    case 'start':
      return {
        paymentFailedAt: sql`COALESCE(${entitlements.paymentFailedAt}, ${update.at.toISOString()}::timestamptz)`,
      };
    case 'clear':
      return { paymentFailedAt: null };
    case 'keep':
      return {};
  }
}

/** Subscription statuses in which Stripe still considers the subscription live (it may still bill or serve access). */
const LIVE_STATUSES = new Set(['active', 'trialing', 'past_due', 'unpaid']);

export type RefreshOutcome =
  { status: 'synced'; detail: string } | { status: 'skipped'; detail: string };

/**
 * Reads one subscription from Stripe and applies its current state to the
 * member's entitlement, inside one transaction holding the member's row lock.
 * Used by the webhook (via `syncStripeEvent`) and by the read-time
 * reconciliation, so both behave identically.
 *
 * Never writes a Lifetime row, never links a Stripe customer to the wrong
 * member, never lets a second live subscription replace the first, and never
 * guesses a tier for an unrecognised price.
 *
 * Throws (rolling everything back) if Stripe cannot be read, except for
 * `resource_missing`, which is reported as a skip: that subscription does not
 * exist at Stripe, and retrying will not change that.
 */
export async function refreshSubscription(
  plan: Extract<EntitlementSyncPlan, { action: 'refresh-subscription' }>,
  deps: SyncDeps,
): Promise<RefreshOutcome> {
  const run = deps.runTransaction ?? defaultRun;
  return run((trx) => refreshSubscriptionInTransaction(trx, plan, deps));
}

/**
 * The body of `refreshSubscription`, for a caller that ALREADY holds a
 * transaction (and so the member's row lock) and must apply Stripe's current
 * state inside it - e.g. checkout, which must not start a second payment while
 * an earlier one has completed but not yet been recorded. Taking the lock again
 * in the same transaction is a no-op, so nothing can deadlock against itself.
 */
export async function refreshSubscriptionInTransaction(
  trx: Executor,
  plan: Extract<EntitlementSyncPlan, { action: 'refresh-subscription' }>,
  deps: Pick<SyncDeps, 'reader' | 'now'>,
): Promise<RefreshOutcome> {
  const now = deps.now ?? (() => new Date());
  const { priceIds } = getStripeConfig();

  return (async (): Promise<RefreshOutcome> => {
    // 1. Find and LOCK the member's row. By Stripe customer first.
    let [row] = await trx
      .select()
      .from(entitlements)
      .where(eq(entitlements.stripeCustomerId, plan.stripeCustomerId))
      .limit(1)
      .for('update');

    let linking = false;
    if (!row && plan.userId) {
      // Not linked yet (the event raced the checkout). The checkout metadata we
      // set server-side names the member - but only link a member who has no
      // Stripe customer yet; never move a member between customers.
      const [candidate] = await trx
        .select()
        .from(entitlements)
        .where(eq(entitlements.userId, plan.userId))
        .limit(1)
        .for('update');
      if (candidate) {
        if (candidate.stripeCustomerId && candidate.stripeCustomerId !== plan.stripeCustomerId) {
          return {
            status: 'skipped',
            detail: 'member is already linked to a different Stripe customer',
          };
        }
        row = candidate;
        linking = true;
      }
    }
    if (!row) {
      return {
        status: 'skipped',
        detail: `no entitlement row is linked to Stripe customer ${plan.stripeCustomerId}`,
      };
    }

    // 2. A legacy Lifetime membership is never touched by subscription sync.
    if (row.tier === 'lifetime') {
      return {
        status: 'skipped',
        detail: 'lifetime membership is protected from subscription sync',
      };
    }

    // 3. Stripe's CURRENT state, read while holding the lock.
    let subscription: Stripe.Subscription;
    try {
      subscription = await deps.reader.retrieveSubscription(plan.subscriptionId);
    } catch (error) {
      if ((error as { code?: unknown } | null)?.code === 'resource_missing') {
        return { status: 'skipped', detail: 'subscription not found at Stripe' };
      }
      throw error;
    }
    if (idOf(subscription.customer) !== plan.stripeCustomerId) {
      return { status: 'skipped', detail: 'subscription does not belong to that Stripe customer' };
    }

    // 4. A second live subscription must not replace the first.
    if (row.stripeSubscriptionId && row.stripeSubscriptionId !== subscription.id) {
      const existingIsLive = await isLiveAtStripe(row.stripeSubscriptionId, deps.reader);
      if (existingIsLive) {
        await trx
          .update(entitlements)
          .set({
            metadata: sql`jsonb_set(COALESCE(${entitlements.metadata}, '{}'::jsonb), '{duplicateStripeSubscriptions}', COALESCE(${entitlements.metadata}->'duplicateStripeSubscriptions', '[]'::jsonb) || to_jsonb(${subscription.id}::text), true)`,
            updatedAt: now(),
          })
          .where(eq(entitlements.userId, row.userId));
        console.warn('[Stripe sync] duplicate live subscription ignored; manual review needed', {
          duplicate: subscription.id,
          existing: row.stripeSubscriptionId,
        });
        return {
          status: 'skipped',
          detail: 'a different live subscription already backs this membership',
        };
      }
    }

    // 5. Map the authoritative state to the row.
    const mapped = planForSubscriptionEvent(
      {
        customerId: plan.stripeCustomerId,
        subscriptionId: subscription.id,
        status: subscription.status,
        priceId: subscription.items.data[0]?.price?.id ?? null,
        currentPeriodStart: toDate(subscription.current_period_start),
        currentPeriodEnd: toDate(subscription.current_period_end),
        cancelAtPeriodEnd: subscription.cancel_at_period_end,
        canceledAt: toDate(subscription.canceled_at),
        // Stripe's own time for the triggering event; with no triggering event
        // (a read-time refresh) the only reliable time is when we observed it.
        eventTime: plan.eventTime ?? now(),
      },
      priceIds,
    );
    if (mapped.action !== 'sync-subscription') {
      return {
        status: 'skipped',
        detail: mapped.action === 'skip' ? mapped.reason : 'not applicable',
      };
    }

    // 6. Write.
    await trx
      .update(entitlements)
      .set({
        ...(linking ? { stripeCustomerId: plan.stripeCustomerId } : {}),
        tier: mapped.values.tier,
        status: mapped.values.status,
        stripeSubscriptionId: mapped.values.stripeSubscriptionId,
        currentPeriodStart: mapped.values.currentPeriodStart,
        currentPeriodEnd: mapped.values.currentPeriodEnd,
        cancelAtPeriodEnd: mapped.values.cancelAtPeriodEnd,
        canceledAt: mapped.values.canceledAt,
        ...paymentFailedAtUpdate(mapped.values.paymentFailure),
        stripeSyncedAt: now(),
        updatedAt: now(),
      })
      .where(and(eq(entitlements.userId, row.userId)));

    return {
      status: 'synced',
      detail: `synced subscription for customer ${plan.stripeCustomerId}`,
    };
  })();
}

async function isLiveAtStripe(
  subscriptionId: string,
  reader: SubscriptionReader,
): Promise<boolean> {
  try {
    const existing = await reader.retrieveSubscription(subscriptionId);
    return LIVE_STATUSES.has(existing.status);
  } catch (error) {
    // Cannot tell whether the existing subscription is live. Assume it is: never
    // replace a possibly-live subscription on an unconfirmed answer. A missing
    // subscription, though, is definitely not live.
    return (error as { code?: unknown } | null)?.code !== 'resource_missing';
  }
}

async function applyPlan(
  plan: EntitlementSyncPlan,
  deps: SyncDeps,
): Promise<SyncStripeEntitlementResult> {
  switch (plan.action) {
    case 'skip':
      return { action: 'skip', detail: plan.reason };

    case 'refresh-subscription': {
      const outcome = await refreshSubscription(plan, deps);
      return {
        action: outcome.status === 'synced' ? 'sync-subscription' : 'skip',
        detail: outcome.detail,
      };
    }

    case 'sync-subscription':
      // Produced only by `planForSubscriptionEvent`, which this module calls
      // itself on authoritative state; an event never yields one directly.
      return { action: 'skip', detail: 'unexpected plan' };
  }
}

export { describeStripeFailure };
