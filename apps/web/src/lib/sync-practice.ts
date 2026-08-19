import { db, practices } from '@tnsi/db';
import { eq } from 'drizzle-orm';
import { buildPracticeSyncPlan, type SanityPracticeWebhookPayload } from '@tnsi/cms/webhook';

export interface SyncPracticeResult {
  sanityId: string;
  action: 'upserted' | 'deactivated';
}

/**
 * Executes a Sanity `practice` webhook event against Postgres. The
 * decision logic — what to write, upsert vs. deactivate — is pure and
 * lives in `@tnsi/cms` (`buildPracticeSyncPlan`); this function only
 * performs the actual database write. Kept intentionally thin and not
 * unit-tested directly (this repo has no DB-integration test setup) —
 * what's tested is the plan this executes.
 *
 * The upsert is a single atomic `INSERT ... ON CONFLICT (sanity_id) DO
 * UPDATE`, keyed on the existing unique constraint — idempotent by
 * construction, no select-then-branch race window. Deactivation never
 * deletes the row (`practice_completions.practiceId` cascades on delete
 * and would destroy member completion history) — it only flips
 * `isPublished`, which is a no-op if the row doesn't exist yet.
 */
export async function syncPractice(
  event: SanityPracticeWebhookPayload,
): Promise<SyncPracticeResult> {
  const plan = buildPracticeSyncPlan(event);

  if (plan.action === 'deactivate') {
    await db
      .update(practices)
      .set({ isPublished: false, updatedAt: new Date() })
      .where(eq(practices.sanityId, plan.sanityId));
    return { sanityId: plan.sanityId, action: 'deactivated' };
  }

  const values = { ...plan.values, updatedAt: new Date() };

  await db
    .insert(practices)
    .values(values)
    .onConflictDoUpdate({ target: practices.sanityId, set: values });

  return { sanityId: plan.sanityId, action: 'upserted' };
}
