/**
 * An in-memory model of the database contract `claimTrial` depends on, used by
 * the tests. It is not production code and does not replace a real Postgres
 * concurrency test; it models the semantics that matter:
 *
 *  - `trial_claims.email_key` is a PRIMARY KEY: an insert of an existing key
 *    returns false (ON CONFLICT DO NOTHING).
 *  - An uncommitted insert is invisible to other transactions' reads, but a
 *    competing INSERT of the same key BLOCKS until the first transaction
 *    commits (the competitor then conflicts) or rolls back (the competitor
 *    then succeeds) - exactly Postgres's behaviour.
 *  - A conditional UPDATE of an entitlement row is atomic.
 *  - A transaction that throws undoes all of its writes.
 *
 * Operations yield to the event loop so concurrent transactions genuinely
 * interleave.
 */
import type {
  RunTrialTransaction,
  TrialClaimRecord,
  TrialClaimTx,
  TrialEntitlementFacts,
  TrialWindow,
} from './eligibility';

type StoredClaim = TrialClaimRecord & { claimedAt: Date };

const tick = () => new Promise<void>((resolve) => setTimeout(resolve, 0));

export function createInMemoryTrialDatabase() {
  const committedClaims = new Map<string, StoredClaim>();
  const entitlements = new Map<string, TrialEntitlementFacts>();
  const pendingByKey = new Map<string, Promise<void>>();
  const hooks: { beforeStartTrial?: (userId: string) => void | Promise<void> } = {};

  const runTransaction: RunTrialTransaction = async (fn) => {
    const undo: Array<() => void> = [];
    const pendingClaims = new Map<string, StoredClaim>();
    let release!: () => void;
    const finished = new Promise<void>((resolve) => (release = resolve));

    const tx: TrialClaimTx = {
      async loadEntitlement(userId) {
        await tick();
        const row = entitlements.get(userId);
        return row ? { ...row } : null;
      },

      async findClaims(keys) {
        await tick();
        return keys.flatMap((key) => {
          const claim = committedClaims.get(key);
          return claim ? [{ emailKey: claim.emailKey, keyVersion: claim.keyVersion }] : [];
        });
      },

      async insertClaimIfAbsent(claim) {
        await tick();
        // Block while another in-flight transaction holds this key.
        while (pendingByKey.has(claim.emailKey) && !pendingClaims.has(claim.emailKey)) {
          await pendingByKey.get(claim.emailKey);
        }
        // From here to the writes below there is no await: check-and-set is atomic.
        if (committedClaims.has(claim.emailKey)) return false;
        pendingClaims.set(claim.emailKey, { ...claim });
        pendingByKey.set(claim.emailKey, finished);
        return true;
      },

      async rekeyClaim(fromKey, toKey, toVersion) {
        await tick();
        const existing = committedClaims.get(fromKey);
        if (!existing) return;
        committedClaims.delete(fromKey);
        committedClaims.set(toKey, { ...existing, emailKey: toKey, keyVersion: toVersion });
        undo.push(() => {
          committedClaims.delete(toKey);
          committedClaims.set(fromKey, existing);
        });
      },

      async startTrialIfEligible(userId: string, window: TrialWindow) {
        await hooks.beforeStartTrial?.(userId);
        await tick();
        const row = entitlements.get(userId);
        if (!row || row.tier !== 'free' || row.stripeSubscriptionId || row.trialStartedAt) {
          return false;
        }
        entitlements.set(userId, {
          ...row,
          trialStartedAt: window.startedAt,
          trialEndsAt: window.endsAt,
        });
        undo.push(() => entitlements.set(userId, row));
        return true;
      },
    };

    try {
      const result = await fn(tx);
      for (const [key, claim] of pendingClaims) committedClaims.set(key, claim);
      return result;
    } catch (error) {
      for (const step of undo.reverse()) step();
      throw error;
    } finally {
      for (const key of pendingClaims.keys()) pendingByKey.delete(key);
      release();
    }
  };

  return {
    runTransaction,
    hooks,
    seedEntitlement(userId: string, facts: Partial<TrialEntitlementFacts> = {}) {
      entitlements.set(userId, {
        tier: 'free',
        stripeSubscriptionId: null,
        trialStartedAt: null,
        trialEndsAt: null,
        ...facts,
      });
    },
    entitlement: (userId: string) => entitlements.get(userId),
    claims: () => [...committedClaims.values()],
  };
}
