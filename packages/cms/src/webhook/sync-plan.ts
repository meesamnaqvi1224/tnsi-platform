import type { PracticeContentType, SanityPracticeWebhookPayload } from './schema';

const DRAFT_PREFIX = 'drafts.';

/** `drafts.<id>` → `<id>`; `<id>` stays `<id>`. Never strips anything else. */
export function normalizeSanityId(id: string): string {
  return id.startsWith(DRAFT_PREFIX) ? id.slice(DRAFT_PREFIX.length) : id;
}

export interface PracticeUpsertValues {
  sanityId: string;
  title: string;
  description: string | null;
  contentType: PracticeContentType;
  mediaUrl: string | null;
  thumbnailUrl: string | null;
  durationSeconds: number | null;
  category: string | null;
  tags: string[];
  difficulty: number;
  sanityData: Record<string, unknown>;
  isPublished: true;
}

export type PracticeSyncPlan =
  | { action: 'upsert'; sanityId: string; values: PracticeUpsertValues }
  | { action: 'deactivate'; sanityId: string };

/**
 * Decides what a Sanity `practice` webhook event should do to Postgres —
 * pure and deterministic, no database access. `apps/web/src/lib/sync-practice.ts`
 * executes the plan this returns.
 *
 * Never produces a "delete" plan: `practice_completions.practiceId` cascades
 * on delete, so a hard delete here would silently destroy member completion
 * history (see the C7.4.1 audit). Delete and unpublish both become
 * `deactivate` (`isPublished = false`), which is idempotent and preserves
 * the row.
 *
 * Defensive by design: even though the webhook should be configured to
 * exclude drafts, this never assumes a document is published solely
 * because an event reached the endpoint — it checks `document.status`
 * itself and treats anything other than `'published'` as a deactivation,
 * same as a delete.
 */
export function buildPracticeSyncPlan(event: SanityPracticeWebhookPayload): PracticeSyncPlan {
  const sanityId = normalizeSanityId(event._id);
  const doc = event.document;

  const shouldDeactivate = event.operation === 'delete' || !doc || doc.status !== 'published';

  if (shouldDeactivate) {
    return { action: 'deactivate', sanityId };
  }

  return {
    action: 'upsert',
    sanityId,
    values: {
      sanityId,
      title: doc.title,
      description: doc.description ?? null,
      contentType: doc.contentType,
      mediaUrl: doc.mediaUrl ?? null,
      thumbnailUrl: doc.thumbnailUrl ?? null,
      durationSeconds: doc.durationSeconds ?? null,
      category: doc.category ?? null,
      tags: doc.tags ?? [],
      difficulty: doc.difficulty ?? 1,
      sanityData: doc,
      isPublished: true,
    },
  };
}
