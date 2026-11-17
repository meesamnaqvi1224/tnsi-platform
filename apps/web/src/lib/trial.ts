import { and, eq, inArray, isNull } from 'drizzle-orm';
import { db, entitlements, trialClaims, type DB } from '@tnsi/db';
import type {
  RunTrialTransaction,
  TrialClaimTx,
  TrialEntitlementFacts,
} from '@tnsi/auth/trial/eligibility';

/** The transaction handle drizzle passes to `db.transaction`'s callback. */
type Executor = Parameters<Parameters<DB['transaction']>[0]>[0];

/**
 * The real database implementation of the `TrialClaimTx` contract that
 * `claimTrial` (@tnsi/auth) is written against. Each method is one statement;
 * atomicity comes from running them all inside a single `db.transaction`.
 *
 * The statements that make the policy safe:
 *  - `loadEntitlement` takes a row lock (`FOR UPDATE`), so two requests for the
 *    same account serialise here;
 *  - `insertClaimIfAbsent` is `INSERT ... ON CONFLICT (email_key) DO NOTHING`
 *    against the table's primary key - the database, not application code,
 *    decides which of two simultaneous claims for one email wins;
 *  - `startTrialIfEligible` is a conditional UPDATE that only matches a Free
 *    account that has never had a trial or a Stripe subscription.
 *
 * Never logs or returns an email address or an email key.
 */
export function createTrialClaimTx(trx: Executor): TrialClaimTx {
  return {
    async loadEntitlement(userId): Promise<TrialEntitlementFacts | null> {
      const rows = await trx
        .select({
          tier: entitlements.tier,
          stripeSubscriptionId: entitlements.stripeSubscriptionId,
          trialStartedAt: entitlements.trialStartedAt,
          trialEndsAt: entitlements.trialEndsAt,
        })
        .from(entitlements)
        .where(eq(entitlements.userId, userId))
        .limit(1)
        .for('update');
      return rows[0] ?? null;
    },

    async findClaims(emailKeys) {
      if (emailKeys.length === 0) return [];
      return trx
        .select({ emailKey: trialClaims.emailKey, keyVersion: trialClaims.keyVersion })
        .from(trialClaims)
        .where(inArray(trialClaims.emailKey, emailKeys));
    },

    async insertClaimIfAbsent(claim) {
      const inserted = await trx
        .insert(trialClaims)
        .values({
          emailKey: claim.emailKey,
          keyVersion: claim.keyVersion,
          userId: claim.userId,
          claimedAt: claim.claimedAt,
          trialEndsAt: claim.trialEndsAt,
        })
        .onConflictDoNothing({ target: trialClaims.emailKey })
        .returning({ emailKey: trialClaims.emailKey });
      return inserted.length > 0;
    },

    async rekeyClaim(fromKey, toKey, toVersion) {
      const alreadyThere = await trx
        .select({ emailKey: trialClaims.emailKey })
        .from(trialClaims)
        .where(eq(trialClaims.emailKey, toKey))
        .limit(1);
      if (alreadyThere.length > 0) {
        // The person already has a claim under the current key; the old-version
        // row is redundant. (A plain UPDATE would hit the primary key.)
        await trx.delete(trialClaims).where(eq(trialClaims.emailKey, fromKey));
        return;
      }
      await trx
        .update(trialClaims)
        .set({ emailKey: toKey, keyVersion: toVersion })
        .where(eq(trialClaims.emailKey, fromKey));
    },

    async startTrialIfEligible(userId, window) {
      const updated = await trx
        .update(entitlements)
        .set({
          trialStartedAt: window.startedAt,
          trialEndsAt: window.endsAt,
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(entitlements.userId, userId),
            eq(entitlements.tier, 'free'),
            isNull(entitlements.trialStartedAt),
            isNull(entitlements.trialEndsAt),
            isNull(entitlements.stripeSubscriptionId),
          ),
        )
        .returning({ userId: entitlements.userId });
      return updated.length > 0;
    },
  };
}

/** Runs `fn` in one real database transaction: commits on return, rolls everything back on a throw. */
export const runTrialTransaction: RunTrialTransaction = (fn) =>
  db.transaction((trx) => fn(createTrialClaimTx(trx)));
