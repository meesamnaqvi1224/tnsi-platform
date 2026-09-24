import { describe, it, expect, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';

/**
 * Nav-item rendering tests for the Academy sidebar/drawer - added
 * alongside the new Somatic Cards entry (see dashboard-sidebar.tsx).
 * `usePathname` and Clerk's `SignOutButton` are mocked at the module
 * boundary, matching the existing pattern in
 * `../app/dashboard/somatic-cards/somatic-cards-pages.test.tsx` - no real
 * router/Clerk session needed to assert on rendered nav markup.
 */

vi.mock('next/navigation', () => ({ usePathname: () => '/dashboard' }));
vi.mock('@clerk/nextjs', () => ({
  SignOutButton: ({ children }: { children: React.ReactNode }) => children,
}));

const { DashboardSidebar } = await import('./dashboard-sidebar');

describe('DashboardSidebar', () => {
  it('renders a Somatic Cards navigation item', () => {
    const html = renderToStaticMarkup(<DashboardSidebar />);
    expect(html).toContain('Somatic Cards');
  });

  it('the Somatic Cards item links to /dashboard/somatic-cards', () => {
    const html = renderToStaticMarkup(<DashboardSidebar />);
    expect(html).toContain('href="/dashboard/somatic-cards"');
  });

  it('does not mark the Somatic Cards item as "Soon" (it is a real, working destination)', () => {
    const html = renderToStaticMarkup(<DashboardSidebar />);
    const idx = html.indexOf('Somatic Cards');
    const nextBadge = html.indexOf('Soon', idx);
    const nextItemAfterSomatic = html.indexOf('Programs', idx);
    // Either no "Soon" appears before the next item, or it belongs to a
    // later ("Soon") item entirely, not this one.
    expect(nextBadge === -1 || nextBadge > nextItemAfterSomatic).toBe(true);
  });

  it('existing real nav items (Academy Home, Practices, My Journey) are unchanged', () => {
    const html = renderToStaticMarkup(<DashboardSidebar />);
    expect(html).toContain('href="/dashboard"');
    expect(html).toContain('href="/dashboard/practices"');
    expect(html).toContain('href="/dashboard/journey"');
    expect(html).toContain('Academy Home');
    expect(html).toContain('Practices');
    expect(html).toContain('My Journey');
  });

  it('existing roadmap ("Soon") items are unchanged', () => {
    const html = renderToStaticMarkup(<DashboardSidebar />);
    for (const label of [
      'My Learning',
      'Programs',
      'Workshops',
      'Resources',
      'Community',
      'Live Events',
      'Certification',
    ]) {
      expect(html).toContain(label);
    }
  });
});

// DashboardMobileNav (the drawer variant) renders the same `navItems`
// array as DashboardSidebar via the identical NavRowContent/linkClass
// helpers, but its content is inside a closed-by-default Drawer/Dialog
// (portal-rendered only once opened) - not present in static markup, so
// it isn't separately re-tested here; DashboardSidebar's coverage above
// already exercises the shared nav-item data and route.
