import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { DEFAULT_RETURN_PATH_CONTENT } from '@/components/return-path/content';

/**
 * GET /api/v1/return-path: who may fetch The Return Path for the native app,
 * and what is (and is not) sent. The database and Sanity are stubbed; the
 * access rule is the real `contentAccessFor`, so "free member while membership
 * is open" is exercised against the actual gating logic.
 */

const state = vi.hoisted(() => ({
  user: null as null | { id: string; entitlements: Record<string, unknown> | null },
  rows: [] as Array<Record<string, unknown>>,
  denied: null as null | 'UNAUTHENTICATED' | 'ENTITLEMENT_REQUIRED',
}));

vi.mock('@/lib/auth-api', () => ({
  requireMemberAccess: async () => {
    if (state.denied) throw new Error(state.denied);
    return state.user;
  },
  memberAccessErrorResponse: (err: unknown) =>
    new Response(JSON.stringify({ error: { code: (err as Error).message } }), {
      status: (err as Error).message === 'UNAUTHENTICATED' ? 401 : 403,
    }),
}));

vi.mock('@tnsi/db', () => ({
  db: {
    select: () => ({
      from: () => ({ where: () => ({ limit: async () => state.rows }) }),
    }),
  },
}));

vi.mock('@/content/cms/loaders', () => ({
  getReturnPathContent: async () => DEFAULT_RETURN_PATH_CONTENT,
}));

const { GET } = await import('./route');

const KEYS = [
  'REGULATION_SUITE_MEMBERSHIP_OPEN',
  'STRIPE_SECRET_KEY',
  'STRIPE_WEBHOOK_SECRET',
  'STRIPE_PRICE_ID_MONTHLY',
  'STRIPE_PRICE_ID_ANNUAL',
];
const saved = Object.fromEntries(KEYS.map((k) => [k, process.env[k]]));

function openMembership() {
  process.env.REGULATION_SUITE_MEMBERSHIP_OPEN = 'true';
  process.env.STRIPE_SECRET_KEY = 'sk_test_x';
  process.env.STRIPE_WEBHOOK_SECRET = 'whsec_x';
  process.env.STRIPE_PRICE_ID_MONTHLY = 'price_m';
  process.env.STRIPE_PRICE_ID_ANNUAL = 'price_a';
}

const entitlement = (over: Record<string, unknown> = {}) => ({
  tier: 'free',
  status: 'active',
  programs: [],
  certifications: [],
  features: [],
  ...over,
});

beforeEach(() => {
  state.denied = null;
  state.user = { id: 'user-1', entitlements: entitlement() };
  state.rows = [{ id: 'practice-rp', isFree: false, mediaUrl: null }];
  for (const k of KEYS) delete process.env[k];
});
afterEach(() => {
  for (const k of KEYS) {
    if (saved[k] === undefined) delete process.env[k];
    else process.env[k] = saved[k];
  }
});

describe('GET /api/v1/return-path', () => {
  it('is 401 when signed out', async () => {
    state.denied = 'UNAUTHENTICATED';
    expect((await GET()).status).toBe(401);
  });

  it('is 404 when The Return Path is not published', async () => {
    state.rows = [];
    expect((await GET()).status).toBe(404);
  });

  it('serves a free account while membership is closed (nothing is gated yet)', async () => {
    const res = await GET();
    expect(res.status).toBe(200);
    const { data } = await res.json();
    expect(data.practiceId).toBe('practice-rp');
    expect(data.allowedLevels).toEqual([1, 2, 3]);
    expect(data.content.intro.title).toBe('The Return Path');
    expect(data.content.timings.inhaleSeconds).toBe(4);
  });

  it('refuses a free account once membership is open and the practice is paid (403)', async () => {
    openMembership();
    const res = await GET();
    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.error.code).toBe('MEMBERSHIP_REQUIRED');
    expect(JSON.stringify(body)).not.toContain('practice-rp');
  });

  it('serves a free account once membership is open if the practice is in the free selection', async () => {
    openMembership();
    state.rows = [{ id: 'practice-rp', isFree: true, mediaUrl: null }];
    expect((await GET()).status).toBe(200);
  });

  it('serves a paying member once membership is open', async () => {
    openMembership();
    state.user = { id: 'user-2', entitlements: entitlement({ tier: 'monthly' }) };
    expect((await GET()).status).toBe(200);
  });

  it('never sends the public-web email-capture copy', async () => {
    const { data } = await (await GET()).json();
    expect(data.content).not.toHaveProperty('email');
  });
});
