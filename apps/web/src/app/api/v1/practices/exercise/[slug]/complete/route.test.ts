import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockRequireMemberAccess = vi.fn();
vi.mock('@/lib/auth-api', () => ({
  requireMemberAccess: () => mockRequireMemberAccess(),
  memberAccessErrorResponse: () => new Response('denied', { status: 403 }),
}));

const mockLimit = vi.fn();
vi.mock('@tnsi/db', () => ({
  db: { select: () => ({ from: () => ({ where: () => ({ limit: () => mockLimit() }) }) }) },
}));
vi.mock('@tnsi/db/schema', () => ({
  practices: {
    id: 'id',
    contentType: 'contentType',
    interactiveKey: 'interactiveKey',
    isPublished: 'isPublished',
  },
}));

const mockRecord = vi.fn();
vi.mock('../../../[id]/complete/route', () => ({
  POST: (request: Request, context: { params: Promise<{ id: string }> }) =>
    mockRecord(request, context),
}));

const { POST } = await import('./route');

const call = (slug: string) =>
  POST(new Request('http://x', { method: 'POST', body: '{}' }), {
    params: Promise.resolve({ slug }),
  });

beforeEach(() => {
  vi.clearAllMocks();
  mockRequireMemberAccess.mockResolvedValue({ id: 'user-1' });
});

describe('POST /api/v1/practices/exercise/[slug]/complete', () => {
  it('refuses a member who is not signed in or not entitled, before looking anything up', async () => {
    mockRequireMemberAccess.mockRejectedValue(new Error('UNAUTHENTICATED'));
    expect((await call('early-warning-signs')).status).toBe(403);
    expect(mockLimit).not.toHaveBeenCalled();
  });

  it('returns 404 for a slug that is not a valid exercise slug', async () => {
    expect((await call('Not A Slug')).status).toBe(404);
    expect(mockLimit).not.toHaveBeenCalled();
  });

  it('returns 404 when no published practice carries the exercise', async () => {
    mockLimit.mockResolvedValue([]);
    expect((await call('early-warning-signs')).status).toBe(404);
    expect(mockRecord).not.toHaveBeenCalled();
  });

  it('hands the request to the ordinary completion route with the practice id it found', async () => {
    mockLimit.mockResolvedValue([{ id: 'uuid-9' }]);
    mockRecord.mockResolvedValue(new Response('{}', { status: 200 }));
    const res = await call('state-before-after');
    expect(res.status).toBe(200);
    const [, context] = mockRecord.mock.calls[0]!;
    expect(await context.params).toEqual({ id: 'uuid-9' });
  });
});
