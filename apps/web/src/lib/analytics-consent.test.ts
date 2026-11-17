import { describe, expect, it } from 'vitest';
import {
  CONSENT_STORAGE_KEY,
  CONSENT_VERSION,
  cookieDomainCandidates,
  isAnalyticsCookie,
  parseConsentRecord,
  readConsent,
  writeConsent,
  type ConsentStorage,
} from './analytics-consent';
import { parseMeasurementId } from './analytics-config';

function memoryStorage(initial?: Record<string, string>): ConsentStorage & {
  data: Map<string, string>;
} {
  const data = new Map(Object.entries(initial ?? {}));
  return {
    data,
    getItem: (key) => data.get(key) ?? null,
    setItem: (key, value) => {
      data.set(key, value);
    },
  };
}

const NOW = new Date('2026-10-23T12:00:00.000Z');

describe('saved consent record', () => {
  it('round-trips an accept and a reject', () => {
    for (const choice of ['granted', 'denied'] as const) {
      const storage = memoryStorage();
      expect(writeConsent(storage, choice, NOW)).toBe(true);
      expect(readConsent(storage)).toBe(choice);
    }
  });

  it('stores only the choice, a version and a timestamp - no identifier', () => {
    const storage = memoryStorage();
    writeConsent(storage, 'granted', NOW);
    const saved = JSON.parse(storage.data.get(CONSENT_STORAGE_KEY) ?? '{}');
    expect(Object.keys(saved).sort()).toEqual(['choice', 'updatedAt', 'version']);
    expect(saved).toEqual({
      version: CONSENT_VERSION,
      choice: 'granted',
      updatedAt: NOW.toISOString(),
    });
  });

  it('treats nothing, junk, stale versions and wrong shapes as "no choice"', () => {
    expect(readConsent(memoryStorage())).toBeNull();
    expect(parseConsentRecord(null)).toBeNull();
    expect(parseConsentRecord('')).toBeNull();
    expect(parseConsentRecord('not json')).toBeNull();
    expect(parseConsentRecord('"granted"')).toBeNull();
    expect(parseConsentRecord('null')).toBeNull();
    const base = { version: CONSENT_VERSION, choice: 'granted', updatedAt: NOW.toISOString() };
    expect(
      parseConsentRecord(JSON.stringify({ ...base, version: CONSENT_VERSION + 1 })),
    ).toBeNull();
    expect(parseConsentRecord(JSON.stringify({ ...base, version: 0 }))).toBeNull();
    expect(parseConsentRecord(JSON.stringify({ ...base, choice: 'maybe' }))).toBeNull();
    expect(parseConsentRecord(JSON.stringify({ ...base, updatedAt: 5 }))).toBeNull();
    expect(parseConsentRecord(JSON.stringify(base))?.choice).toBe('granted');
  });

  it('never throws when storage is missing or blocked', () => {
    expect(readConsent(null)).toBeNull();
    expect(writeConsent(null, 'granted', NOW)).toBe(false);
    const blocked: ConsentStorage = {
      getItem: () => {
        throw new Error('blocked');
      },
      setItem: () => {
        throw new Error('quota');
      },
    };
    expect(readConsent(blocked)).toBeNull();
    expect(writeConsent(blocked, 'denied', NOW)).toBe(false);
  });
});

describe('Google Analytics cookie recognition', () => {
  it('matches GA4 and legacy analytics cookies', () => {
    for (const name of ['_ga', '_ga_ABC123XYZ', '_gid', '_gat', '_gat_gtag_UA_1']) {
      expect(isAnalyticsCookie(name)).toBe(true);
    }
  });

  it('matches nothing else - not sign-in cookies, not the consent record', () => {
    for (const name of [
      '__session',
      '__clerk_db_jwt',
      '__client_uat',
      CONSENT_STORAGE_KEY,
      'gaming',
      '_gaX',
      'ga',
      '_g',
    ]) {
      expect(isAnalyticsCookie(name)).toBe(false);
    }
  });
});

describe('cookie domain candidates for expiry', () => {
  it('covers every parent domain, with and without the leading dot, but never a bare TLD', () => {
    expect(cookieDomainCandidates('www.thenervoussysteminstitute.com')).toEqual([
      'www.thenervoussysteminstitute.com',
      '.www.thenervoussysteminstitute.com',
      'thenervoussysteminstitute.com',
      '.thenervoussysteminstitute.com',
    ]);
    expect(cookieDomainCandidates('thenervoussysteminstitute.com')).toEqual([
      'thenervoussysteminstitute.com',
      '.thenervoussysteminstitute.com',
    ]);
    expect(cookieDomainCandidates('x.y.com')).not.toContain('com');
    expect(cookieDomainCandidates('x.y.com')).not.toContain('.com');
  });

  it('uses only the host itself for localhost and IP addresses', () => {
    expect(cookieDomainCandidates('localhost')).toEqual(['localhost']);
    expect(cookieDomainCandidates('127.0.0.1')).toEqual(['127.0.0.1']);
    expect(cookieDomainCandidates('')).toEqual([]);
  });
});

describe('measurement ID configuration (fail closed)', () => {
  it('accepts a well-formed GA4 ID, trimmed', () => {
    expect(parseMeasurementId('G-ABCD1234')).toBe('G-ABCD1234');
    expect(parseMeasurementId('  G-ABCD1234  ')).toBe('G-ABCD1234');
  });

  it('turns analytics off for missing or malformed values instead of throwing', () => {
    for (const value of [
      undefined,
      null,
      '',
      '   ',
      'UA-12345-1',
      'g-abcd1234',
      'G-',
      'G-ab',
      'G-ABCD 1234',
      'G-ABCD1234;alert(1)',
      '<script>',
    ]) {
      expect(parseMeasurementId(value)).toBeUndefined();
    }
  });
});
