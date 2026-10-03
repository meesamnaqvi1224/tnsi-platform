import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * Server-side enforcement of the approved Regulation Suite™ free/paid model
 * on the real route handlers: what a free, trialing, grace-period, lapsed
 * and paid member can and cannot obtain. Auth, the database and Sanity are
 * mocked (no network, no database); everything between — the entitlement
 * resolution, the access decision and the response shaping — is the real
 * code.
 */

const state = vi.hoisted(() => ({
  user: null as null | { id: string; entitlements: Record<string, unknown> | null },
  sanityDrop: null as null | Record<string, unknown>,
  sanityList: { items: [] as Record<string, unknown>[], total: 0 },
  practiceRow: null as null | Record<string, unknown>,
  insertCalls: 0,
  selectCalls: 0,
}));

vi.mock('@/lib/auth-api', () => ({
  getAuthUser: async () => state.user,
  requireMemberAccess: async () => {
    if (!state.user) throw new Error('UNAUTHENTICATED');
    return state.user;
  },
  memberAccessErrorResponse: () => new Response('denied', { status: 401 }),
}));

vi.mock('@tnsi/cms/server', () => ({
  sanityFetch: async (query: string) =>
    query.includes('"items"') ? state.sanityList : state.sanityDrop,
}));

vi.mock('@tnsi/db', () => {
  const chain = {
    from: () => chain,
    where: () => chain,
    // First lookup in a handler is the practice row; any later lookup (e.g.
    // existing completions) finds nothing.
    limit: async () => {
      state.selectCalls += 1;
      return state.selectCalls === 1 && state.practiceRow ? [state.practiceRow] : [];
    },
    orderBy: () => chain,
  };
  return {
    db: {
      select: () => chain,
      insert: () => ({
        values: () => ({
          returning: async () => {
            state.insertCalls += 1;
            return [{ id: 'u1', powerDropId: 'pd', powerDropSlug: 's', usedAt: new Date() }];
          },
        }),
      }),
    },
    powerDropUsages: {},
  };
});

const FAILED_AT = new Date();

function entitlement(overrides: Record<string, unknown> = {}) {
  return {
    tier: 'monthly',
    status: 'active',
    programs: [],
    certifications: [],
    features: [],
    cancelAtPeriodEnd: false,
    paymentFailedAt: null,
    ...overrides,
  };
}

const MEMBERS = {
  free: entitlement({ tier: 'free' }),
  trialing: entitlement({ status: 'trialing' }),
  monthly: entitlement({ tier: 'monthly' }),
  annual: entitlement({ tier: 'annual' }),
  grace: entitlement({ status: 'past_due', paymentFailedAt: FAILED_AT }),
  canceling: entitlement({ cancelAtPeriodEnd: true }),
  lapsed: entitlement({
    status: 'past_due',
    paymentFailedAt: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000),
  }),
  expired: entitlement({ status: 'expired' }),
};

function asUser(key: keyof typeof MEMBERS) {
  state.user = { id: 'user-1', entitlements: MEMBERS[key] };
}

const drop = (isFree: boolean) => ({
  id: 'pd-1',
  title: 'Come back',
  slug: 'come-back',
  category: 'Grounding',
  description: 'Come back to yourself.',
  cardImage: { url: 'https://cdn.example/card.png', alt: 'card' },
  focus: 'Regulation',
  featured: false,
  isFree,
  duration: '90 seconds',
  instructions: ['Breathe', 'Settle'],
  anchorStatement: 'I return to myself.',
});

const ENV_KEYS = [
  'REGULATION_SUITE_MEMBERSHIP_OPEN',
  'STRIPE_SECRET_KEY',
  'STRIPE_WEBHOOK_SECRET',
  'STRIPE_PRICE_ID_MONTHLY',
  'STRIPE_PRICE_ID_ANNUAL',
];
const savedEnv = Object.fromEntries(ENV_KEYS.map((k) => [k, process.env[k]]));

function openMembership() {
  process.env.REGULATION_SUITE_MEMBERSHIP_OPEN = 'true';
  process.env.STRIPE_SECRET_KEY = 'sk_test_x';
  process.env.STRIPE_WEBHOOK_SECRET = 'whsec_x';
  process.env.STRIPE_PRICE_ID_MONTHLY = 'price_m';
  process.env.STRIPE_PRICE_ID_ANNUAL = 'price_a';
}

beforeEach(() => {
  state.user = null;
  state.sanityDrop = null;
  state.sanityList = { items: [], total: 0 };
  state.practiceRow = null;
  state.insertCalls = 0;
  state.selectCalls = 0;
  for (const k of ENV_KEYS) delete process.env[k];
});

afterEach(() => {
  for (const k of ENV_KEYS) {
    if (savedEnv[k] === undefined) delete process.env[k];
    else process.env[k] = savedEnv[k];
  }
});

const params = (slug = 'come-back') => ({ params: Promise.resolve({ slug }) });

describe('PowerDrops — membership open', () => {
  beforeEach(openMembership);

  it('GET detail: a free member is refused a paid PowerDrop (403 MEMBERSHIP_REQUIRED) and gets none of its content', async () => {
    const { GET } = await import('./powerdrops/[slug]/route');
    state.sanityDrop = drop(false);
    asUser('free');
    const res = await GET(new Request('http://x/api'), params());
    expect(res.status).toBe(403);
    const body = JSON.stringify(await res.json());
    expect(body).toContain('MEMBERSHIP_REQUIRED');
    expect(body).not.toContain('Breathe');
    expect(body).not.toContain('I return to myself');
    expect(body).not.toContain('card.png');
  });

  it('GET detail: a free member can open one of the free-designated PowerDrops', async () => {
    const { GET } = await import('./powerdrops/[slug]/route');
    state.sanityDrop = drop(true);
    asUser('free');
    const res = await GET(new Request('http://x/api'), params());
    expect(res.status).toBe(200);
    const { data } = await res.json();
    expect(data.instructions).toEqual(['Breathe', 'Settle']);
    expect(data.locked).toBe(false);
  });

  it.each(['trialing', 'monthly', 'annual', 'grace', 'canceling'] as const)(
    'GET detail: a %s member opens a paid PowerDrop',
    async (who) => {
      const { GET } = await import('./powerdrops/[slug]/route');
      state.sanityDrop = drop(false);
      asUser(who);
      const res = await GET(new Request('http://x/api'), params());
      expect(res.status).toBe(200);
    },
  );

  it.each(['lapsed', 'expired'] as const)(
    'GET detail: a %s member is refused even a free PowerDrop (existing inactive rule)',
    async (who) => {
      const { GET } = await import('./powerdrops/[slug]/route');
      state.sanityDrop = drop(true);
      asUser(who);
      const res = await GET(new Request('http://x/api'), params());
      expect(res.status).toBe(403);
    },
  );

  it('GET list: every PowerDrop is listed, but paid ones come back locked with the card artwork withheld', async () => {
    const { GET } = await import('./powerdrops/route');
    state.sanityList = {
      items: [
        { ...drop(true), id: 'free-1' },
        { ...drop(false), id: 'paid-1' },
      ],
      total: 2,
    };
    asUser('free');
    const res = await GET(new Request('http://x/api/v1/powerdrops'));
    const { data } = await res.json();
    const free = data.powerDrops.find((d: { id: string }) => d.id === 'free-1');
    const paid = data.powerDrops.find((d: { id: string }) => d.id === 'paid-1');
    expect(free.locked).toBe(false);
    expect(free.cardImage).not.toBeNull();
    expect(paid.locked).toBe(true);
    expect(paid.cardImage).toBeNull();
    expect(JSON.stringify(data)).not.toContain('Breathe');
  });

  it('GET list: a paid member sees everything unlocked', async () => {
    const { GET } = await import('./powerdrops/route');
    state.sanityList = { items: [{ ...drop(false), id: 'paid-1' }], total: 1 };
    asUser('annual');
    const res = await GET(new Request('http://x/api/v1/powerdrops'));
    const { data } = await res.json();
    expect(data.powerDrops[0].locked).toBe(false);
    expect(data.powerDrops[0].cardImage).not.toBeNull();
  });

  it('POST usage: a locked PowerDrop is refused and nothing is recorded', async () => {
    const { POST } = await import('./powerdrops/[slug]/usage/route');
    state.sanityDrop = drop(false);
    asUser('free');
    const res = await POST(new Request('http://x/api', { method: 'POST' }), params());
    expect(res.status).toBe(403);
    expect(state.insertCalls).toBe(0);
  });

  it('POST usage: an accessible PowerDrop records usage', async () => {
    const { POST } = await import('./powerdrops/[slug]/usage/route');
    state.sanityDrop = drop(false);
    asUser('monthly');
    const res = await POST(new Request('http://x/api', { method: 'POST' }), params());
    expect(res.status).toBe(201);
    expect(state.insertCalls).toBe(1);
  });

  it('an unauthenticated request is still refused outright (401)', async () => {
    const { GET } = await import('./powerdrops/[slug]/route');
    state.user = null;
    const res = await GET(new Request('http://x/api'), params());
    expect(res.status).toBe(401);
  });
});

describe('PowerDrops — membership NOT open (today): nothing is locked early', () => {
  it('a free member opens a paid-flagged PowerDrop and lists it unlocked', async () => {
    const detail = await import('./powerdrops/[slug]/route');
    const list = await import('./powerdrops/route');
    state.sanityDrop = drop(false);
    state.sanityList = { items: [{ ...drop(false), id: 'paid-1' }], total: 1 };
    asUser('free');

    expect((await detail.GET(new Request('http://x/api'), params())).status).toBe(200);
    const { data } = await (await list.GET(new Request('http://x/api/v1/powerdrops'))).json();
    expect(data.powerDrops[0].locked).toBe(false);
    expect(data.powerDrops[0].cardImage).not.toBeNull();
  });

  it('half-configured is still closed: launch switch on but no Stripe prices → nothing locked', async () => {
    process.env.REGULATION_SUITE_MEMBERSHIP_OPEN = 'true';
    const detail = await import('./powerdrops/[slug]/route');
    state.sanityDrop = drop(false);
    asUser('free');
    expect((await detail.GET(new Request('http://x/api'), params())).status).toBe(200);
  });
});

describe('Practices — completing a locked practice', () => {
  const practiceParams = () => ({
    params: Promise.resolve({ id: '0b1f6c1e-6f0a-4f7e-8a39-0d6c3d1c8a11' }),
  });
  const post = () =>
    new Request('http://x/api', {
      method: 'POST',
      body: JSON.stringify({ completed: true }),
      headers: { 'content-type': 'application/json' },
    });

  it('is refused (403 MEMBERSHIP_REQUIRED) for a free member when membership is open', async () => {
    openMembership();
    const { POST } = await import('./practices/[id]/complete/route');
    state.practiceRow = { id: 'p1', isFree: false, isPublished: true };
    asUser('free');
    const res = await POST(post(), practiceParams());
    expect(res.status).toBe(403);
    expect(JSON.stringify(await res.json())).toContain('MEMBERSHIP_REQUIRED');
  });

  it('is allowed through to the normal flow for a free-designated practice', async () => {
    openMembership();
    const { POST } = await import('./practices/[id]/complete/route');
    state.practiceRow = { id: 'p1', isFree: true, isPublished: true };
    asUser('free');
    // Past the access gate the handler continues into the normal completion
    // logic, which this mock database cannot finish (it may return a
    // response or throw). The only claim here is that it is NOT turned away
    // with a membership 403.
    const outcome = await POST(post(), practiceParams()).then(
      (res) => res.status,
      () => 'continued-past-gate',
    );
    expect(outcome).not.toBe(403);
  });
});
