/**
 * Sanity webhook endpoint for practice content synchronization.
 * Handles create/update/delete events for `practice` documents.
 * Verifies the HMAC signature and syncs to PostgreSQL.
 *
 * See ./README.md for the exact Sanity dashboard webhook configuration
 * this endpoint expects (URL, events, projection, draft exclusion).
 */

import { createHmac } from 'node:crypto';
import { NextRequest, NextResponse } from 'next/server';
import {
  SANITY_WEBHOOK_SIGNATURE_HEADER,
  sanityPracticeWebhookSchema,
  verifySanityWebhookSignature,
} from '@tnsi/cms/webhook';
import { syncPractice } from '@/lib/sync-practice';

export const runtime = 'nodejs';

/**
 * Temporary diagnostic logging (see repo history for removal once the
 * repeated 400s from the live Sanity webhook are root-caused). Mirrors the
 * parsing/HMAC logic in @tnsi/cms's verifySanityWebhookSignature purely to
 * log what differed — never used to make the accept/reject decision, which
 * remains entirely verifySanityWebhookSignature's, unchanged. Logging a
 * computed/received HMAC digest is safe: an HMAC output reveals nothing
 * about the key that produced it.
 */
function base64UrlEncodeForLogging(buffer: Buffer): string {
  return buffer.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function parseSignatureHeaderForLogging(
  header: string,
): { timestamp: string; signature: string } | null {
  let timestamp: string | undefined;
  let signature: string | undefined;
  for (const part of header.split(',')) {
    const [key, value] = part.split('=');
    if (key === 't') timestamp = value;
    if (key === 'v1') signature = value;
  }
  if (!timestamp || !signature) return null;
  return { timestamp, signature };
}

export async function POST(request: NextRequest) {
  const secret = process.env.SANITY_WEBHOOK_SECRET;
  if (!secret) {
    console.error('[Sanity Webhook] SANITY_WEBHOOK_SECRET is not set');
    return NextResponse.json({ error: 'Webhook not configured' }, { status: 500 });
  }

  const rawBody = await request.text();
  const signatureHeader = request.headers.get(SANITY_WEBHOOK_SIGNATURE_HEADER);

  if (!verifySanityWebhookSignature(rawBody, signatureHeader, secret)) {
    const parsed = signatureHeader ? parseSignatureHeaderForLogging(signatureHeader) : null;
    console.error('[Sanity Webhook] Signature verification failed', {
      headerPresent: Boolean(signatureHeader),
      headerParsed: Boolean(parsed),
      receivedTimestamp: parsed?.timestamp ?? null,
      receivedSignature: parsed?.signature ?? null,
      expectedSignature: parsed
        ? base64UrlEncodeForLogging(
            createHmac('sha256', secret).update(`${parsed.timestamp}.${rawBody}`).digest(),
          )
        : null,
      rawBodyLength: rawBody.length,
      rawBodyPreview: rawBody.slice(0, 200),
    });
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  }

  let body: unknown;
  try {
    body = JSON.parse(rawBody);
  } catch (error) {
    console.error('[Sanity Webhook] Invalid JSON body', {
      rawBodyPreview: rawBody.slice(0, 200),
      error: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const result = sanityPracticeWebhookSchema.safeParse(body);
  if (!result.success) {
    // JSON.stringify rather than passing the object directly to console.error:
    // Node's default object formatting truncates nested arrays/objects past a
    // shallow depth (they print as "[Array]"), which is exactly the detail
    // needed here (the actual received value and Zod's message for it).
    console.error(
      '[Sanity Webhook] Invalid payload',
      JSON.stringify({
        issues: result.error.flatten(),
        receivedBody: body,
      }),
    );
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
