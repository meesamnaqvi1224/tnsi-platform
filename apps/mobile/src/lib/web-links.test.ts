import { describe, expect, it } from 'vitest';
import { buildTnsiUrl } from './web-links';

describe('buildTnsiUrl', () => {
  it('points to the official pages on the website origin', () => {
    expect(buildTnsiUrl('https://example.org', 'billing')).toBe(
      'https://example.org/dashboard/billing',
    );
    expect(buildTnsiUrl('https://example.org', 'contact')).toBe('https://example.org/contact');
    expect(buildTnsiUrl('https://example.org', 'privacy')).toBe('https://example.org/privacy');
    expect(buildTnsiUrl('https://example.org', 'terms')).toBe('https://example.org/terms');
    expect(buildTnsiUrl('https://example.org', 'resources')).toBe('https://example.org/resources');
  });
  it('does not double the slash when the base ends with one', () => {
    expect(buildTnsiUrl('https://example.org/', 'terms')).toBe('https://example.org/terms');
  });
});
