import { describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { renderToStaticMarkup } from 'react-dom/server';

vi.mock('@/components/layout/site-header', () => ({ SiteHeader: () => null }));
vi.mock('@/components/layout/site-footer', () => ({ SiteFooter: () => null }));

const { default: DeleteAccountPage, metadata } = await import('./page');

describe('public account-deletion page', () => {
  const html = renderToStaticMarkup(<DeleteAccountPage />);

  it('explains the in-app and website routes and the way in for someone who cannot sign in', () => {
    expect(html).toContain('Delete Your Account');
    expect(html).toContain('Profile, then tap Delete Account');
    expect(html).toContain('open Account in the Academy menu');
    expect(html).toContain('If you can no longer sign in');
    expect(html).toContain('href="/contact"');
    // The sign-in button carries where to return to, so a visitor lands on the Account page afterwards.
    expect(html).toContain('href="/sign-in?redirect_url=%2Fdashboard%2Faccount"');
  });

  it('is honest about the subscription requirement, what is deleted, what is kept and backups', () => {
    expect(html).toContain('cancel it first');
    expect(html).toContain('permanently deleted');
    // What is deleted now includes the member's activity, not only the journal.
    expect(html).toContain('check-ins');
    expect(html).toContain('saved practices');
    // It does not claim everything is erased, and says what stays.
    expect(html).toContain('We do not erase everything');
    expect(html).toContain('id="what-we-keep"');
    // Backups: the agreed 30-day maximum for safety backups; no figure for the provider's history.
    expect(html).toContain('no longer than 30 days');
    expect(html).not.toContain('6 hours');
    // No completion-time promise and no unverified security or access claims.
    expect(html).not.toMatch(/straight away|immediately deleted|within \d+ (hours|days) of/i);
    expect(html).not.toMatch(/encrypt|no one at|nobody at|never access/i);
  });

  it('is indexable and has a canonical path (a store reviewer must be able to reach it)', () => {
    expect(JSON.stringify(metadata)).toContain('/delete-account');
    expect(JSON.stringify(metadata)).not.toMatch(/"index":false|noindex/i);
  });

  it('is a public route (reachable without signing in) and is in the sitemap', () => {
    const middleware = readFileSync(new URL('../../middleware.ts', import.meta.url), 'utf8');
    expect(middleware).toContain("'/delete-account'");
    const sitemap = readFileSync(new URL('../sitemap.ts', import.meta.url), 'utf8');
    expect(sitemap).toContain("'/delete-account'");
  });
});
