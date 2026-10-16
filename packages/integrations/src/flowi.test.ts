import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  addFlowiContactTags,
  buildUpsertBody,
  classifyFlowiFailure,
  FlowiConfigError,
  FlowiRequestError,
  upsertFlowiContact,
} from './flowi';
import { FLOWI_FIELD } from './flowi-fields';

/**
 * Request shapes against a FAKE Flowi (a stubbed `fetch`): what is sent, in what
 * order, and how each kind of response is handled. This proves our client, not
 * Flowi - the endpoints and fields follow Flowi's official OpenAPI spec, but the
 * real account has not been called.
 */

describe('buildUpsertBody', () => {
  const base = { email: 'a@example.test', source: 'src' };

  it('sends the contact, source and location - and NEVER tags', () => {
    const body = buildUpsertBody(base, 'loc_1');
    expect(body).toEqual({ email: 'a@example.test', source: 'src', locationId: 'loc_1' });
    expect(body).not.toHaveProperty('tags');
  });

  it('never carries tags even if a caller passes them (an upsert would REPLACE existing tags)', () => {
    const body = buildUpsertBody({ ...base, tags: ['X'] } as never, 'loc_1');
    expect(JSON.stringify(body)).not.toContain('"tags"');
  });

  it('sends custom fields by ID with Flowi’s field_value name', () => {
    const body = buildUpsertBody(
      { ...base, customFields: [{ id: FLOWI_FIELD.contactMessage.id, value: 'hello' }] },
      'loc_1',
    );
    expect(body.customFields).toEqual([
      { id: FLOWI_FIELD.contactMessage.id, field_value: 'hello' },
    ]);
  });

  it('leaves out blank values and blank names, so nothing in the CRM is overwritten with nothing', () => {
    const body = buildUpsertBody(
      {
        ...base,
        firstName: '',
        lastName: undefined,
        customFields: [
          { id: 'a', value: '' },
          { id: 'b', value: '   ' },
        ],
      },
      'loc_1',
    );
    expect(body).not.toHaveProperty('customFields');
    expect(body).not.toHaveProperty('firstName');
    expect(body).not.toHaveProperty('lastName');
  });

  it('uses the field IDs read from the real account (guards against accidental edits)', () => {
    expect(FLOWI_FIELD.contactMessage.id).toBe('5rhhRA8WW0QchEig0C7b');
    expect(FLOWI_FIELD.assessmentResult.id).toBe('qeHBBbCSL5c3ByND5IlI');
    expect(FLOWI_FIELD.contactMessage.key).toBe('contact.tnsi_contact_message');
  });
});

describe('classifyFlowiFailure', () => {
  it.each([
    [new FlowiRequestError('x', 429), 'temporary'],
    [new FlowiRequestError('x', 500), 'temporary'],
    [new FlowiRequestError('x', 503), 'temporary'],
    [new FlowiRequestError('x', 401), 'config'],
    [new FlowiRequestError('x', 403), 'config'],
    [new FlowiRequestError('x', 404), 'config'],
    [new FlowiRequestError('x', 400), 'rejected'],
    [new FlowiRequestError('x', 422), 'rejected'],
    [new FlowiConfigError('not configured'), 'config'],
    [new TypeError('fetch failed'), 'temporary'],
    [Object.assign(new Error('timeout'), { name: 'TimeoutError' }), 'temporary'],
  ])('%j → %s', (error, kind) => {
    expect(classifyFlowiFailure(error)).toBe(kind);
  });
});

describe('Flowi HTTP calls (fake fetch)', () => {
  const fetchMock = vi.fn();
  const saved = { key: process.env.FLOWI_API_KEY, loc: process.env.FLOWI_LOCATION_ID };

  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal('fetch', fetchMock);
    process.env.FLOWI_API_KEY = 'test-key-not-real';
    process.env.FLOWI_LOCATION_ID = 'loc_test';
  });
  afterEach(() => {
    vi.unstubAllGlobals();
    if (saved.key === undefined) delete process.env.FLOWI_API_KEY;
    else process.env.FLOWI_API_KEY = saved.key;
    if (saved.loc === undefined) delete process.env.FLOWI_LOCATION_ID;
    else process.env.FLOWI_LOCATION_ID = saved.loc;
  });

  const ok = (body: unknown) => ({ ok: true, status: 200, json: async () => body });
  const fail = (status: number) => ({ ok: false, status, json: async () => ({}) });

  it('upsert: POSTs to /contacts/upsert with auth and version headers, no tags in the body', async () => {
    fetchMock.mockResolvedValue(ok({ new: true, contact: { id: 'c1' } }));
    const result = await upsertFlowiContact({ email: 'a@example.test', source: 's' });
    expect(result).toEqual({ isNew: true, contactId: 'c1' });
    const [url, init] = fetchMock.mock.calls[0]!;
    expect(url).toBe('https://services.leadconnectorhq.com/contacts/upsert');
    expect(init.method).toBe('POST');
    expect(init.headers.Version).toBe('2021-07-28');
    expect(init.headers.Authorization).toBe('Bearer test-key-not-real');
    const sent = JSON.parse(init.body);
    expect(sent).toEqual({ email: 'a@example.test', source: 's', locationId: 'loc_test' });
    expect(sent).not.toHaveProperty('tags');
    expect(init.signal).toBeDefined(); // a timeout is always set
  });

  it('upsert: a success with no contact id is a failure (the tags could not be added)', async () => {
    fetchMock.mockResolvedValue(ok({ new: true, contact: {} }));
    await expect(
      upsertFlowiContact({ email: 'a@example.test', source: 's' }),
    ).rejects.toMatchObject({
      status: 502,
    });
  });

  it('upsert: a non-2xx response is a FlowiRequestError carrying the status', async () => {
    fetchMock.mockResolvedValue(fail(422));
    await expect(
      upsertFlowiContact({ email: 'a@example.test', source: 's' }),
    ).rejects.toMatchObject({
      status: 422,
    });
  });

  it('upsert: malformed JSON is an error, not a success', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => {
        throw new SyntaxError('bad');
      },
    });
    await expect(upsertFlowiContact({ email: 'a@example.test', source: 's' })).rejects.toThrow();
  });

  it('upsert: not configured fails before any request', async () => {
    delete process.env.FLOWI_API_KEY;
    await expect(
      upsertFlowiContact({ email: 'a@example.test', source: 's' }),
    ).rejects.toBeInstanceOf(FlowiConfigError);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('add tags: POSTs {tags} to /contacts/{id}/tags - the ADD endpoint, never a replace', async () => {
    fetchMock.mockResolvedValue(ok({}));
    await addFlowiContactTags('c 1/x', ['TNSI Website Newsletter']);
    const [url, init] = fetchMock.mock.calls[0]!;
    expect(url).toBe('https://services.leadconnectorhq.com/contacts/c%201%2Fx/tags');
    expect(init.method).toBe('POST');
    expect(init.headers.Version).toBe('2021-07-28');
    expect(JSON.parse(init.body)).toEqual({ tags: ['TNSI Website Newsletter'] });
  });

  it('uses the 8 s default timeout, or a shorter one when the caller sets it', async () => {
    const spy = vi.spyOn(AbortSignal, 'timeout');
    fetchMock.mockResolvedValue(ok({ new: true, contact: { id: 'c1' } }));
    await upsertFlowiContact({ email: 'a@example.test', source: 's' });
    expect(spy).toHaveBeenLastCalledWith(8000);
    await upsertFlowiContact({ email: 'a@example.test', source: 's' }, { timeoutMs: 2500 });
    expect(spy).toHaveBeenLastCalledWith(2500);
    fetchMock.mockResolvedValue(ok({}));
    await addFlowiContactTags('c1', ['T']);
    expect(spy).toHaveBeenLastCalledWith(8000);
    await addFlowiContactTags('c1', ['T'], { timeoutMs: 1200 });
    expect(spy).toHaveBeenLastCalledWith(1200);
    spy.mockRestore();
  });

  it('add tags: nothing to add means no request; a missing contact id is refused', async () => {
    await addFlowiContactTags('c1', []);
    expect(fetchMock).not.toHaveBeenCalled();
    await expect(addFlowiContactTags('', ['T'])).rejects.toMatchObject({ status: 502 });
  });

  it('add tags: a non-2xx response is a FlowiRequestError carrying the status', async () => {
    fetchMock.mockResolvedValue(fail(403));
    await expect(addFlowiContactTags('c1', ['T'])).rejects.toMatchObject({ status: 403 });
  });
});
