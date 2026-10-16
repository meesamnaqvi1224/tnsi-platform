import { beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * Assessment submission route: the visitor's record and its CRM event are stored
 * together, only the result tier name is queued for Flowi (never answers or
 * score), and a CRM problem never costs the visitor their result. The outbox's
 * own behaviour is covered against PostgreSQL in lib/crm-outbox.integration.test.ts.
 */

const insertedSubmissions: unknown[] = [];
const trx = {
  insert: () => ({
    values: (v: unknown) => {
      insertedSubmissions.push(v);
      return Promise.resolve();
    },
  }),
};
const transaction = vi.fn(async (fn: (t: typeof trx) => Promise<unknown>) => fn(trx));
vi.mock('@tnsi/db', () => ({
  db: { transaction: (fn: never) => transaction(fn) },
  assessmentSubmissions: {},
}));

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

const getAssessmentBySlug = vi.fn();
vi.mock('@/content/cms/loaders', () => ({
  getAssessmentBySlug: (...a: unknown[]) => getAssessmentBySlug(...a),
}));

const { POST } = await import('./route');

const assessment = {
  title: 'Capacity Assessment',
  crmPipeline: null,
  scoringMethod: 'sum',
  questions: [
    {
      key: 'q1',
      choices: [
        { key: 'a', value: 0 },
        { key: 'b', value: 5 },
      ],
    },
  ],
  resultTiers: [
    { key: 'low', title: 'Low', minScore: 0, maxScore: 4, description: 'Low result' },
    { key: 'high', title: 'High', minScore: 5, maxScore: 10, description: 'High result' },
  ],
};
const valid = {
  assessmentSlug: 'capacity-assessment',
  email: 'a@example.test',
  answers: { q1: 'b' },
};
const post = (body: unknown) =>
  POST(
    new Request('http://x/api/assessments/submit', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: typeof body === 'string' ? body : JSON.stringify(body),
    }),
  );

beforeEach(() => {
  insertedSubmissions.length = 0;
  transaction.mockClear();
  enqueue.mockReset().mockResolvedValue('row-1');
  attempt.mockReset().mockResolvedValue({ ok: true, isNew: true });
  getAssessmentBySlug.mockReset().mockResolvedValue(assessment);
});

describe('POST /api/assessments/submit', () => {
  it('stores the submission and its CRM event in ONE transaction, then returns the result', async () => {
    const res = await post(valid);
    expect(res.status).toBe(201);
    expect((await res.json()).result).toMatchObject({ key: 'high', title: 'High' });
    expect(transaction).toHaveBeenCalledTimes(1);
    expect(insertedSubmissions).toHaveLength(1);
    expect(enqueue.mock.calls[0]![0]).toBe(trx); // the outbox write uses the same transaction
    expect(attempt).toHaveBeenCalledWith('row-1');
  });

  it('queues only the contact, the tag and the result tier name: never answers or score', async () => {
    await post(valid);
    const event = enqueue.mock.calls[0]![1];
    expect(event.kind).toBe('assessment');
    expect(event.email).toBe('a@example.test');
    expect(event.payload.tags).toEqual(['TNSI Website Assessment']);
    expect(event.payload.customFields).toEqual([{ id: expect.any(String), value: 'high' }]);
    const json = JSON.stringify(event);
    expect(json).not.toMatch(/answers|score|"q1"/);
  });

  it('a CRM delivery failure never costs the visitor their result', async () => {
    attempt.mockRejectedValue(new Error('flowi down'));
    expect((await post(valid)).status).toBe(201);
    attempt.mockResolvedValue({ ok: false, permanent: false });
    expect((await post(valid)).status).toBe(201);
  });

  it('nothing is attempted when the transaction fails: the visitor is told it failed', async () => {
    transaction.mockRejectedValueOnce(new Error('db down'));
    await expect(post(valid)).rejects.toThrow();
    expect(attempt).not.toHaveBeenCalled();
  });

  it('rejects an invalid body, an unknown assessment and bad answers before storing anything', async () => {
    expect((await post({ ...valid, email: 'no' })).status).toBe(400);
    expect((await post('{bad json')).status).toBe(400);
    getAssessmentBySlug.mockResolvedValue(null);
    expect((await post(valid)).status).toBe(404);
    getAssessmentBySlug.mockResolvedValue(assessment);
    expect((await post({ ...valid, answers: { nope: 'a' } })).status).toBe(400);
    expect(transaction).not.toHaveBeenCalled();
    expect(enqueue).not.toHaveBeenCalled();
  });
});
