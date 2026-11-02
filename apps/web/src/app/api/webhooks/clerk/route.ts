/**
 * Clerk webhook endpoint for user synchronization.
 * Handles user.created, user.updated, user.deleted events.
 * Verifies webhook signatures and syncs to PostgreSQL.
 */

import { after, NextRequest, NextResponse } from 'next/server';
import { syncClerkUser } from '@tnsi/auth/sync/user';

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
    if (result.action === 'user.created') {
      after(async () => {
        try {
          const { processOutbox } = await import('@/lib/crm-outbox');
          await processOutbox({ budgetMs: 8000 });
        } catch {
          console.error('[Clerk Webhook] CRM send failed');
        }
      });
    }

    return NextResponse.json({ success: true, action: result.action });
  } catch (error) {
    console.error('[Clerk Webhook] Error:', error);

    // Return 400 for verification failures, 500 for other errors
    const status =
      error instanceof Error && error.name === 'WebhookVerificationFailedError' ? 400 : 500;
    const message = error instanceof Error ? error.message : 'Webhook processing failed';

    return NextResponse.json({ error: message }, { status });
  }
}
