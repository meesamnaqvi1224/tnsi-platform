import { describe, expect, it } from 'vitest';
import {
  PRODUCTION_DB_ENDPOINT,
  assertNotProductionFromDev,
  isProductionDatabase,
} from '@tnsi/db/production-guard';

const prod = `postgresql://u:p@${PRODUCTION_DB_ENDPOINT}.c-5.us-east-2.aws.neon.tech/db`;
const prodPooled = `postgresql://u:p@${PRODUCTION_DB_ENDPOINT}-pooler.c-5.us-east-2.aws.neon.tech/db`;
const isolated = 'postgresql://u:p@ep-small-river-abc123.c-5.us-east-2.aws.neon.tech/db';

describe('production database guard', () => {
  it('recognises the production host, pooled or not, and nothing else', () => {
    expect(isProductionDatabase(prod)).toBe(true);
    expect(isProductionDatabase(prodPooled)).toBe(true);
    expect(isProductionDatabase(isolated)).toBe(false);
    expect(isProductionDatabase('postgresql://postgres:postgres@localhost:5432/d')).toBe(false);
  });

  it.each([prod, prodPooled])('refuses production from dev and test', (url) => {
    expect(() => assertNotProductionFromDev(url, { NODE_ENV: 'development' })).toThrow(
      /PRODUCTION/,
    );
    expect(() => assertNotProductionFromDev(url, { NODE_ENV: 'test' })).toThrow(/PRODUCTION/);
    expect(() => assertNotProductionFromDev(url, {})).toThrow(/PRODUCTION/);
  });

  it('allows production when NODE_ENV is production (deployed behaviour unchanged)', () => {
    expect(() => assertNotProductionFromDev(prodPooled, { NODE_ENV: 'production' })).not.toThrow();
  });

  it('allows an explicit one-command override, and only the exact value yes', () => {
    expect(() =>
      assertNotProductionFromDev(prod, {
        NODE_ENV: 'development',
        ALLOW_PRODUCTION_DB_OPERATIONS: 'yes',
      }),
    ).not.toThrow();
    expect(() =>
      assertNotProductionFromDev(prod, {
        NODE_ENV: 'development',
        ALLOW_PRODUCTION_DB_OPERATIONS: 'true',
      }),
    ).toThrow();
  });

  it('never blocks an isolated branch', () => {
    expect(() => assertNotProductionFromDev(isolated, { NODE_ENV: 'development' })).not.toThrow();
  });

  it('does not put the connection string in the error message', () => {
    try {
      assertNotProductionFromDev(prod, { NODE_ENV: 'development' });
    } catch (e) {
      expect(String(e)).not.toContain('u:p@');
      expect(String(e)).not.toContain(PRODUCTION_DB_ENDPOINT);
    }
  });
});
