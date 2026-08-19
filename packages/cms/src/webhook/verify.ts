import { createHmac, timingSafeEqual } from 'node:crypto';

/**
 * Sanity signs webhook requests as `t=<unix-ts>,v1=<base64url-hmac>` over
 * `${timestamp}.${rawBody}` (HMAC-SHA256), sent in this header. No new
 * dependency needed — Node's built-in `crypto` covers it, same as Node
 * would for any Stripe-style signature scheme.
 */
export const SANITY_WEBHOOK_SIGNATURE_HEADER = 'sanity-webhook-signature';

function base64UrlEncode(buffer: Buffer): string {
  return buffer.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function parseSignatureHeader(header: string): { timestamp: string; signature: string } | null {
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

/**
 * Verifies a Sanity webhook request signature. Pure and synchronous — no
 * I/O, no Sanity API call. Returns `false` for any malformed/missing
 * header rather than throwing, so callers can treat "invalid signature" as
 * one uniform case.
 */
export function verifySanityWebhookSignature(
  rawBody: string,
  signatureHeader: string | null | undefined,
  secret: string,
): boolean {
  if (!signatureHeader || !secret) return false;

  const parsed = parseSignatureHeader(signatureHeader);
  if (!parsed) return false;

  const expected = base64UrlEncode(
    createHmac('sha256', secret).update(`${parsed.timestamp}.${rawBody}`).digest(),
  );

  const expectedBuffer = Buffer.from(expected);
  const actualBuffer = Buffer.from(parsed.signature);

  if (expectedBuffer.length !== actualBuffer.length) return false;
  return timingSafeEqual(expectedBuffer, actualBuffer);
}
