/**
 * Sanity webhook endpoint for practice content synchronization.
 * Handles create/update/delete events for `practice` documents.
 * Verifies the HMAC signature and syncs to PostgreSQL.
 *
 * See ./README.md for the exact Sanity dashboard webhook configuration
 * this endpoint expects (URL, events, projection, draft exclusion).
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  SANITY_WEBHOOK_SIGNATURE_HEADER,
  sanityPracticeWebhookSchema,
  verifySanityWebhookSignature,
} from '@tnsi/cms/webhook';
import { syncPractice } from '@/lib/sync-practice';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  const secret = process.env.SANITY_WEBHOOK_SECRET;
  if (!secret) {
    console.error('[Sanity Webhook] SANITY_WEBHOOK_SECRET is not set');
    return NextResponse.json({ error: 'Webhook not configured' }, { status: 500 });
  }

  const rawBody = await request.text();
  const signatureHeader = request.headers.get(SANITY_WEBHOOK_SIGNATURE_HEADER);

  if (!verifySanityWebhookSignature(rawBody, signatureHeader, secret)) {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  }

  let body: unknown;
  try {
    body = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const result = sanityPracticeWebhookSchema.safeParse(body);
  if (!result.success) {
    return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
  }

  try {
    const outcome = await syncPractice(result.data);
    console.info('[Sanity Webhook]', outcome);
    return NextResponse.json({ success: true, ...outcome });
  } catch (error) {
    console.error('[Sanity Webhook] Sync failed:', error);
    return NextResponse.json({ error: 'Sync failed' }, { status: 500 });
  }
}
