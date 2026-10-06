import { describe, expect, it } from 'vitest';
import { resolveSiteUrl } from './env';

describe('resolveSiteUrl', () => {
  it('uses NEXT_PUBLIC_SITE_URL whenever it is set (Production)', () => {
    expect(
      resolveSiteUrl({
        NEXT_PUBLIC_SITE_URL: 'https://tnsi-platform.vercel.app',
        VERCEL_ENV: 'production',
        VERCEL_URL: 'tnsi-platform-abc.vercel.app',
      }),
    ).toBe('https://tnsi-platform.vercel.app');
  });

  it('keeps the explicit URL even on a preview', () => {
    expect(
      resolveSiteUrl({
        NEXT_PUBLIC_SITE_URL: 'https://example.com',
        VERCEL_ENV: 'preview',
        VERCEL_BRANCH_URL: 'branch.vercel.app',
      }),
    ).toBe('https://example.com');
  });

  it('on a Vercel preview without an explicit URL, uses the branch URL, then the deployment URL', () => {
    expect(
      resolveSiteUrl({
        VERCEL_ENV: 'preview',
        VERCEL_BRANCH_URL: 'b.vercel.app',
        VERCEL_URL: 'd.vercel.app',
      }),
    ).toBe('https://b.vercel.app');
    expect(resolveSiteUrl({ VERCEL_ENV: 'preview', VERCEL_URL: 'd.vercel.app' })).toBe(
      'https://d.vercel.app',
    );
  });

  it('never invents a URL outside a Vercel preview (production without the variable, local, tests)', () => {
    expect(
      resolveSiteUrl({ VERCEL_ENV: 'production', VERCEL_URL: 'd.vercel.app' }),
    ).toBeUndefined();
    expect(resolveSiteUrl({ VERCEL_ENV: 'preview' })).toBeUndefined();
    expect(resolveSiteUrl({})).toBeUndefined();
  });
});
