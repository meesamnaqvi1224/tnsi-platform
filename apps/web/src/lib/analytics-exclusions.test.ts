import { describe, expect, it } from 'vitest';
import { ANALYTICS_EXCLUDED_PATH_PREFIXES, isAnalyticsExcludedPath } from './analytics-exclusions';

describe('isAnalyticsExcludedPath', () => {
  it('excludes the reflections area and everything under it', () => {
    expect(isAnalyticsExcludedPath('/dashboard/reflections')).toBe(true);
    expect(isAnalyticsExcludedPath('/dashboard/reflections/')).toBe(true);
    expect(isAnalyticsExcludedPath('/dashboard/reflections/new')).toBe(true);
    expect(
      isAnalyticsExcludedPath('/dashboard/reflections/3f2b6c1e-8a4d-4c7e-9b1a-2d5e6f708192'),
    ).toBe(true);
  });

  it('leaves every other page tracked, as before', () => {
    for (const path of [
      '/',
      '/method',
      '/dashboard',
      '/dashboard/journey',
      '/dashboard/practices',
      '/dashboard/billing',
      '/dashboard/reflections-archive', // a sibling that merely shares the prefix text
      '/dashboard/reflectionsX',
      '/articles/reflections',
    ]) {
      expect(isAnalyticsExcludedPath(path)).toBe(false);
    }
  });

  it('is safe with no path', () => {
    expect(isAnalyticsExcludedPath(null)).toBe(false);
    expect(isAnalyticsExcludedPath(undefined)).toBe(false);
    expect(isAnalyticsExcludedPath('')).toBe(false);
  });

  it('lists only reflection pages', () => {
    expect([...ANALYTICS_EXCLUDED_PATH_PREFIXES]).toEqual(['/dashboard/reflections']);
  });
});
