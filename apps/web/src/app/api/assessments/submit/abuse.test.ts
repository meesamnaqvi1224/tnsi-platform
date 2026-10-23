import { beforeEach, describe, expect, it, vi } from 'vitest';

/** Abuse handling on the assessment submission. The database, CMS and CRM are fakes. */
const state = vi.hoisted(() => ({ counts: [0, 0] as number[], calls: 0, transactions: 0 }));

vi.mock('@tnsi/db', () => ({
  assessmentSubmissions: {},
  crmOutbox: { kind: 'kind', email: 'email', createdAt: 'created_at' },
  db: {
    select: () => ({
      from: () => ({ where: async () => [{ n: state.counts[state.calls++] ?? 0 }] }),
    }),
    transaction: async () => {
      state.transactions += 1;
      return 'outbox-1';
    },
  },
}));
vi.mock('@/lib/crm-outbox', async () => {
  const actual = await vi.importActual<typeof import('@/lib/crm-outbox')>('@/lib/crm-outbox');
  return { ...actual, attemptNow: async () => ({ ok: true, isNew: true }) };
});
const getAssessmentBySlug = vi.fn();
vi.mock('@/content/cms/loaders', () => ({
  getAssessmentBySlug: (...a: unknown[]) => getAssessmentBySlug(...a),
}));

const { POST } = await import('./route');

const valid = {
  assessmentSlug: 'capacity-assessment',
  email: 'a@example.test',
  answers: { q1: 'a' },
};
const post = (body: unknown, headers: Record<string, string> = {}) =>
  POST(
    new Request('http://x/api/assessments/submit', {
      method: 'POST',
      headers: { 'content-type': 'application/json', host: 'site.test', ...headers },
      body: JSON.stringify(body),
    }),
  );

beforeEach(() => {
  state.counts = [0, 0];
  state.calls = 0;
  state.transactions = 0;
  getAssessmentBySlug.mockReset().mockResolvedValue({
    title: 'Capacity Assessment',
    crmPipeline: null,
    scoringMethod: 'sum',
    questions: [{ key: 'q1', choices: [{ key: 'a', value: 0 }] }],
    resultTiers: [
      { key: 'low', title: 'Low', minScore: 0, maxScore: 4, description: 'Low result' },
    ],
  });
});

describe('POST /api/assessments/submit — abuse handling', () => {
  it('still accepts a normal submission', async () => {
    const res = await post(valid, { origin: 'https://site.test' });
    expect(res.status).toBe(201);
    expect(state.transactions).toBe(1);
  });

  it('refuses a cross-site request', async () => {
    const res = await post(valid, { origin: 'https://evil.test' });
    expect(res.status).toBe(403);
    expect(state.transactions).toBe(0);
  });

  it('answers a honeypot submission as if it worked, storing nothing', async () => {
    const res = await post({ ...valid, website: 'http://spam.test' });
    expect(res.status).toBe(201);
    expect((await res.json()).submitted).toBe(true);
    expect(state.transactions).toBe(0);
    expect(getAssessmentBySlug).not.toHaveBeenCalled();
  });

  it('returns 429 for a repeated address, before loading the assessment or storing anything', async () => {
    state.counts = [5, 0];
    const res = await post(valid);
    expect(res.status).toBe(429);
    expect(res.headers.get('retry-after')).toBe('3600');
    expect(getAssessmentBySlug).not.toHaveBeenCalled();
    expect(state.transactions).toBe(0);
  });

  it.each([
    ['an invalid email', { ...valid, email: 'nope' }],
    ['no answers object', { ...valid, answers: 'x' }],
    ['an over-long slug', { ...valid, assessmentSlug: 'x'.repeat(201) }],
  ])('rejects %s with 400 before any lookup', async (_label, body) => {
    const res = await post(body);
    expect(res.status).toBe(400);
    expect(state.calls).toBe(0);
    expect(state.transactions).toBe(0);
  });
});
