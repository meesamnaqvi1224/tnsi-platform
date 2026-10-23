import { beforeEach, describe, expect, it, vi } from 'vitest';

/** Abuse handling on the newsletter form. The database and CRM are fakes. */
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
const post = (body: unknown, headers: Record<string, string> = {}) =>
  POST(
    new Request('http://x/api/newsletter', {
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

describe('POST /api/newsletter — abuse handling', () => {
  it('still accepts a normal signup', async () => {
    const res = await post({ email: 'a@example.test' }, { origin: 'https://site.test' });
    expect(res.status).toBe(200);
    expect(enqueue).toHaveBeenCalledTimes(1);
  });

  it('refuses a cross-site request', async () => {
    const res = await post({ email: 'a@example.test' }, { origin: 'https://evil.test' });
    expect(res.status).toBe(403);
    expect(enqueue).not.toHaveBeenCalled();
  });

  it('answers a honeypot signup as if it worked, storing nothing', async () => {
    const res = await post({ email: 'a@example.test', website: 'http://spam.test' });
    expect(await res.json()).toEqual({ subscribed: true, alreadySubscribed: false });
    expect(enqueue).not.toHaveBeenCalled();
  });

  it('returns 429 for a repeated address and for a flooded form', async () => {
    state.counts = [5, 0];
    expect((await post({ email: 'a@example.test' })).status).toBe(429);
    state.counts = [0, 300];
    state.calls = 0;
    const res = await post({ email: 'b@example.test' });
    expect(res.status).toBe(429);
    expect(res.headers.get('retry-after')).toBe('3600');
    expect(enqueue).not.toHaveBeenCalled();
  });

  it.each([
    ['an empty email', { email: '' }],
    ['a malformed email', { email: 'nope' }],
    ['an over-long email', { email: `${'a'.repeat(250)}@example.test` }],
    ['a non-string email', { email: 42 }],
  ])('rejects %s with 400 before any lookup or storage', async (_label, body) => {
    const res = await post(body);
    expect(res.status).toBe(400);
    expect(state.calls).toBe(0);
    expect(enqueue).not.toHaveBeenCalled();
  });

  it('refuses a declared oversized body with 413 before reading it', async () => {
    const res = await post({ email: 'a@example.test' }, { 'content-length': '999999' });
    expect(res.status).toBe(413);
  });

  it('refuses a request the browser marks cross-site', async () => {
    const res = await post({ email: 'a@example.test' }, { 'sec-fetch-site': 'cross-site' });
    expect(res.status).toBe(403);
  });
});
