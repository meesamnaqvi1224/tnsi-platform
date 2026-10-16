import { beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * Contact form route: the enquiry is stored BEFORE any CRM call, and a CRM
 * failure never costs the visitor their submission. The outbox itself is covered
 * against PostgreSQL in lib/crm-outbox.integration.test.ts.
 */

vi.mock('@tnsi/db', () => ({ db: { marker: 'db' } }));
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
  organisation: 'Analytical Engines',
  subject: 'Enquiry',
  message: 'Hello, I would like to know more.',
};
const post = (body: unknown) =>
  POST(
    new Request('http://x/api/contact', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: typeof body === 'string' ? body : JSON.stringify(body),
    }),
  );

beforeEach(() => {
  enqueue.mockReset().mockResolvedValue('row-1');
  attempt.mockReset().mockResolvedValue({ ok: true, isNew: true });
});

describe('POST /api/contact', () => {
  it('stores the enquiry with its message, subject and organisation, then attempts delivery', async () => {
    const res = await post(valid);
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ submitted: true });
    const event = enqueue.mock.calls[0]![1];
    expect(event.kind).toBe('contact_form');
    expect(event.email).toBe('ada@example.test');
    const values = event.payload.customFields.map((f: { value: string }) => f.value);
    expect(values).toContain('Hello, I would like to know more.');
    expect(values).toContain('Enquiry');
    expect(values).toContain('Analytical Engines');
    expect(attempt).toHaveBeenCalledWith('row-1');
  });

  it('never attempts delivery, or reports success, before the enquiry is durably stored', async () => {
    let stored = false;
    enqueue.mockImplementation(async () => {
      await new Promise((r) => setTimeout(r, 20));
      stored = true;
      return 'row-1';
    });
    attempt.mockImplementation(async () => {
      expect(stored).toBe(true); // delivery only starts after storage finished
      return { ok: true, isNew: true };
    });
    expect((await post(valid)).status).toBe(200);
    expect(enqueue.mock.invocationCallOrder[0]!).toBeLessThan(attempt.mock.invocationCallOrder[0]!);
  });

  it('still succeeds when the CRM delivery attempt fails: the enquiry is stored for the worker', async () => {
    attempt.mockResolvedValue({ ok: false, permanent: false });
    expect((await post(valid)).status).toBe(200);
    attempt.mockRejectedValue(new Error('network'));
    expect((await post(valid)).status).toBe(200);
  });

  it('tells the visitor it failed only when the enquiry could NOT be stored', async () => {
    enqueue.mockRejectedValue(new Error('database down'));
    const res = await post(valid);
    expect(res.status).toBe(500);
    expect(attempt).not.toHaveBeenCalled();
  });

  it('rejects an invalid body before storing anything', async () => {
    expect((await post({ ...valid, email: 'not-an-email' })).status).toBe(400);
    expect((await post({ ...valid, message: '' })).status).toBe(400);
    expect((await post('{not json')).status).toBe(400);
    expect(enqueue).not.toHaveBeenCalled();
  });
});
