/**
 * Sanity webhook endpoint for Somatic Series/Card content synchronization.
 * A parallel, separate endpoint from /api/webhooks/sanity (Practice) -
 * that route's payload schema is hardcoded to `_type: z.literal('practice')`
 * with no internal type-routing to extend, so this is a new endpoint
 * rather than a modification of it, per the prior technical audit's
 * finding. Handles create/update/delete events for `somaticSeries` and
 * `somaticCard` documents. Verifies the same proven HMAC signature
 * scheme as the Practice webhook, then syncs to PostgreSQL.
 *
 * See ./README.md for the exact Sanity dashboard webhook configuration
 * this endpoint expects (URL, events, projection, draft exclusion) -
 * not registered in production as part of this milestone.
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  SANITY_WEBHOOK_SIGNATURE_HEADER,
  sanitySomaticWebhookSchema,
  verifySanityWebhookSignature,
} from '@tnsi/cms/webhook';
import { syncSomaticSeries, syncSomaticCard, type SomaticSyncOutcome } from '@/lib/sync-somatic';

export const runtime = 'nodejs';

/**
 * Maps a sync outcome to the HTTP response - the one place this
 * endpoint's error-category-to-status mapping lives. Extends the
 * existing Practice webhook's 400 (invalid payload/signature) and 500
 * (unexpected failure) with two additions, both well-precedented HTTP
 * semantics: 503 for "not ready yet, safe to retry" (missing-series),
 * and 409 for "the request conflicts with the resource's current state"
 * (collection-mismatch, a real database constraint conflict). See
 * docs/TNSI_Somatic_Card_Sync_v1.md §9 for the full rationale.
 */
function outcomeToResponse(outcome: SomaticSyncOutcome) {
  switch (outcome.status) {
    case 'synced':
      return NextResponse.json({ success: true, ...outcome }, { status: 200 });
    case 'missing-series':
      return NextResponse.json({ error: 'Series not yet synced', ...outcome }, { status: 503 });
    case 'collection-mismatch':
      return NextResponse.json({ error: 'Collection mismatch', ...outcome }, { status: 409 });
    case 'conflict':
      return NextResponse.json({ error: 'Data conflict', ...outcome }, { status: 409 });
    case 'invalid-content':
      return NextResponse.json({ error: 'Invalid content', ...outcome }, { status: 400 });
  }
}

export async function POST(request: NextRequest) {
  const secret = process.env.SANITY_SOMATIC_WEBHOOK_SECRET;
  if (!secret) {
    console.error('[Somatic Webhook] SANITY_SOMATIC_WEBHOOK_SECRET is not set');
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

  // Rejects (400) any payload whose `_type` isn't literally `somaticSeries`
  // or `somaticCard` - a `practice`/`powerDrop`/`article`/etc. payload
  // delivered here by mistake never reaches any sync logic.
  const result = sanitySomaticWebhookSchema.safeParse(body);
  if (!result.success) {
    return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
  }

  try {
    const outcome =
      result.data._type === 'somaticSeries'
        ? await syncSomaticSeries(result.data)
        : await syncSomaticCard(result.data);

    // Structured logging only - never the raw payload (which may carry
    // full authored content) and never any secret/credential.
    console.info('[Somatic Webhook]', {
      documentType: result.data._type,
      sanityId: result.data._id,
      operation: result.data.operation,
      outcome: outcome.status,
    });

    return outcomeToResponse(outcome);
  } catch (error) {
    console.error('[Somatic Webhook] Sync failed:', error);
    return NextResponse.json({ error: 'Sync failed' }, { status: 500 });
  }
}
