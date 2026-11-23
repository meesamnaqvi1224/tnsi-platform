import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * GET /api/v1/exercises/[slug]: who may fetch a guided exercise for the native app, and what is
 * (and is not) sent. The database lookup and Sanity are stubbed; the access rule is the real
 * `contentAccessFor`, so "free member once membership is open" runs against the actual gating logic.
 */

const state = vi.hoisted(() => ({
  user: null as null | { id: string; entitlements: Record<string, unknown> | null },
  practice: null as null | { id: string; isFree: boolean; mediaUrl: string | null },
  exercise: null as null | Record<string, unknown>,
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
vi.mock('@/lib/practices', () => ({ getPublishedExercisePractice: async () => state.practice }));
vi.mock('@/content/cms/loaders', () => ({ getGuidedExercise: async () => state.exercise }));

const { GET } = await import('./route');
const call = (slug: string) => GET(new Request('http://x'), { params: Promise.resolve({ slug }) });

const KEYS = [
  'REGULATION_SUITE_MEMBERSHIP_OPEN',
  'STRIPE_SECRET_KEY',
  'STRIPE_WEBHOOK_SECRET',
  'STRIPE_PRICE_ID_MONTHLY',
  'STRIPE_PRICE_ID_ANNUAL',
];
const saved = Object.fromEntries(KEYS.map((k) => [k, process.env[k]]));

const exercise = {
  slug: 'early-warning-signs',
  title: 'Early Warning Signs',
  steps: [{ id: 'a', type: 'prompt', title: null, body: 'Notice.' }],
  closing: { heading: 'Done', message: 'Well done.' },
};

beforeEach(() => {
  state.denied = null;
  state.user = {
    id: 'user-1',
    entitlements: {
      tier: 'free',
      status: 'active',
      programs: [],
      certifications: [],
      features: [],
    },
  };
  state.practice = { id: 'practice-1', isFree: false, mediaUrl: null };
  state.exercise = exercise;
  for (const k of KEYS) delete process.env[k];
});
afterEach(() => {
  for (const k of KEYS) {
    if (saved[k] === undefined) delete process.env[k];
    else process.env[k] = saved[k];
  }
});

describe('GET /api/v1/exercises/[slug]', () => {
  it('is 401 when signed out', async () => {
    state.denied = 'UNAUTHENTICATED';
    expect((await call('early-warning-signs')).status).toBe(401);
  });

  it('is 404 for a slug that is not valid, before looking anything up', async () => {
    expect((await call('../secret')).status).toBe(404);
  });

  it('is 404 when no published practice carries the exercise (a draft is not reachable)', async () => {
    state.practice = null;
    expect((await call('early-warning-signs')).status).toBe(404);
  });

  it('is 404 when the CMS document is missing or incomplete', async () => {
    state.exercise = null;
    expect((await call('early-warning-signs')).status).toBe(404);
  });

  it('serves the practice id and the exercise', async () => {
    const res = await call('early-warning-signs');
    expect(res.status).toBe(200);
    const { data } = await res.json();
    expect(data.practiceId).toBe('practice-1');
    expect(data.exercise.title).toBe('Early Warning Signs');
  });

  it('refuses a free account once membership is open and the practice is paid, sending no content', async () => {
    process.env.REGULATION_SUITE_MEMBERSHIP_OPEN = 'true';
    process.env.STRIPE_SECRET_KEY = 'sk_test_x';
    process.env.STRIPE_WEBHOOK_SECRET = 'whsec_x';
    process.env.STRIPE_PRICE_ID_MONTHLY = 'price_m';
    process.env.STRIPE_PRICE_ID_ANNUAL = 'price_a';
    const res = await call('early-warning-signs');
    expect(res.status).toBe(403);
    const text = JSON.stringify(await res.json());
    expect(text).toContain('MEMBERSHIP_REQUIRED');
    expect(text).not.toContain('Early Warning Signs');
  });
});
