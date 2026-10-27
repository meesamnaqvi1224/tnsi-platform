import { describe, expect, it, vi } from 'vitest';

/**
 * The sign-in and sign-up pages hand Clerk an explicit destination, but only a
 * validated one. The Clerk components are replaced with probes that print the
 * props they receive, so this asserts exactly what Clerk would be given.
 */
vi.mock('@clerk/nextjs', () => ({
  SignIn: (props: Record<string, unknown>) => (
    <pre data-component="SignIn">
      {JSON.stringify(props, (_k, v) => (_k !== '' && typeof v === 'object' ? undefined : v))}
    </pre>
  ),
  SignUp: (props: Record<string, unknown>) => (
    <pre data-component="SignUp">
      {JSON.stringify(props, (_k, v) => (_k !== '' && typeof v === 'object' ? undefined : v))}
    </pre>
  ),
}));

import { renderToStaticMarkup } from 'react-dom/server';
import SignInPage from './sign-in/page';
import SignUpPage from './sign-up/page';

async function propsOf(page: typeof SignInPage | typeof SignUpPage, redirect?: string | string[]) {
  const searchParams = Promise.resolve(redirect === undefined ? {} : { redirect_url: redirect });
  const html = renderToStaticMarkup(await page({ searchParams }));
  const match = /<pre data-component="[A-Za-z]+">(.*?)<\/pre>/.exec(html);
  const json = (match?.[1] ?? '{}').replace(/&quot;/g, '"').replace(/&amp;/g, '&');
  return JSON.parse(json) as Record<string, string>;
}

const CASES = [
  ['sign-in', SignInPage, 'signUpUrl', '/sign-up'],
  ['sign-up', SignUpPage, 'signInUrl', '/sign-in'],
] as const;

describe.each(CASES)('%s page', (_name, Page, switchProp, switchPath) => {
  it.each(['monthly', 'annual'])(
    'forces a validated plan destination (%s) and keeps it on the switch link, URL-encoded',
    async (plan) => {
      const props = await propsOf(Page, `/dashboard/billing?plan=${plan}`);
      expect(props.forceRedirectUrl).toBe(`/dashboard/billing?plan=${plan}`);
      expect(props[switchProp]).toBe(
        `${switchPath}?redirect_url=%2Fdashboard%2Fbilling%3Fplan%3D${plan}`,
      );
      expect(props.fallbackRedirectUrl).toBe('/dashboard');
    },
  );

  it('accepts the plain billing page', async () => {
    const props = await propsOf(Page, '/dashboard/billing');
    expect(props.forceRedirectUrl).toBe('/dashboard/billing');
    expect(props[switchProp]).toBe(`${switchPath}?redirect_url=%2Fdashboard%2Fbilling`);
  });

  it.each([
    'https://evil.example/dashboard/billing',
    '//evil.example',
    'javascript:alert(1)',
    '/dashboard/billing?plan=lifetime',
    '/dashboard/billing?plan=monthly&x=1',
    '/dashboard/journey',
    '/dashboard/billing#x',
    '/dashboard/billing/../x',
    '<script>alert(1)</script>',
  ])(
    'falls back safely for %s: nothing forced, plain switch link, default destination',
    async (value) => {
      const props = await propsOf(Page, value);
      expect(props.forceRedirectUrl).toBeUndefined();
      expect(props[switchProp]).toBe(switchPath);
      expect(props.fallbackRedirectUrl).toBe('/dashboard');
    },
  );

  it('a list of values is rejected', async () => {
    const props = await propsOf(Page, ['/dashboard/billing', '/dashboard/billing?plan=annual']);
    expect(props.forceRedirectUrl).toBeUndefined();
  });

  it('without any destination behaves exactly as before', async () => {
    const props = await propsOf(Page);
    expect(props.forceRedirectUrl).toBeUndefined();
    expect(props[switchProp]).toBe(switchPath);
    expect(props.fallbackRedirectUrl).toBe('/dashboard');
    expect(props.routing).toBe('hash');
  });
});
