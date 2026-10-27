import { describe, expect, it, vi } from 'vitest';

vi.mock('@tnsi/db', () => ({
  crmOutbox: { kind: 'kind', email: 'email', createdAt: 'created_at' },
}));

import {
  FORM_LIMITS,
  honeypotTripped,
  isBodyTooLarge,
  isCrossOrigin,
  isRateLimited,
  withinRateLimit,
} from './form-guard';

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

  it('refuses a request the browser marks as cross-site, whatever its Origin says', () => {
    expect(
      isCrossOrigin(
        request({ origin: 'https://site.test', host: 'site.test', 'sec-fetch-site': 'cross-site' }),
      ),
    ).toBe(true);
  });

  it('accepts a request the browser marks same-origin', () => {
    expect(
      isCrossOrigin(
        request({
          origin: 'https://site.test',
          host: 'site.test',
          'sec-fetch-site': 'same-origin',
        }),
      ),
    ).toBe(false);
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

describe('isBodyTooLarge', () => {
  it('refuses a declared body over the limit and accepts one under it', () => {
    expect(isBodyTooLarge(request({ 'content-length': '20001' }))).toBe(true);
    expect(isBodyTooLarge(request({ 'content-length': '5000' }))).toBe(false);
  });

  it('leaves a body with no declared length to validation', () => {
    expect(isBodyTooLarge(request({}))).toBe(false);
  });
});

/** Finds the advisory-lock key inside a drizzle `sql` object. */
function lockKeyOf(query: unknown): string {
  const found: string[] = [];
  const walk = (node: unknown) => {
    if (typeof node === 'string' && /^(contact_form|newsletter|assessment):/.test(node)) {
      found.push(node);
    } else if (Array.isArray(node)) node.forEach(walk);
    else if (node && typeof node === 'object') Object.values(node).forEach(walk);
  };
  walk(query);
  return found[0] ?? '';
}

/**
 * A fake database with real mutual exclusion on the advisory lock, a shared row
 * count, and per-transaction counting - enough to show concurrent submissions
 * from one address cannot all pass the check.
 */
function lockingDb(options: { failLock?: boolean; rows?: Record<string, number> } = {}) {
  const rows: Record<string, number> = options.rows ?? {};
  const tails = new Map<string, Promise<void>>();
  let keyOfCurrent = '';
  const make = () => {
    let release: () => void = () => undefined;
    let key = '';
    const tx = {
      execute: async (query: unknown) => {
        if (options.failLock) throw new Error('lock failed');
        key = lockKeyOf(query);
        const previous = tails.get(key) ?? Promise.resolve();
        const mine = new Promise<void>((resolve) => (release = resolve));
        tails.set(
          key,
          previous.then(() => mine),
        );
        await previous;
        keyOfCurrent = key;
      },
      select: () => ({
        from: () => ({ where: async () => [{ n: rows[keyOfCurrent || key] ?? 0 }] }),
      }),
      bump: () => {
        rows[key] = (rows[key] ?? 0) + 1;
      },
      done: () => release(),
    };
    return tx;
  };
  return {
    rows,
    transaction: async <R>(fn: (tx: ReturnType<typeof make>) => Promise<R>): Promise<R> => {
      const tx = make();
      try {
        return await fn(tx);
      } finally {
        tx.done();
      }
    },
    bump: () => undefined,
  };
}

describe('withinRateLimit', () => {
  it('runs the work, with the transaction, when under the limit', async () => {
    const db = lockingDb();
    const result = await withinRateLimit(db, 'contact_form', 'a@b.test', async (tx) => {
      tx.bump();
      return 'stored';
    });
    expect(result).toEqual({ limited: false, value: 'stored' });
  });

  it('does not run the work when the address is at its limit', async () => {
    const db = lockingDb({ rows: { 'contact_form:a@b.test': FORM_LIMITS.perEmail.max } });
    const work = vi.fn(async () => 'stored');
    // The fake counts per lock key; seed the key the function will use.
    const result = await withinRateLimit(db, 'contact_form', 'A@B.test ', work);
    expect(result).toEqual({ limited: true });
    expect(work).not.toHaveBeenCalled();
  });

  it('lets only the allowed number of CONCURRENT submissions from one address through', async () => {
    const db = lockingDb();
    const attempts = Array.from({ length: 12 }, () =>
      withinRateLimit(db, 'newsletter', 'Same@Example.test', async (tx) => {
        await new Promise((resolve) => setTimeout(resolve, 1)); // widen the race window
        tx.bump();
        return 'stored';
      }),
    );
    const results = await Promise.all(attempts);
    expect(results.filter((r) => !r.limited)).toHaveLength(FORM_LIMITS.perEmail.max);
    expect(results.filter((r) => r.limited)).toHaveLength(12 - FORM_LIMITS.perEmail.max);
  });

  it('does not let different addresses block each other', async () => {
    const db = lockingDb();
    const results = await Promise.all(
      Array.from({ length: 8 }, (_, i) =>
        withinRateLimit(db, 'newsletter', `user${i}@example.test`, async (tx) => {
          tx.bump();
          return 'stored';
        }),
      ),
    );
    expect(results.every((r) => !r.limited)).toBe(true);
  });

  it('fails open when the limiter itself fails, running the work once outside the transaction', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const db = lockingDb({ failLock: true });
    const work = vi.fn(async () => 'stored');
    const result = await withinRateLimit(db, 'contact_form', 'a@b.test', work);
    expect(result).toEqual({ limited: false, value: 'stored' });
    expect(work).toHaveBeenCalledTimes(1);
    expect(warn).toHaveBeenCalled();
    warn.mockRestore();
  });

  it('propagates a failure of the work itself, unchanged, without retrying it or failing open', async () => {
    const db = lockingDb();
    const boom = new Error('could not store');
    const work = vi.fn(async () => {
      throw boom;
    });
    await expect(withinRateLimit(db, 'contact_form', 'a@b.test', work)).rejects.toBe(boom);
    expect(work).toHaveBeenCalledTimes(1);
  });
});
