import { afterEach, describe, expect, it, vi } from 'vitest';
import { ReflectionRequestError, reflectionsApi } from './reflections-web-client';

const SECRET = 'my private words SECRET-TEXT';

function respond(status: number, body: unknown) {
  vi.stubGlobal(
    'fetch',
    vi.fn(async () => new Response(JSON.stringify(body), { status })),
  );
}

afterEach(() => vi.unstubAllGlobals());

describe('reflectionsApi', () => {
  it('unwraps the data envelope and sends JSON with no caching', async () => {
    respond(201, { data: { id: 'e1' } });
    const result = await reflectionsApi.post('/api/v1/journal/entries', { content: SECRET });
    expect(result).toEqual({ id: 'e1' });
    const [path, init] = (fetch as unknown as ReturnType<typeof vi.fn>).mock.calls[0]!;
    expect(path).toBe('/api/v1/journal/entries');
    expect(init).toMatchObject({ method: 'POST', cache: 'no-store' });
    expect(JSON.parse(init.body)).toEqual({ content: SECRET });
  });

  it('throws an error carrying only status and code - never the server message or the request', async () => {
    respond(423, { error: { code: 'ACCOUNT_DELETION_PENDING', message: `x ${SECRET}` } });
    const err = (await reflectionsApi
      .get('/api/v1/journal/entries/e1')
      .catch((e) => e)) as ReflectionRequestError;
    expect(err).toBeInstanceOf(ReflectionRequestError);
    expect(err).toMatchObject({ status: 423, code: 'ACCOUNT_DELETION_PENDING' });
    expect(JSON.stringify({ ...err, message: err.message })).not.toContain('SECRET');
  });

  it('reports a dropped connection as status 0, and an unreadable reply as an error', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => Promise.reject(new TypeError('offline'))),
    );
    expect(await reflectionsApi.delete('/x').catch((e) => e)).toMatchObject({ status: 0 });
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response('<html>', { status: 502 })),
    );
    expect(await reflectionsApi.patch('/x', {}).catch((e) => e)).toMatchObject({ status: 502 });
  });
});
