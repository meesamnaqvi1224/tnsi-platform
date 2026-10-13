import { describe, expect, it } from 'vitest';
import { reliableLastModified } from './sitemap-dates';

const NOW = new Date('2026-10-13T12:00:00.000Z');

describe('reliableLastModified', () => {
  it('returns the first valid candidate', () => {
    expect(reliableLastModified(['2026-09-01T10:00:00.000Z', '2026-01-01'], NOW)).toEqual(
      new Date('2026-09-01T10:00:00.000Z'),
    );
  });

  it('skips missing and unparseable candidates', () => {
    expect(reliableLastModified([null, undefined, '', 'June 2026', '2026-05-02'], NOW)).toEqual(
      new Date('2026-05-02'),
    );
  });

  it('rejects display labels that Date() would leniently parse', () => {
    expect(reliableLastModified(['June 2026', 'May 2026', '03/04/2026'], NOW)).toBeUndefined();
  });

  it('rejects dates in the future beyond a day of clock skew', () => {
    expect(reliableLastModified(['2026-10-20T00:00:00.000Z'], NOW)).toBeUndefined();
    expect(reliableLastModified(['2026-10-14T00:00:00.000Z'], NOW)).toBeInstanceOf(Date);
  });

  it('returns undefined when nothing is reliable', () => {
    expect(reliableLastModified([], NOW)).toBeUndefined();
    expect(reliableLastModified([null, 'not a date'], NOW)).toBeUndefined();
  });
});
