import { randomUUID } from 'node:crypto';
import { eq } from 'drizzle-orm';
import { db, entitlements, type DB } from '@tnsi/db';
import { resolveMembership } from '@tnsi/auth/authorize/entitlements';
import {
  CHECKOUT_RECONCILIATION_LOOKBACK_MS,
  createCheckoutSession,
  ensureStripeCustomer,
  liveCheckoutSessionGateway,
  type CheckoutSessionGateway,
  type CheckoutSessionInfo,
  type PurchasableTier,
} from '@tnsi/integrations';
import {
  readTimeSubscriptionReader,
  refreshSubscriptionInTransaction,
  type SubscriptionReader,
} from './sync-stripe-entitlement';

type Executor = Parameters<Parameters<DB['transaction']>[0]>[0];
type RunTransaction = <T>(fn: (trx: Executor) => Promise<T>) => Promise<T>;

export interface CheckoutDeps {
  ensureCustomer: typeof ensureStripeCustomer;
  createSession: typeof createCheckoutSession;
  sessions: CheckoutSessionGateway;
  reader: SubscriptionReader;
  runTransaction?: RunTransaction;
  now?: () => Date;
}

export const liveCheckoutDeps: CheckoutDeps = {
  ensureCustomer: ensureStripeCustomer,
  createSession: createCheckoutSession,
  sessions: liveCheckoutSessionGateway,
  reader: readTimeSubscriptionReader,
};

export type StartCheckoutResult =
  | { status: 'created'; url: string }
  /** An open session for the SAME plan already existed; the member is sent back to it. */
  | { status: 'reused'; url: string }
  | { status: 'already_a_member' }
  /** An earlier checkout was completed but its payment is not confirmed yet; no second one is started. */
  | { status: 'checkout_in_progress' }
  /** A second live subscription was flagged for this member; no further checkout until a person resolves it. */
  | { status: 'review_required' }
  | { status: 'no_account' };

const isOurs = (s: CheckoutSessionInfo, userId: string) =>
  s.mode === 'subscription' && s.userId === userId;

/**
 * Starts a paid Checkout for the member, so that a member can never end up with
 * two payable checkouts or two paid subscriptions.
 *
 * Everything runs in ONE transaction holding the member's entitlement row lock
 * (`SELECT ... FOR UPDATE`), so simultaneous requests for one member are
 * serialised. Under that lock, using Stripe as the source of truth (not a
 * client flag, not a time window):
 *  1. A member who already holds PAID access is refused. The app-managed free
 *     trial is not a subscription, so a trial member may buy at any time.
 *  2. A checkout the member COMPLETED recently but that the webhook has not
 *     recorded yet is applied now (Stripe's current subscription state, same
 *     code the webhook uses). If that makes them a paid member they are
 *     refused; if its payment is still pending (asynchronous method) no second
 *     checkout is started.
 *  3. Open sessions are enumerated. An open session for the SAME plan is
 *     handed back (reuse). Open sessions for ANY OTHER plan are expired first,
 *     so at most one payable session exists at a time; if one of them turns
 *     out to have just been completed, nothing new is started.
 *  4. Only then is a new session created.
 * The member's Stripe customer is created once and saved before the lock is
 * released. If Stripe cannot be read, the request FAILS (nothing is created):
 * we never start a purchase while unsure whether another exists.
 *
 * This only ever starts an explicit, charged-from-the-start subscription. It
 * has no trial, and nothing here is reachable from the free-trial path.
 * A legacy Lifetime row holds paid access forever, so it is refused in step 1
 * and never reaches Stripe; subscription sync also never writes it.
 */
export async function startCheckout(
  input: {
    userId: string;
    userEmail: string;
    tier: PurchasableTier;
    successUrl: string;
    cancelUrl: string;
  },
  deps: CheckoutDeps = liveCheckoutDeps,
): Promise<StartCheckoutResult> {
  const run: RunTransaction = deps.runTransaction ?? ((fn) => db.transaction((trx) => fn(trx)));
  const now = (deps.now ?? (() => new Date()))();

  return run(async (trx): Promise<StartCheckoutResult> => {
    const lockRow = async () => {
      const [r] = await trx
        .select()
        .from(entitlements)
        .where(eq(entitlements.userId, input.userId))
        .limit(1)
        .for('update');
      return r;
    };
    const holdsPaidAccess = (r: NonNullable<Awaited<ReturnType<typeof lockRow>>>) => {
      const membership = resolveMembership(r, now);
      return membership.hasPaidAccess && !(r.tier === 'free' && membership.state === 'trialing');
    };

    const row = await lockRow();
    if (!row) return { status: 'no_account' };
    if (holdsPaidAccess(row)) return { status: 'already_a_member' };

    // A second live subscription was flagged for manual review (see
    // `refreshSubscription`). Nothing is cancelled automatically; further
    // checkout is simply paused until a person has resolved it.
    const flagged = (row.metadata as Record<string, unknown> | null)?.duplicateStripeSubscriptions;
    if (Array.isArray(flagged) && flagged.length > 0) return { status: 'review_required' };

    let stripeCustomerId = row.stripeCustomerId;
    if (!stripeCustomerId) {
      stripeCustomerId = await deps.ensureCustomer({
        userId: input.userId,
        userEmail: input.userEmail,
      });
      await trx
        .update(entitlements)
        .set({ stripeCustomerId, updatedAt: now })
        .where(eq(entitlements.userId, input.userId));
    } else {
      // The member has a Stripe customer, so an earlier checkout may exist.

      // Applies a COMPLETED, paid session's subscription now (Stripe's current
      // state, the same locked code the webhook uses) and reports whether the
      // member now holds paid access.
      const recordCompleted = async (session: CheckoutSessionInfo) => {
        if (session.subscriptionId && session.subscriptionId !== row.stripeSubscriptionId) {
          await refreshSubscriptionInTransaction(
            trx,
            {
              action: 'refresh-subscription',
              subscriptionId: session.subscriptionId,
              stripeCustomerId: stripeCustomerId!,
              userId: input.userId,
              eventTime: null,
            },
            { reader: deps.reader, now: () => now },
          );
        }
        const refreshed = await lockRow();
        return Boolean(refreshed && holdsPaidAccess(refreshed));
      };

      const cutoff = now.getTime() - CHECKOUT_RECONCILIATION_LOOKBACK_MS;
      const completed = (await deps.sessions.listComplete(stripeCustomerId)).filter(
        (s) => isOurs(s, input.userId) && s.createdAt.getTime() >= cutoff,
      );
      const latest = completed[0]; // newest first
      if (latest) {
        if (latest.paymentStatus === 'unpaid') return { status: 'checkout_in_progress' };
        if (await recordCompleted(latest)) return { status: 'already_a_member' };
      }

      const open = (await deps.sessions.listOpen(stripeCustomerId)).filter(
        (s) => isOurs(s, input.userId) && s.url,
      );
      const reusable = open.find((s) => s.tier === input.tier);
      for (const other of open) {
        if (other === reusable) continue;
        // Re-read the session itself before touching it: the list may be stale.
        // Only a session Stripe confirms is still open AND unpaid is ever expired.
        const current = await deps.sessions.retrieve(other.id);
        let raced = current.status === 'complete' || current.paymentStatus === 'paid';
        if (!raced && current.status === 'open') {
          try {
            await deps.sessions.expire(other.id);
          } catch (error) {
            // Most likely the member completed it between the read and the
            // expiry. Re-read: if it is not simply expired, fail closed.
            const after = await deps.sessions.retrieve(other.id).catch(() => null);
            if (after?.status === 'complete') {
              raced = true;
              Object.assign(current, after);
            } else if (after?.status !== 'expired') {
              throw error;
            }
          }
        }
        if (raced) {
          // The earlier purchase went through. Record it before anything else is
          // allowed; if it still is not confirmed, start nothing new.
          if (current.paymentStatus !== 'unpaid' && (await recordCompleted(current))) {
            return { status: 'already_a_member' };
          }
          return { status: 'checkout_in_progress' };
        }
      }
      if (reusable?.url) return { status: 'reused', url: reusable.url };
    }

    const { url } = await deps.createSession({
      tier: input.tier,
      userId: input.userId,
      stripeCustomerId,
      // A fresh key per real creation: the open-session check above (under the
      // lock) is what prevents duplicates; a time-bucketed key could hand back a
      // session this same flow had just expired.
      idempotencyKey: `tnsi-checkout:${input.userId}:${randomUUID()}`,
      successUrl: input.successUrl,
      cancelUrl: input.cancelUrl,
    });
    return { status: 'created', url };
  });
}
