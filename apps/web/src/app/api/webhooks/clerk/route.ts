/**
 * Clerk webhook endpoint for user synchronization.
 * Handles user.created, user.updated, user.deleted events.
 * Verifies webhook signatures and syncs to PostgreSQL.
 */

import { after, NextRequest, NextResponse } from 'next/server';
import { syncClerkUser } from '@tnsi/auth/sync/user';
import { safeErrorCode } from '@/lib/private-response';

/** Room for the after-response CRM send below (a few seconds of Flowi calls). */
export const maxDuration = 30;

/**
 * POST /api/webhooks/clerk
 * Handles Clerk webhook events for user lifecycle.
 *
 * Expected events:
 * - user.created: Create user in PostgreSQL + default entitlements
 * - user.updated: Update user in PostgreSQL
 * - user.deleted: Soft delete user in PostgreSQL
 */
export async function POST(request: NextRequest) {
  try {
    // Load database-backed operations only when handling a request, not at build time.
    const { userSyncOps } = await import('@/lib/user-sync-ops');
    // Get raw body as text for signature verification
    const payload = await request.text();

    // Extract svix headers
    const headers: Record<string, string | undefined> = {};
    request.headers.forEach((value, key) => {
      headers[key] = value;
    });

    // Sync user to PostgreSQL (verifies signature internally)
    const result = await syncClerkUser(payload, headers, userSyncOps);

    console.info('[Clerk Webhook]', {
      action: result.action,
      userId: result.userId,
    });

    // A new account has just been queued for the CRM (see user-sync-ops.ts). Send it
    // once the response has gone, so the welcome email follows sign-up within a minute
    // or two instead of waiting for the daily worker. Best effort: anything that does
    // not go is retried by the worker.
    // A new account queues its CRM sign-up; a deleted one queues the CRM contact's deletion
    // (softDeleteUser). Either way, send what is queued now rather than waiting for the daily worker.
    if (result.action === 'user.created' || result.action === 'user.deleted') {
      // Best-effort: the event is already processed and stored. If the follow-up cannot even be
      // scheduled, the queued job is simply left for the worker - it must never turn a processed
      // event into an error (Clerk would then retry a deletion that has already happened).
      try {
        after(async () => {
          try {
            const { processOutbox } = await import('@/lib/crm-outbox');
            await processOutbox({ budgetMs: 8000 });
          } catch {
            console.error('[Clerk Webhook] CRM send failed');
          }
        });
      } catch {
        /* left for the worker */
      }
    }

    return NextResponse.json({ success: true, action: result.action });
  } catch (error) {
    // Never log or return the error object or its message: for a database failure it can carry the
    // statement, and `user.deleted` now also purges a member's journal in the same transaction. A short
    // label and code is enough to diagnose; Clerk retries any non-2xx.
    const verification = error instanceof Error && error.name === 'WebhookVerificationFailedError';
    console.error('[Clerk Webhook] failed', {
      kind: verification ? 'verification' : 'processing',
      code: safeErrorCode(error),
    });

    // 400 for a failed signature check, 500 for anything else; neither echoes what went wrong.
    return NextResponse.json(
      {
        error: verification ? 'Webhook signature verification failed' : 'Webhook processing failed',
      },
      { status: verification ? 400 : 500 },
    );
  }
}
