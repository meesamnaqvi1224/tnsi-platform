import { beforeEach, describe, expect, it, vi } from 'vitest';

/** Abuse handling on the contact form. The database and CRM are fakes. */
const state = vi.hoisted(() => ({ counts: [0, 0] as number[], calls: 0 }));

vi.mock('@tnsi/db', () => ({
  crmOutbox: { kind: 'kind', email: 'email', createdAt: 'created_at' },
  db: (() => {
    const self = {
      execute: async () => undefined,
      select: () => ({
        from: () => ({ where: async () => [{ n: state.counts[state.calls++] ?? 0 }] }),
      }),
      transaction: async (fn: (t: unknown) => unknown) => fn(self),
    };
    return self;
  })(),
}));
const enqueue = vi.fn();
const attempt = vi.fn();
vi.mock('@/lib/crm-outbox', async () => {
  const actual = await vi.importActual<typeof import('@/lib/crm-outbox')>('@/lib/crm-outbox');
  return {
    ...actual,
    enqueueCrmEvent: (...a: unknown[]) => enqueue(...a),
    attemptNow: (...a: unknown[]) => attempt(...a),
  };
});

const { POST } = await import('./route');

const valid = {
  name: 'Ada Lovelace',
  email: 'ada@example.test',
  subject: 'Enquiry',
  message: 'Hello, I would like to know more.',
};
const post = (body: unknown, headers: Record<string, string> = {}) =>
  POST(
    new Request('http://x/api/contact', {
      method: 'POST',
      headers: { 'content-type': 'application/json', host: 'site.test', ...headers },
      body: JSON.stringify(body),
    }),
  );

beforeEach(() => {
  state.counts = [0, 0];
  state.calls = 0;
  enqueue.mockReset().mockResolvedValue('row-1');
  attempt.mockReset().mockResolvedValue({ ok: true, isNew: true });
});

describe('POST /api/contact — abuse handling', () => {
  it('still accepts a normal submission (and one from the same site)', async () => {
    const res = await post(valid, { origin: 'https://site.test' });
    expect(res.status).toBe(200);
    expect(enqueue).toHaveBeenCalledTimes(1);
  });

  it('refuses a cross-site request without storing anything', async () => {
    const res = await post(valid, { origin: 'https://evil.test' });
    expect(res.status).toBe(403);
    expect(enqueue).not.toHaveBeenCalled();
  });

  it('answers a honeypot submission as if it worked, but stores and sends nothing', async () => {
    const res = await post({ ...valid, website: 'http://spam.test' });
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ submitted: true });
    expect(enqueue).not.toHaveBeenCalled();
    expect(attempt).not.toHaveBeenCalled();
  });

  it('returns 429 with Retry-After for a repeated submitter, storing nothing', async () => {
    state.counts = [5, 0];
    const res = await post(valid);
    expect(res.status).toBe(429);
    expect(res.headers.get('retry-after')).toBe('3600');
    expect(enqueue).not.toHaveBeenCalled();
  });

  it('returns 429 for everyone while the form is flooded', async () => {
    state.counts = [0, 300];
    const res = await post(valid);
    expect(res.status).toBe(429);
    expect(enqueue).not.toHaveBeenCalled();
  });

  it.each([
    ['an invalid email', { ...valid, email: 'not-an-email' }],
    ['an oversized message', { ...valid, message: 'x'.repeat(5001) }],
    ['a missing name', { ...valid, name: '' }],
  ])('rejects %s with 400 before any rate-limit lookup or storage', async (_label, body) => {
    const res = await post(body);
    expect(res.status).toBe(400);
    expect(state.calls).toBe(0);
    expect(enqueue).not.toHaveBeenCalled();
  });

  it('refuses a declared oversized body with 413 before reading it', async () => {
    const res = await post(valid, { 'content-length': '999999' });
    expect(res.status).toBe(413);
  });

  it('refuses a request the browser marks cross-site', async () => {
    const res = await post(valid, { 'sec-fetch-site': 'cross-site' });
    expect(res.status).toBe(403);
  });
});
