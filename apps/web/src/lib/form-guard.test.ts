import { describe, expect, it, vi } from 'vitest';

vi.mock('@tnsi/db', () => ({
  crmOutbox: { kind: 'kind', email: 'email', createdAt: 'created_at' },
}));

import { FORM_LIMITS, honeypotTripped, isCrossOrigin, isRateLimited } from './form-guard';

function request(headers: Record<string, string>) {
  return new Request('http://example.test/api/contact', { method: 'POST', headers });
}

describe('isCrossOrigin', () => {
  it('accepts a request from the same host', () => {
    expect(isCrossOrigin(request({ origin: 'https://site.test', host: 'site.test' }))).toBe(false);
  });

  it('refuses a request whose Origin is another site', () => {
    expect(isCrossOrigin(request({ origin: 'https://evil.test', host: 'site.test' }))).toBe(true);
  });

  it('honours the forwarded host behind the platform proxy', () => {
    expect(
      isCrossOrigin(
        request({ origin: 'https://site.test', host: 'internal', 'x-forwarded-host': 'site.test' }),
      ),
    ).toBe(false);
  });

  it('refuses an Origin that is not a URL', () => {
    expect(isCrossOrigin(request({ origin: 'not a url', host: 'site.test' }))).toBe(true);
  });

  it('does not treat a missing Origin as hostile (non-browser callers)', () => {
    expect(isCrossOrigin(request({ host: 'site.test' }))).toBe(false);
  });
});

describe('honeypotTripped', () => {
  it('is false when the hidden field is absent or empty', () => {
    expect(honeypotTripped({ email: 'a@b.test' })).toBe(false);
    expect(honeypotTripped({ website: '' })).toBe(false);
    expect(honeypotTripped({ website: '   ' })).toBe(false);
    expect(honeypotTripped(null)).toBe(false);
    expect(honeypotTripped('text')).toBe(false);
  });

  it('is true when anything is put in the hidden field', () => {
    expect(honeypotTripped({ website: 'http://spam.test' })).toBe(true);
    expect(honeypotTripped({ website: 1 })).toBe(true);
  });
});

function dbCounting(counts: number[]) {
  let call = 0;
  return {
    select: () => ({
      from: () => ({ where: async () => [{ n: counts[call++] ?? 0 }] }),
    }),
  };
}

describe('isRateLimited', () => {
  it('allows a first submission', async () => {
    expect(await isRateLimited(dbCounting([0, 0]), 'contact_form', 'a@b.test')).toBe(false);
  });

  it('refuses once one email address reaches its hourly limit', async () => {
    expect(
      await isRateLimited(dbCounting([FORM_LIMITS.perEmail.max, 0]), 'contact_form', 'a@b.test'),
    ).toBe(true);
  });

  it('allows an address just under its limit', async () => {
    expect(
      await isRateLimited(dbCounting([FORM_LIMITS.perEmail.max - 1, 0]), 'newsletter', 'a@b.test'),
    ).toBe(false);
  });

  it('refuses everyone when the whole form is being flooded', async () => {
    expect(
      await isRateLimited(dbCounting([0, FORM_LIMITS.perForm.max]), 'assessment', 'new@b.test'),
    ).toBe(true);
  });

  it('fails open if the check itself errors, so a limiter fault never blocks real visitors', async () => {
    const broken = {
      select: () => {
        throw new Error('db down');
      },
    };
    expect(await isRateLimited(broken, 'contact_form', 'a@b.test')).toBe(false);
  });
});
