import {
  needsStripeReconciliation,
  type EntitlementRecord,
} from '@tnsi/auth/authorize/entitlements';
import { classifyStripeFailure, describeStripeFailure } from '@tnsi/integrations';
import {
  readTimeSubscriptionReader,
  refreshSubscription,
  type SubscriptionReader,
  type SyncDeps,
} from './sync-stripe-entitlement';

/**
 * Read-time Stripe reconciliation for a Stripe-backed membership whose
 * paid-through date has passed but whose renewal has not been confirmed (the
 * row still says `active`, e.g. a renewal webhook is delayed).
 *
 * What each outcome means for access (the rules live in `resolveMembership`):
 *  - `not_needed`  nothing to confirm: the row is not an unconfirmed renewal.
 *  - `refreshed`   Stripe ANSWERED and the row was updated from its current
 *                  state. That state decides access immediately - confirmed
 *                  renewal, confirmed cancellation, whatever it says. No grace
 *                  period of any kind is added.
 *  - `recent`      refreshed within the last minute and still not confirmed
 *                  (Stripe's answer stands); Stripe is not asked again.
 *  - `unreachable` an attempt was made and Stripe was genuinely unavailable (a
 *                  connection failure, a Stripe-side error, or throttling).
 *                  ONLY this lets access be held - until seven days after a
 *                  valid paid-through date, and never without one.
 *  - `failed`      Stripe answered with an error that is not an outage, or the
 *                  subscription could not be confirmed (bad API key,
 *                  `resource_missing`, unrecognised price, wrong customer, a
 *                  database error). Never an outage: no access is held.
 *
 * Calls to Stripe are kept to a minimum: only when `needsStripeReconciliation`
 * says so, never more than once a minute per subscription, concurrent calls for
 * one subscription share a single request, and a confirmed outage is
 * remembered briefly so a burst of requests does not each wait out a timeout.
 */
export type ReconcileOutcome =
  | { status: 'not_needed' }
  | { status: 'refreshed' }
  | { status: 'recent' }
  | { status: 'unreachable' }
  | { status: 'failed' };

export interface ReconcileInput {
  userId: string;
  record: EntitlementRecord & {
    stripeCustomerId?: string | null;
    stripeSyncedAt?: Date | null;
  };
}

export interface ReconcileDeps {
  reader?: SubscriptionReader;
  runTransaction?: SyncDeps['runTransaction'];
  now?: () => Date;
}

/** Do not ask Stripe about the same subscription more often than this. */
export const RECONCILE_MIN_INTERVAL_MS = 60_000;
/** Remember a confirmed outage this long, so a burst of requests does not each retry. */
export const UNREACHABLE_MEMORY_MS = 15_000;

const inFlight = new Map<string, Promise<ReconcileOutcome>>();
const unreachableUntil = new Map<string, number>();

/** Test hook: forget remembered outages and in-flight calls. */
export function resetReconcileState(): void {
  inFlight.clear();
  unreachableUntil.clear();
}

export async function reconcileMembership(
  input: ReconcileInput,
  deps: ReconcileDeps = {},
): Promise<ReconcileOutcome> {
  const now = (deps.now ?? (() => new Date()))();
  const { record } = input;

  const subscriptionId = record.stripeSubscriptionId;
  const customerId = record.stripeCustomerId;
  if (!subscriptionId || !customerId || !needsStripeReconciliation(record, now)) {
    return { status: 'not_needed' };
  }

  if (
    record.stripeSyncedAt &&
    now.getTime() - record.stripeSyncedAt.getTime() < RECONCILE_MIN_INTERVAL_MS
  ) {
    return { status: 'recent' };
  }

  const remembered = unreachableUntil.get(subscriptionId);
  if (remembered !== undefined) {
    if (now.getTime() < remembered) return { status: 'unreachable' };
    unreachableUntil.delete(subscriptionId);
  }

  const existing = inFlight.get(subscriptionId);
  if (existing) return existing;

  const attempt = (async (): Promise<ReconcileOutcome> => {
    try {
      const outcome = await refreshSubscription(
        {
          action: 'refresh-subscription',
          subscriptionId,
          stripeCustomerId: customerId,
          userId: null,
          eventTime: null,
        },
        {
          reader: deps.reader ?? readTimeSubscriptionReader,
          runTransaction: deps.runTransaction,
          now: deps.now,
        },
      );
      return outcome.status === 'synced' ? { status: 'refreshed' } : { status: 'failed' };
    } catch (error) {
      if (classifyStripeFailure(error) === 'unavailable') {
        unreachableUntil.set(subscriptionId, now.getTime() + UNREACHABLE_MEMORY_MS);
        return { status: 'unreachable' };
      }
      console.error('[reconcile] could not confirm subscription:', describeStripeFailure(error));
      return { status: 'failed' };
    } finally {
      inFlight.delete(subscriptionId);
    }
  })();

  inFlight.set(subscriptionId, attempt);
  return attempt;
}
