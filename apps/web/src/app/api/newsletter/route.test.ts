import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@tnsi/db', () => {
  // Under-limit fake database: counting returns 0 and the transaction runs its work directly.
  const tx = {
    execute: async () => undefined,
    select: () => ({ from: () => ({ where: async () => [{ n: 0 }] }) }),
  };
  return {
    crmOutbox: { kind: 'kind', email: 'email', createdAt: 'created_at' },
    db: { marker: 'db', ...tx, transaction: async (fn: (t: typeof tx) => unknown) => fn(tx) },
  };
});
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
const post = (body: unknown) =>
  POST(
    new Request('http://x/api/newsletter', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: typeof body === 'string' ? body : JSON.stringify(body),
    }),
  );

beforeEach(() => {
  enqueue.mockReset().mockResolvedValue('row-1');
  attempt.mockReset().mockResolvedValue({ ok: true, isNew: true });
});

describe('POST /api/newsletter', () => {
  it('stores the signup and reports a new subscriber when delivery succeeds', async () => {
    const res = await post({ email: ' a@example.test ' });
    expect(await res.json()).toEqual({ subscribed: true, alreadySubscribed: false });
    expect(enqueue.mock.calls[0]![1]).toMatchObject({
      kind: 'newsletter',
      email: 'a@example.test',
    });
  });

  it('reports an existing contact when Flowi says it already existed', async () => {
    attempt.mockResolvedValue({ ok: true, isNew: false });
    expect(await (await post({ email: 'a@example.test' })).json()).toEqual({
      subscribed: true,
      alreadySubscribed: true,
    });
  });

  it('succeeds when delivery fails or is not attempted: the signup is stored', async () => {
    attempt.mockResolvedValue({ ok: false, permanent: false });
    expect(await (await post({ email: 'a@example.test' })).json()).toEqual({
      subscribed: true,
      alreadySubscribed: false,
    });
    attempt.mockRejectedValue(new Error('x'));
    expect((await post({ email: 'a@example.test' })).status).toBe(200);
  });

  it('fails only when the signup could not be stored', async () => {
    enqueue.mockRejectedValue(new Error('db'));
    expect((await post({ email: 'a@example.test' })).status).toBe(500);
  });

  it.each([{}, { email: '' }, { email: 'nope' }, { email: 42 }])('rejects %j', async (body) => {
    expect((await post(body)).status).toBe(400);
    expect(enqueue).not.toHaveBeenCalled();
  });
});
