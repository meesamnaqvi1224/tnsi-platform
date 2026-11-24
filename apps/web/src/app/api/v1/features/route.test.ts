import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const state = { access: 'ok' as 'ok' | 'unauth' };
vi.mock('@/lib/auth-api', () => ({
  requireMemberAccess: async () => {
    if (state.access === 'unauth') throw new Error('UNAUTHENTICATED');
    return { id: 'user-1' };
  },
  memberAccessErrorResponse: () => new Response(null, { status: 401 }),
}));

beforeEach(() => {
  state.access = 'ok';
});
afterEach(() => vi.unstubAllEnvs());

describe('GET /api/v1/features', () => {
  it('reports reflections: false by default and when off', async () => {
    vi.stubEnv('MY_REFLECTIONS_ENABLED', '');
    const { GET } = await import('./route');
    const res = await GET();
    expect(res.status).toBe(200);
    expect((await res.json()).data).toEqual({ reflections: false, checkInFollowUp: false });
    expect(res.headers.get('cache-control')).toMatch(/no-store/);
  });

  it('reports reflections: true only when switched on', async () => {
    vi.stubEnv('MY_REFLECTIONS_ENABLED', 'true');
    const { GET } = await import('./route');
    expect((await (await GET()).json()).data).toEqual({
      reflections: true,
      checkInFollowUp: false,
    });
  });

  it('reports checkInFollowUp: true only when CHECKIN_FOLLOW_UP_ENABLED is exactly true', async () => {
    const { GET } = await import('./route');
    for (const [value, expected] of [
      ['true', true],
      ['TRUE', false],
      ['1', false],
      ['false', false],
      ['', false],
    ] as const) {
      vi.stubEnv('CHECKIN_FOLLOW_UP_ENABLED', value);
      expect((await (await GET()).json()).data.checkInFollowUp).toBe(expected);
    }
  });

  it('refuses a signed-out caller', async () => {
    state.access = 'unauth';
    const { GET } = await import('./route');
    expect((await GET()).status).toBe(401);
  });
});
