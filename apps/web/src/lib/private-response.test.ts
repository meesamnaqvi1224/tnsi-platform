import { afterEach, describe, expect, it, vi } from 'vitest';
import { NextResponse } from 'next/server';
import { PRIVATE_NO_STORE, asPrivate, privateRoute, safeErrorCode } from './private-response';

afterEach(() => vi.restoreAllMocks());

describe('asPrivate', () => {
  it('marks a response private, no-store', () => {
    const res = asPrivate(NextResponse.json({ ok: true }));
    expect(res.headers.get('Cache-Control')).toBe(PRIVATE_NO_STORE);
    expect(PRIVATE_NO_STORE).toContain('private');
    expect(PRIVATE_NO_STORE).toContain('no-store');
    expect(res.headers.get('Pragma')).toBe('no-cache');
  });
});

describe('privateRoute', () => {
  it('applies the private headers to a normal response, including an error status', async () => {
    const ok = await privateRoute('t', async () => NextResponse.json({ a: 1 }))();
    const nf = await privateRoute('t', async () => NextResponse.json({ e: 1 }, { status: 404 }))();
    expect(ok.headers.get('Cache-Control')).toBe(PRIVATE_NO_STORE);
    expect(nf.headers.get('Cache-Control')).toBe(PRIVATE_NO_STORE);
    expect(nf.status).toBe(404);
  });

  it('turns a thrown error into a generic 500 that carries none of its detail, and logs only a label and a code', async () => {
    const SECRET = 'my private journal text SECRET-TEXT';
    const spy = {
      error: vi.spyOn(console, 'error').mockImplementation(() => {}),
      warn: vi.spyOn(console, 'warn').mockImplementation(() => {}),
      log: vi.spyOn(console, 'log').mockImplementation(() => {}),
      info: vi.spyOn(console, 'info').mockImplementation(() => {}),
    };
    // what a Postgres driver error looks like: it carries the SQL and the bound parameters (the member's text)
    const driverError = Object.assign(new Error(`insert failed for ${SECRET}`), {
      code: '23514',
      query: `insert into journal_entries (content) values ('${SECRET}')`,
      parameters: [SECRET],
    });

    const res = await privateRoute('journal create', async () => {
      throw driverError;
    })();

    expect(res.status).toBe(500);
    expect(res.headers.get('Cache-Control')).toBe(PRIVATE_NO_STORE);
    expect(JSON.stringify(await res.json())).not.toContain('SECRET');
    expect(spy.error).toHaveBeenCalledTimes(1);
    for (const fn of Object.values(spy)) {
      expect(JSON.stringify(fn.mock.calls)).not.toContain('SECRET');
    }
    expect(spy.error.mock.calls[0]).toEqual(['[journal create] request failed', { code: '23514' }]);
  });
});

describe('safeErrorCode', () => {
  it('returns a short code only, never anything else from the error', () => {
    expect(safeErrorCode({ code: '23505' })).toBe('23505');
    expect(safeErrorCode({ code: 'x'.repeat(40) })).toBe('unknown');
    expect(safeErrorCode({ code: 'has space' })).toBe('unknown');
    expect(safeErrorCode(new Error('boom'))).toBe('unknown');
    expect(safeErrorCode(null)).toBe('unknown');
  });
});
