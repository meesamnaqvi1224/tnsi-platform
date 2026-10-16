import { beforeEach, describe, expect, it, vi } from 'vitest';

const upsertFlowiContact = vi.fn();
const addFlowiContactTags = vi.fn();

vi.mock('@tnsi/integrations', () => {
  class FlowiConfigError extends Error {}
  class FlowiRequestError extends Error {
    constructor(
      message: string,
      public readonly status: number,
    ) {
      super(message);
    }
  }
  return { upsertFlowiContact, addFlowiContactTags, FlowiConfigError, FlowiRequestError };
});

const { POST } = await import('./route');
const { FlowiConfigError, FlowiRequestError } = await import('@tnsi/integrations');

const post = (body: unknown) =>
  POST(
    new Request('http://localhost/api/the-return-path/subscribe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: typeof body === 'string' ? body : JSON.stringify(body),
    }),
  );

describe('POST /api/the-return-path/subscribe', () => {
  beforeEach(() => {
    upsertFlowiContact.mockReset();
    addFlowiContactTags.mockReset().mockResolvedValue(undefined);
  });

  it('upserts the contact in Flowi tagged "The Return Path" and returns 200', async () => {
    upsertFlowiContact.mockResolvedValue({ isNew: true, contactId: 'c1' });
    const res = await post({ email: '  person@example.com ', consent: true });
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ subscribed: true, alreadySubscribed: false });
    // The upsert carries no tags (an upsert's tags would replace the contact's
    // existing ones); the tag is added afterwards to the contact it returned.
    expect(upsertFlowiContact).toHaveBeenCalledWith({
      email: 'person@example.com',
      source: 'TNSI website — The Return Path',
    });
    expect(addFlowiContactTags).toHaveBeenCalledWith('c1', ['The Return Path']);
  });

  it('does not report success when the tag could not be added (the sequence keys on it)', async () => {
    upsertFlowiContact.mockResolvedValue({ isNew: true, contactId: 'c1' });
    addFlowiContactTags.mockRejectedValue(new FlowiRequestError('x', 503));
    const res = await post({ email: 'person@example.com', consent: true });
    expect(res.status).toBe(502);
  });

  it('rejects a missing or malformed email without calling Flowi', async () => {
    for (const email of [undefined, '', 'not-an-email', 'a@b']) {
      const res = await post({ email, consent: true });
      expect(res.status).toBe(400);
    }
    expect(upsertFlowiContact).not.toHaveBeenCalled();
  });

  it('requires consent to be explicitly true', async () => {
    for (const consent of [undefined, false, 'true', 1]) {
      const res = await post({ email: 'person@example.com', consent });
      expect(res.status).toBe(400);
    }
    expect(upsertFlowiContact).not.toHaveBeenCalled();
  });

  it('rejects invalid JSON', async () => {
    const res = await post('{nope');
    expect(res.status).toBe(400);
  });

  it('returns 503 when Flowi is not configured', async () => {
    upsertFlowiContact.mockRejectedValue(new FlowiConfigError('missing'));
    const res = await post({ email: 'person@example.com', consent: true });
    expect(res.status).toBe(503);
  });

  it('returns 502 when Flowi rejects the request, so the page never shows success', async () => {
    upsertFlowiContact.mockRejectedValue(new FlowiRequestError('bad', 422));
    const res = await post({ email: 'person@example.com', consent: true });
    expect(res.status).toBe(502);
  });
});
