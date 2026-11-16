import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  addFlowiContactTags,
  buildUpsertBody,
  toRequestTimeoutMs,
  classifyFlowiFailure,
  deleteFlowiContact,
  findFlowiContactIdByEmail,
  FlowiConfigError,
  FlowiRequestError,
  suppressFlowiContact,
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

  it('accepts a FRACTIONAL timeout (regression: AbortSignal.timeout throws RangeError on non-integers)', async () => {
    // Real AbortSignal.timeout is used here, as in production: a fractional value used to
    // throw before any request was sent, so every immediate delivery attempt failed.
    fetchMock.mockResolvedValue(ok({ new: true, contact: { id: 'c1' } }));
    await expect(
      upsertFlowiContact({ email: 'a@example.test', source: 's' }, { timeoutMs: 2999.78 }),
    ).resolves.toEqual({ isNew: true, contactId: 'c1' });
    fetchMock.mockResolvedValue(ok({}));
    await expect(addFlowiContactTags('c1', ['T'], { timeoutMs: 1234.5 })).resolves.toBeUndefined();
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('hands AbortSignal.timeout a whole number, whatever the caller passes', async () => {
    const spy = vi.spyOn(AbortSignal, 'timeout');
    fetchMock.mockResolvedValue(ok({ new: true, contact: { id: 'c1' } }));
    await upsertFlowiContact({ email: 'a@example.test', source: 's' }, { timeoutMs: 2999.99 });
    expect(spy).toHaveBeenLastCalledWith(2999);
    fetchMock.mockResolvedValue(ok({}));
    await addFlowiContactTags('c1', ['T'], { timeoutMs: 0.4 });
    expect(spy).toHaveBeenLastCalledWith(1);
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

describe('toRequestTimeoutMs', () => {
  it.each([
    [undefined, 8000],
    [3000, 3000],
    [2999.78, 2999],
    [0.2, 1],
    [0, 1],
    [-50, 1],
    [Number.NaN, 8000],
    [Number.POSITIVE_INFINITY, 8000],
  ])('%s → %s', (input, expected) => {
    expect(toRequestTimeoutMs(input)).toBe(expected);
    expect(Number.isInteger(toRequestTimeoutMs(input))).toBe(true);
  });
});

/**
 * Account-deletion calls against a FAKE Flowi. These follow GoHighLevel's published API and have
 * not been run against the real account (see the note in flowi.ts): the tests prove what OUR client
 * sends and how it treats each response - in particular that none of these calls can create a contact.
 */
describe('Flowi account-deletion calls (fake fetch)', () => {
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
  const status = (code: number) => ({ ok: false, status: code, json: async () => ({}) });

  it('lookup: a read-only GET for the email in our location; returns the id', async () => {
    fetchMock.mockResolvedValue(ok({ contact: { id: 'c9' } }));
    expect(await findFlowiContactIdByEmail('a+b@example.test')).toBe('c9');
    const [url, init] = fetchMock.mock.calls[0]!;
    const parsed = new URL(url as string);
    expect(parsed.pathname).toBe('/contacts/search/duplicate');
    expect(parsed.searchParams.get('locationId')).toBe('loc_test');
    expect(parsed.searchParams.get('email')).toBe('a+b@example.test');
    expect(init.method).toBe('GET');
    expect(init.body).toBeUndefined();
    expect(init.headers.Authorization).toBe('Bearer test-key-not-real');
  });

  it('lookup: no such contact is null, not an error', async () => {
    fetchMock.mockResolvedValue(ok({ contact: null }));
    expect(await findFlowiContactIdByEmail('nobody@example.test')).toBeNull();
    fetchMock.mockResolvedValue(ok({}));
    expect(await findFlowiContactIdByEmail('nobody@example.test')).toBeNull();
  });

  it('lookup: a failure is reported with its status, so it is retried rather than read as "no contact"', async () => {
    fetchMock.mockResolvedValue(status(503));
    await expect(findFlowiContactIdByEmail('a@example.test')).rejects.toMatchObject({
      status: 503,
    });
    fetchMock.mockResolvedValue(status(401));
    await expect(findFlowiContactIdByEmail('a@example.test')).rejects.toBeInstanceOf(
      FlowiRequestError,
    );
  });

  it('suppress: PUTs dnd:true to the existing contact and nothing else', async () => {
    fetchMock.mockResolvedValue(ok({}));
    expect(await suppressFlowiContact('c 9')).toBe(true);
    const [url, init] = fetchMock.mock.calls[0]!;
    expect(url).toBe('https://services.leadconnectorhq.com/contacts/c%209');
    expect(init.method).toBe('PUT');
    expect(JSON.parse(init.body)).toEqual({ dnd: true });
  });

  it('delete: DELETEs the contact by id, with no body', async () => {
    fetchMock.mockResolvedValue(ok({ succeded: true }));
    expect(await deleteFlowiContact('c9')).toBe(true);
    const [url, init] = fetchMock.mock.calls[0]!;
    expect(url).toBe('https://services.leadconnectorhq.com/contacts/c9');
    expect(init.method).toBe('DELETE');
    expect(init.body).toBeUndefined();
  });

  it('suppress and delete: a contact that is already gone (404) is the outcome wanted, not a failure', async () => {
    fetchMock.mockResolvedValue(status(404));
    expect(await suppressFlowiContact('c9')).toBe(false);
    expect(await deleteFlowiContact('c9')).toBe(false);
  });

  it('suppress and delete: any other failure is thrown with its status so the job is retried', async () => {
    fetchMock.mockResolvedValue(status(500));
    await expect(suppressFlowiContact('c9')).rejects.toMatchObject({ status: 500 });
    await expect(deleteFlowiContact('c9')).rejects.toMatchObject({ status: 500 });
    fetchMock.mockResolvedValue(status(403));
    await expect(deleteFlowiContact('c9')).rejects.toMatchObject({ status: 403 });
  });

  it('none of the three ever calls the upsert endpoint, so none can create a contact', async () => {
    fetchMock.mockResolvedValue(ok({ contact: { id: 'c9' } }));
    await findFlowiContactIdByEmail('a@example.test');
    await suppressFlowiContact('c9');
    await deleteFlowiContact('c9');
    for (const [url, init] of fetchMock.mock.calls) {
      expect(String(url)).not.toContain('/upsert');
      expect(init.method).not.toBe('POST');
    }
  });

  it('not configured: throws a configuration error and makes no request', async () => {
    delete process.env.FLOWI_API_KEY;
    await expect(findFlowiContactIdByEmail('a@example.test')).rejects.toBeInstanceOf(
      FlowiConfigError,
    );
    await expect(suppressFlowiContact('c9')).rejects.toBeInstanceOf(FlowiConfigError);
    await expect(deleteFlowiContact('c9')).rejects.toBeInstanceOf(FlowiConfigError);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('refuses an empty contact id rather than calling the collection URL', async () => {
    await expect(suppressFlowiContact('')).rejects.toBeInstanceOf(FlowiRequestError);
    await expect(deleteFlowiContact('')).rejects.toBeInstanceOf(FlowiRequestError);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
