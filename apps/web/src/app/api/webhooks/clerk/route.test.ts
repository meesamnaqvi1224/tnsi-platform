import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

const sync = vi.hoisted(() => ({ syncClerkUser: vi.fn() }));
vi.mock('@tnsi/auth/sync/user', () => sync);
vi.mock('@/lib/user-sync-ops', () => ({ userSyncOps: {} }));

const { POST } = await import('./route');

const SECRET = 'journal text SECRET-TEXT';
const request = () =>
  new NextRequest('http://x/api/webhooks/clerk', { method: 'POST', body: '{}' });

let errorSpy: ReturnType<typeof vi.spyOn>;
beforeEach(() => {
  sync.syncClerkUser.mockReset();
  errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
});

describe('POST /api/webhooks/clerk', () => {
  it('acknowledges a processed event', async () => {
    sync.syncClerkUser.mockResolvedValue({ action: 'user.deleted', userId: 'user_1' });
    const res = await POST(request());
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ success: true, action: 'user.deleted' });
  });

  it('answers a failed signature with 400 and a fixed message', async () => {
    sync.syncClerkUser.mockRejectedValue(
      Object.assign(new Error(`bad signature ${SECRET}`), {
        name: 'WebhookVerificationFailedError',
      }),
    );
    const res = await POST(request());
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: 'Webhook signature verification failed' });
  });

  it('answers any other failure with 500 (so Clerk retries) and NEVER echoes or logs the error text', async () => {
    sync.syncClerkUser.mockRejectedValue(
      Object.assign(new Error(`failed ${SECRET}`), {
        code: 'P0001',
        query: SECRET,
        parameters: [SECRET],
      }),
    );
    const res = await POST(request());
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body).toEqual({ error: 'Webhook processing failed' });
    expect(JSON.stringify(body)).not.toContain('SECRET');
    expect(JSON.stringify(errorSpy.mock.calls)).not.toContain('SECRET');
    expect(errorSpy.mock.calls[0]![1]).toEqual({ kind: 'processing', code: 'P0001' });
  });
});
