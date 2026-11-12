import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * The journal routes' own rules - authentication, validation, status mapping, private headers, and that
 * nothing from a submitted entry is echoed or logged - with the data layer replaced by recorders. The
 * database truth (ownership scoping, ordering, drafts, idempotency, purge) is proven against a real
 * PostgreSQL in lib/journal.integration.test.ts.
 */
const state = vi.hoisted(() => ({
  auth: 'member' as 'member' | 'unauthenticated' | 'no-entitlement',
  /** The member has started deleting their account (an account_deletion_requests row exists). */
  pending: false,
  /** The deletion-pending check cannot be answered (database down, or migration 0014 not applied). */
  stateError: false,
  lib: {
    list: vi.fn(),
    create: vi.fn(),
    get: vi.fn(),
    update: vi.fn(),
    remove: vi.fn(),
  },
}));

vi.mock('@/lib/auth-api', async () => {
  const { forbidden, unauthorized } = await import('@/lib/api-response');
  return {
    requireMemberAccess: async () => {
      if (state.auth === 'unauthenticated') throw new Error('UNAUTHENTICATED');
      if (state.auth === 'no-entitlement') {
        throw Object.assign(new Error('no entitlement'), { name: 'EntitlementRequiredError' });
      }
      return { id: 'user-A' };
    },
    memberAccessErrorResponse: (error: unknown) =>
      (error as { name?: string })?.name === 'EntitlementRequiredError'
        ? forbidden()
        : unauthorized(),
  };
});

vi.mock('@/lib/deletion-state', () => ({
  isDeletionPending: async () => {
    if (state.stateError)
      throw Object.assign(new Error('relation does not exist SECRET-TEXT'), { code: '42P01' });
    return state.pending;
  },
}));

vi.mock('@/lib/journal', () => ({
  listJournalEntries: (...args: unknown[]) => state.lib.list(...args),
  createJournalEntry: (...args: unknown[]) => state.lib.create(...args),
  getJournalEntry: (...args: unknown[]) => state.lib.get(...args),
  updateJournalEntry: (...args: unknown[]) => state.lib.update(...args),
  deleteJournalEntry: (...args: unknown[]) => state.lib.remove(...args),
}));

const collection = await import('./route');
const single = await import('./[id]/route');

const ID = '3f2b6c1e-8a4d-4c7e-9b1a-2d5e6f708192';
const SECRET = 'my very private thought SECRET-TEXT';
const NO_STORE = 'private, no-store, max-age=0';

const json = (method: string, body: unknown, url = 'http://x/api/v1/journal/entries') =>
  new Request(url, {
    method,
    headers: { 'content-type': 'application/json' },
    body: typeof body === 'string' ? body : JSON.stringify(body),
  });
const params = (id = ID) => ({ params: Promise.resolve({ id }) });

let consoleSpies: ReturnType<typeof vi.spyOn>[];
beforeEach(() => {
  state.auth = 'member';
  state.pending = false;
  state.stateError = false;
  for (const fn of Object.values(state.lib)) fn.mockReset();
  consoleSpies = (['error', 'warn', 'log', 'info'] as const).map((m) =>
    vi.spyOn(console, m).mockImplementation(() => {}),
  );
});
afterEach(() => {
  // whatever happened in the test, nothing it logged may contain the entry text
  for (const spy of consoleSpies) expect(JSON.stringify(spy.mock.calls)).not.toContain('SECRET');
  vi.restoreAllMocks();
});

const entry = { id: ID, title: null, content: SECRET, status: 'draft' };

describe('authentication', () => {
  const calls: [string, () => Promise<Response>][] = [
    ['GET list', () => collection.GET(new Request('http://x/api/v1/journal/entries'))],
    ['POST create', () => collection.POST(json('POST', { content: SECRET }))],
    ['GET one', () => single.GET(new Request('http://x'), params())],
    ['PATCH one', () => single.PATCH(json('PATCH', { content: SECRET }), params())],
    ['DELETE one', () => single.DELETE(new Request('http://x', { method: 'DELETE' }), params())],
  ];

  it.each(calls)(
    '%s rejects an unauthenticated caller with 401 and touches no data',
    async (_n, call) => {
      state.auth = 'unauthenticated';
      const res = await call();
      expect(res.status).toBe(401);
      expect(res.headers.get('Cache-Control')).toBe(NO_STORE);
      for (const fn of Object.values(state.lib)) expect(fn).not.toHaveBeenCalled();
    },
  );

  it.each(calls)('%s rejects a caller with no account with 403', async (_n, call) => {
    state.auth = 'no-entitlement';
    const res = await call();
    expect(res.status).toBe(403);
    expect(res.headers.get('Cache-Control')).toBe(NO_STORE);
    for (const fn of Object.values(state.lib)) expect(fn).not.toHaveBeenCalled();
  });
});

describe('a member whose account deletion is pending', () => {
  const calls: [string, () => Promise<Response>][] = [
    ['GET list', () => collection.GET(new Request('http://x/api/v1/journal/entries'))],
    [
      'GET drafts',
      () => collection.GET(new Request('http://x/api/v1/journal/entries?status=draft')),
    ],
    ['POST create', () => collection.POST(json('POST', { id: ID, content: SECRET }))],
    ['GET one', () => single.GET(new Request('http://x'), params())],
    ['PATCH one', () => single.PATCH(json('PATCH', { content: SECRET }), params())],
    ['DELETE one', () => single.DELETE(new Request('http://x', { method: 'DELETE' }), params())],
  ];

  it.each(calls)(
    '%s is refused with 423, private headers, and no journal data is touched or returned',
    async (_n, call) => {
      state.pending = true;
      const res = await call();
      expect(res.status).toBe(423);
      expect(res.headers.get('Cache-Control')).toBe(NO_STORE);
      const body = await res.json();
      expect(body.error.code).toBe('ACCOUNT_DELETION_PENDING');
      expect(body).not.toHaveProperty('data');
      expect(JSON.stringify(body)).not.toContain('SECRET');
      for (const fn of Object.values(state.lib)) expect(fn).not.toHaveBeenCalled();
    },
  );

  it('cannot re-create an entry - even a retried create with an old client id', async () => {
    state.pending = true;
    state.lib.create.mockResolvedValue({ kind: 'created', entry });
    expect(
      (await collection.POST(json('POST', { id: ID, content: SECRET, status: 'saved' }))).status,
    ).toBe(423);
    expect(state.lib.create).not.toHaveBeenCalled();
  });

  it('is served normally again only when the pending marker is absent (an ordinary member)', async () => {
    state.lib.list.mockResolvedValue({ entries: [], hasMore: false });
    expect((await collection.GET(new Request('http://x/api/v1/journal/entries'))).status).toBe(200);
  });
});

describe('when the deletion-pending check cannot be answered', () => {
  it('fails CLOSED with a generic 500 - never a 401 "unauthenticated" - and leaks nothing', async () => {
    state.stateError = true;
    const calls = [
      () => collection.GET(new Request('http://x/api/v1/journal/entries')),
      () => collection.POST(json('POST', { content: SECRET })),
      () => single.GET(new Request('http://x'), params()),
      () => single.PATCH(json('PATCH', { content: SECRET }), params()),
      () => single.DELETE(new Request('http://x', { method: 'DELETE' }), params()),
    ];
    for (const call of calls) {
      const res = await call();
      expect(res.status).toBe(500); // not 401: the member's session is fine
      expect(res.headers.get('Cache-Control')).toBe(NO_STORE);
      const body = await res.json();
      expect(body.error.code).toBe('INTERNAL_ERROR');
      expect(JSON.stringify(body)).not.toContain('SECRET');
    }
    for (const fn of Object.values(state.lib)) expect(fn).not.toHaveBeenCalled(); // nothing was served or written
  });
});

describe('GET /api/v1/journal/entries', () => {
  it("lists the authenticated member's saved entries and returns private headers", async () => {
    state.lib.list.mockResolvedValue({ entries: [], hasMore: false });
    const res = await collection.GET(
      new Request('http://x/api/v1/journal/entries?limit=5&offset=10'),
    );
    expect(res.status).toBe(200);
    expect(res.headers.get('Cache-Control')).toBe(NO_STORE);
    expect(state.lib.list).toHaveBeenCalledWith('user-A', {
      limit: 5,
      offset: 10,
      status: 'saved',
    });
    expect(await res.json()).toEqual({
      data: { entries: [], pagination: { limit: 5, offset: 10, hasMore: false } },
    });
  });

  it('lists drafts only when asked', async () => {
    state.lib.list.mockResolvedValue({ entries: [], hasMore: false });
    await collection.GET(new Request('http://x/api/v1/journal/entries?status=draft'));
    expect(state.lib.list).toHaveBeenCalledWith('user-A', {
      limit: 20,
      offset: 0,
      status: 'draft',
    });
  });

  it('rejects bad query parameters with only the field names', async () => {
    const res = await collection.GET(
      new Request('http://x/api/v1/journal/entries?limit=999&status=bogus'),
    );
    expect(res.status).toBe(400);
    expect((await res.json()).error.details.fields.sort()).toEqual(['limit', 'status']);
  });
});

describe('POST /api/v1/journal/entries', () => {
  it('creates an entry for the AUTHENTICATED member, ignoring any user id in the body', async () => {
    state.lib.create.mockResolvedValue({ kind: 'created', entry });
    const res = await collection.POST(
      json('POST', { content: SECRET, status: 'saved', userId: 'user-B' }),
    );
    expect(res.status).toBe(201);
    expect(res.headers.get('Cache-Control')).toBe(NO_STORE);
    const [owner, input] = state.lib.create.mock.calls[0]!;
    expect(owner).toBe('user-A');
    expect(input).not.toHaveProperty('userId');
  });

  it('replays an already-created client id with 200 rather than 201', async () => {
    state.lib.create.mockResolvedValue({ kind: 'replayed', entry });
    const res = await collection.POST(json('POST', { id: ID, content: SECRET }));
    expect(res.status).toBe(200);
  });

  it('maps unusable references to 404 and a mismatch to 400, revealing nothing', async () => {
    state.lib.create.mockResolvedValue({ kind: 'reference_not_found' });
    expect(
      (await collection.POST(json('POST', { content: 'x', entryType: 'practice', practiceId: ID })))
        .status,
    ).toBe(404);
    state.lib.create.mockResolvedValue({ kind: 'not_found' });
    expect((await collection.POST(json('POST', { id: ID, content: 'x' }))).status).toBe(404);
    state.lib.create.mockResolvedValue({ kind: 'reference_mismatch' });
    expect(
      (
        await collection.POST(
          json('POST', { content: 'x', entryType: 'practice', practiceId: ID, completionId: ID }),
        )
      ).status,
    ).toBe(400);
  });

  it('rejects invalid input without echoing any of it', async () => {
    const res = await collection.POST(
      json('POST', {
        content: SECRET + 'x'.repeat(20_001),
        title: SECRET.repeat(10),
        status: SECRET,
      }),
    );
    expect(res.status).toBe(400);
    const text = JSON.stringify(await res.json());
    expect(text).not.toContain('SECRET');
    expect(JSON.parse(text).error.details.fields.sort()).toEqual(['content', 'status', 'title']);
    expect(state.lib.create).not.toHaveBeenCalled();
  });

  it('rejects malformed JSON and an oversized body', async () => {
    expect((await collection.POST(json('POST', '{not json'))).status).toBe(400);
    const big = await collection.POST(
      json('POST', JSON.stringify({ content: 'a'.repeat(250_000) })),
    );
    expect(big.status).toBe(413);
    expect(big.headers.get('Cache-Control')).toBe(NO_STORE);
  });

  it('turns an unexpected failure into a generic 500 that leaks nothing and logs no text', async () => {
    state.lib.create.mockRejectedValue(
      Object.assign(new Error(`failed: ${SECRET}`), {
        code: '08006',
        query: SECRET,
        parameters: [SECRET],
      }),
    );
    const res = await collection.POST(json('POST', { content: SECRET }));
    expect(res.status).toBe(500);
    expect(res.headers.get('Cache-Control')).toBe(NO_STORE);
    expect(JSON.stringify(await res.json())).not.toContain('SECRET');
  });
});

describe('/api/v1/journal/entries/:id', () => {
  it('treats a malformed id as not found', async () => {
    expect((await single.GET(new Request('http://x'), params('nope'))).status).toBe(404);
    expect(state.lib.get).not.toHaveBeenCalled();
  });

  it("GET returns the member's entry, or 404 for one that is not theirs", async () => {
    state.lib.get.mockResolvedValueOnce(entry).mockResolvedValueOnce(null);
    const ok = await single.GET(new Request('http://x'), params());
    expect(ok.status).toBe(200);
    expect(ok.headers.get('Cache-Control')).toBe(NO_STORE);
    expect(state.lib.get).toHaveBeenCalledWith('user-A', ID);
    expect((await single.GET(new Request('http://x'), params())).status).toBe(404);
  });

  it('PATCH maps every outcome', async () => {
    state.lib.update.mockResolvedValueOnce({ kind: 'updated', entry });
    expect((await single.PATCH(json('PATCH', { content: SECRET }), params())).status).toBe(200);
    expect(state.lib.update).toHaveBeenCalledWith('user-A', ID, { content: SECRET });

    state.lib.update.mockResolvedValueOnce({ kind: 'not_found' });
    expect((await single.PATCH(json('PATCH', { content: 'x' }), params())).status).toBe(404);

    state.lib.update.mockResolvedValueOnce({ kind: 'revert_refused' });
    const conflict = await single.PATCH(json('PATCH', { status: 'draft' }), params());
    expect(conflict.status).toBe(409);
    expect((await conflict.json()).error.code).toBe('CONFLICT');

    state.lib.update.mockResolvedValueOnce({ kind: 'empty_saved' });
    expect(
      (await single.PATCH(json('PATCH', { content: '', status: 'saved' }), params())).status,
    ).toBe(400);
  });

  it('PATCH reports a database refusal (check_violation) as a plain 409 without detail', async () => {
    state.lib.update.mockRejectedValue(
      Object.assign(new Error(`bad ${SECRET}`), { code: '23514', query: SECRET }),
    );
    const res = await single.PATCH(json('PATCH', { content: SECRET }), params());
    expect(res.status).toBe(409);
    expect(JSON.stringify(await res.json())).not.toContain('SECRET');
  });

  it('PATCH rejects an empty body and invalid values with field names only', async () => {
    expect((await single.PATCH(json('PATCH', {}), params())).status).toBe(400);
    const res = await single.PATCH(
      json('PATCH', { content: SECRET + 'x'.repeat(20_001) }),
      params(),
    );
    expect(res.status).toBe(400);
    expect(JSON.stringify(await res.json())).not.toContain('SECRET');
    expect(state.lib.update).not.toHaveBeenCalled();
  });

  it("DELETE removes only the caller's entry; someone else's is 404", async () => {
    state.lib.remove.mockResolvedValueOnce(true).mockResolvedValueOnce(false);
    const ok = await single.DELETE(new Request('http://x', { method: 'DELETE' }), params());
    expect(ok.status).toBe(200);
    expect(await ok.json()).toEqual({ data: { deleted: true } });
    expect(state.lib.remove).toHaveBeenCalledWith('user-A', ID);
    expect(
      (await single.DELETE(new Request('http://x', { method: 'DELETE' }), params())).status,
    ).toBe(404);
  });
});
