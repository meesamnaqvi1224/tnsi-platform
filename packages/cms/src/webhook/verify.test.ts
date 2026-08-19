import { createHmac } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { SANITY_WEBHOOK_SIGNATURE_HEADER, verifySanityWebhookSignature } from './verify';

const SECRET = 'test-secret';

function sign(body: string, timestamp: string, secret = SECRET): string {
  const digest = createHmac('sha256', secret)
    .update(`${timestamp}.${body}`)
    .digest('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
  return `t=${timestamp},v1=${digest}`;
}

describe('verifySanityWebhookSignature', () => {
  it('accepts a correctly signed body', () => {
    const body = JSON.stringify({ _id: 'practice.a', _type: 'practice' });
    const header = sign(body, '1700000000');
    expect(verifySanityWebhookSignature(body, header, SECRET)).toBe(true);
  });

  it('rejects a body that does not match the signature', () => {
    const header = sign('{"_id":"a"}', '1700000000');
    expect(verifySanityWebhookSignature('{"_id":"b"}', header, SECRET)).toBe(false);
  });

  it('rejects a signature produced with the wrong secret', () => {
    const body = '{"_id":"practice.a"}';
    const header = sign(body, '1700000000', 'wrong-secret');
    expect(verifySanityWebhookSignature(body, header, SECRET)).toBe(false);
  });

  it('rejects a missing header', () => {
    expect(verifySanityWebhookSignature('{}', null, SECRET)).toBe(false);
    expect(verifySanityWebhookSignature('{}', undefined, SECRET)).toBe(false);
  });

  it('rejects a malformed header', () => {
    expect(verifySanityWebhookSignature('{}', 'not-a-valid-header', SECRET)).toBe(false);
    expect(verifySanityWebhookSignature('{}', 't=123', SECRET)).toBe(false);
  });

  it('rejects when no secret is configured', () => {
    const body = '{}';
    const header = sign(body, '1700000000');
    expect(verifySanityWebhookSignature(body, header, '')).toBe(false);
  });

  it('exposes the expected header name', () => {
    expect(SANITY_WEBHOOK_SIGNATURE_HEADER).toBe('sanity-webhook-signature');
  });
});
