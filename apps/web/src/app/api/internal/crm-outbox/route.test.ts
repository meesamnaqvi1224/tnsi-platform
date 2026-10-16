import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@tnsi/db', () => ({ db: {}, crmOutbox: {} }));
const processOutbox = vi.fn();
const countFailed = vi.fn();
const failedByCategory = vi.fn();
vi.mock('@/lib/crm-outbox', () => ({
  processOutbox: (...a: unknown[]) => processOutbox(...a),
  countFailed: (...a: unknown[]) => countFailed(...a),
  failedByCategory: (...a: unknown[]) => failedByCategory(...a),
}));

const { GET, POST } = await import('./route');
const saved = process.env.CRON_SECRET;
const call = (method: 'GET' | 'POST', auth?: string) =>
  (method === 'GET' ? GET : POST)(
    new Request('http://x/api/internal/crm-outbox', {
      method,
      headers: auth ? { authorization: auth } : {},
    }),
  );

beforeEach(() => {
  processOutbox.mockReset().mockResolvedValue({
    claimed: 1,
    sent: 1,
    retrying: 0,
    failed: 0,
    purged: 0,
    stoppedForTime: false,
  });
  countFailed.mockReset().mockResolvedValue(0);
  failedByCategory.mockReset().mockResolvedValue({});
  process.env.CRON_SECRET = 's3cret-value-for-tests';
});
afterEach(() => {
  if (saved === undefined) delete process.env.CRON_SECRET;
  else process.env.CRON_SECRET = saved;
});

describe('CRM outbox worker route', () => {
  it('does nothing and answers 503 when CRON_SECRET is not configured (fails closed)', async () => {
    delete process.env.CRON_SECRET;
    expect((await call('GET', 'Bearer anything')).status).toBe(503);
    expect(processOutbox).not.toHaveBeenCalled();
  });

  it.each([
    undefined,
    '',
    'Bearer ',
    'Bearer wrong',
    's3cret-value-for-tests',
    'bearer s3cret-value-for-tests',
  ])('refuses %j with 401 before reading or sending anything', async (auth) => {
    expect((await call('GET', auth)).status).toBe(401);
    expect(processOutbox).not.toHaveBeenCalled();
  });

  it('runs the worker for the right secret (GET as used by the scheduler, and POST)', async () => {
    for (const m of ['GET', 'POST'] as const) {
      const res = await call(m, 'Bearer s3cret-value-for-tests');
      expect(res.status).toBe(200);
      expect(await res.json()).toEqual({
        claimed: 1,
        sent: 1,
        retrying: 0,
        failed: 0,
        purged: 0,
        stoppedForTime: false,
        failedRows: 0,
        failedBy: {},
      });
    }
    expect(processOutbox).toHaveBeenCalledTimes(2);
  });

  it('accepts the request exactly as Vercel Cron makes it: GET, bearer secret, vercel-cron user agent', async () => {
    const res = await GET(
      new Request('http://x/api/internal/crm-outbox', {
        method: 'GET',
        headers: {
          authorization: 'Bearer s3cret-value-for-tests',
          'user-agent': 'vercel-cron/1.0',
        },
      }),
    );
    expect(res.status).toBe(200);
  });

  it('never trusts the cron user agent on its own: it can be forged, only the secret counts', async () => {
    const res = await GET(
      new Request('http://x/api/internal/crm-outbox', {
        method: 'GET',
        headers: { 'user-agent': 'vercel-cron/1.0', 'x-vercel-cron': '1' },
      }),
    );
    expect(res.status).toBe(401);
    expect(processOutbox).not.toHaveBeenCalled();
  });

  it('reports failed rows by category only (no emails, no payloads) so a person can see what to fix', async () => {
    countFailed.mockResolvedValue(3);
    failedByCategory.mockResolvedValue({ 'HTTP 401': 2, 'HTTP 422': 1 });
    const body = await (await call('GET', 'Bearer s3cret-value-for-tests')).json();
    expect(body.failedRows).toBe(3);
    expect(body.failedBy).toEqual({ 'HTTP 401': 2, 'HTTP 422': 1 });
    expect(JSON.stringify(body)).not.toContain('@');
  });

  it('exposes no listing or retry action: only the worker run', async () => {
    const res = await POST(
      new Request('http://x/api/internal/crm-outbox?action=requeue', {
        method: 'POST',
        headers: { authorization: 'Bearer s3cret-value-for-tests' },
        body: JSON.stringify({ action: 'requeue' }),
      }),
    );
    expect(res.status).toBe(200);
    expect(processOutbox).toHaveBeenCalledTimes(1); // it just ran the worker
  });

  it('answers 500 with no detail when the worker itself fails', async () => {
    processOutbox.mockRejectedValue(new Error('connection string postgres://u:p@h/db'));
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const res = await call('GET', 'Bearer s3cret-value-for-tests');
    expect(res.status).toBe(500);
    expect(JSON.stringify(await res.json())).not.toContain('postgres');
  });
});
