import { describe, expect, it } from 'vitest';
import { parseAuthRedirect, signInUrlFor, signUpUrlFor } from '@/lib/auth-redirect';

describe('parseAuthRedirect: what is allowed', () => {
  it.each([
    '/dashboard/billing',
    '/dashboard/billing?plan=monthly',
    '/dashboard/billing?plan=annual',
  ])('accepts %s and returns it unchanged', (value) => {
    expect(parseAuthRedirect(value)).toBe(value);
  });
});

describe('parseAuthRedirect: what is rejected', () => {
  const rejected: [string, unknown][] = [
    ['nothing', undefined],
    ['an empty value', ''],
    ['a list of values', ['/dashboard/billing', '/dashboard/billing?plan=annual']],
    ['an absolute external URL', 'https://evil.example/dashboard/billing'],
    ['the same-origin absolute URL', 'http://localhost:3000/dashboard/billing?plan=monthly'],
    ['a protocol-relative URL', '//evil.example/dashboard/billing'],
    [
      'a protocol-relative URL with a path that looks right',
      '//evil.example/%2Fdashboard%2Fbilling',
    ],
    ['a backslash trick', '/\\evil.example'],
    ['a backslash path', '/dashboard\\billing'],
    ['a javascript: URL', 'javascript:alert(1)'],
    ['a data: URL', 'data:text/html,<script>alert(1)</script>'],
    ['a different dashboard path', '/dashboard'],
    ['another dashboard page', '/dashboard/journey'],
    ['a longer path under billing', '/dashboard/billing/extra'],
    ['a trailing slash', '/dashboard/billing/'],
    ['a path that merely starts the same', '/dashboard/billingx'],
    ['a path that ends the same elsewhere', '/x/dashboard/billing'],
    ['path traversal', '/dashboard/billing/../../admin'],
    ['encoded slashes', '%2Fdashboard%2Fbilling'],
    ['a double-encoded path', '/dashboard%2Fbilling'],
    ['a different casing', '/Dashboard/Billing'],
    ['an unknown plan', '/dashboard/billing?plan=lifetime'],
    ['an upper-case plan', '/dashboard/billing?plan=ANNUAL'],
    ['an empty plan', '/dashboard/billing?plan='],
    ['an extra parameter', '/dashboard/billing?plan=monthly&x=1'],
    ['a different parameter', '/dashboard/billing?success=true&session_id=cs_test_abc'],
    ['a fragment', '/dashboard/billing#x'],
    ['a plan plus a fragment', '/dashboard/billing?plan=annual#x'],
    ['a trailing newline', '/dashboard/billing?plan=monthly\n'],
    ['a carriage return', '/dashboard/billing\r?plan=monthly'],
    ['a leading tab then a protocol-relative URL', '\t//evil.example'],
    ['a leading space', ' /dashboard/billing'],
    ['a null byte', '/dashboard/billing\u0000'],
    ['a script injection', '/dashboard/billing?plan=<script>alert(1)</script>'],
    ['a quote injection', '/dashboard/billing?plan=monthly"onmouseover="x'],
    ['an over-long value', `/dashboard/billing?plan=monthly${'a'.repeat(200)}`],
    ['a non-string', 42 as unknown],
  ];

  it.each(rejected)('rejects %s', (_label, value) => {
    expect(parseAuthRedirect(value as string | string[] | undefined)).toBeUndefined();
  });
});

describe('the sign-in and sign-up links', () => {
  it('are the plain pages when there is no destination, exactly as before', () => {
    expect(signInUrlFor(undefined)).toBe('/sign-in');
    expect(signUpUrlFor(undefined)).toBe('/sign-up');
  });

  it('carry the destination URL-encoded as a single value', () => {
    expect(signInUrlFor('/dashboard/billing?plan=monthly')).toBe(
      '/sign-in?redirect_url=%2Fdashboard%2Fbilling%3Fplan%3Dmonthly',
    );
    expect(signUpUrlFor('/dashboard/billing?plan=annual')).toBe(
      '/sign-up?redirect_url=%2Fdashboard%2Fbilling%3Fplan%3Dannual',
    );
    expect(signUpUrlFor('/dashboard/billing')).toBe('/sign-up?redirect_url=%2Fdashboard%2Fbilling');
  });

  it('round-trip: what a page builds, the other page accepts', () => {
    for (const destination of [
      '/dashboard/billing',
      '/dashboard/billing?plan=monthly',
      '/dashboard/billing?plan=annual',
    ]) {
      const href = signInUrlFor(destination);
      const value = new URL(href, 'http://localhost').searchParams.get('redirect_url') ?? undefined;
      expect(parseAuthRedirect(value)).toBe(destination);
    }
  });
});
