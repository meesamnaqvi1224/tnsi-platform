import { describe, expect, it } from 'vitest';
import { UTM_MAX_LENGTH, hasUtm, parseUtmFromSearch, sanitiseUtm } from './utm';

describe('parseUtmFromSearch', () => {
  it('returns only the five known campaign parameters', () => {
    expect(
      parseUtmFromSearch(
        '?utm_source=a&utm_medium=b&utm_campaign=c&utm_term=d&utm_content=e&gclid=zzz&ref=home',
      ),
    ).toEqual({
      utm_source: 'a',
      utm_medium: 'b',
      utm_campaign: 'c',
      utm_term: 'd',
      utm_content: 'e',
    });
  });

  it('ignores empty values and handles no query string', () => {
    expect(parseUtmFromSearch('')).toEqual({});
    expect(parseUtmFromSearch('?utm_source=')).toEqual({});
    expect(parseUtmFromSearch('?utm_source=a')).toEqual({ utm_source: 'a' });
  });

  it('cuts long values', () => {
    const value = parseUtmFromSearch(`?utm_source=${'y'.repeat(1000)}`).utm_source;
    expect(value).toHaveLength(UTM_MAX_LENGTH);
  });
});

describe('sanitiseUtm (anything read back from storage)', () => {
  it('keeps known string keys only', () => {
    expect(sanitiseUtm({ utm_source: 'a', utm_medium: 1, evil: 'x', utm_term: '' })).toEqual({
      utm_source: 'a',
    });
  });

  it('rejects non-objects', () => {
    for (const value of [null, undefined, 'x', 5, [], ['utm_source']]) {
      expect(sanitiseUtm(value)).toEqual({});
    }
  });

  it('hasUtm reports whether anything is present', () => {
    expect(hasUtm({})).toBe(false);
    expect(hasUtm({ utm_source: 'a' })).toBe(true);
  });
});
