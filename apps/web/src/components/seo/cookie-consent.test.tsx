import { afterEach, describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import {
  COOKIE_CONSENT_TITLE_ID,
  CookieConsentView,
  isDismissKey,
  type CookieConsentViewProps,
} from './cookie-consent';

/**
 * Pure rendering tests, in the repo's existing Node environment: there is no
 * jsdom or React Testing Library in apps/web, and none is added for this. What
 * a real browser does with this markup (focus order, the visual layout at phone
 * width, Escape handling) is verified separately in the browser - see the PR.
 */
const noop = () => undefined;

function render(overrides: Partial<CookieConsentViewProps> = {}) {
  return renderToStaticMarkup(
    <CookieConsentView
      mode="first-visit"
      currentChoice="unset"
      onAccept={noop}
      onReject={noop}
      onClose={noop}
      {...overrides}
    />,
  );
}

function buttons(html: string) {
  return [...html.matchAll(/<button([^>]*)>([^<]*)<\/button>/g)].map((match) => ({
    attributes: match[1] ?? '',
    label: match[2] ?? '',
  }));
}

const classOf = (attributes: string) => /class="([^"]*)"/.exec(attributes)?.[1] ?? '';

describe('consent panel (first visit)', () => {
  const html = render();

  it('is a labelled, described, NON-modal dialog (does not trap focus or block the page)', () => {
    expect(html).toContain('role="dialog"');
    expect(html).toContain('aria-modal="false"');
    expect(html).toContain(`aria-labelledby="${COOKIE_CONSENT_TITLE_ID}"`);
    expect(html).toContain('aria-describedby="cookie-consent-body"');
    expect(html).toContain(`id="${COOKIE_CONSENT_TITLE_ID}"`);
    expect(html).toContain('id="cookie-consent-body"');
  });

  it('offers Accept and Reject with IDENTICAL styling (neither is visually preferred)', () => {
    const [reject, accept] = buttons(html);
    expect(reject?.label).toBe('Reject analytics');
    expect(accept?.label).toBe('Accept analytics');
    expect(classOf(reject?.attributes ?? '')).toBe(classOf(accept?.attributes ?? ''));
    expect(classOf(accept?.attributes ?? '')).not.toBe('');
  });

  it('has exactly two choices on a first visit, so there is no way to dismiss without choosing', () => {
    expect(buttons(html).map((button) => button.label)).toEqual([
      'Reject analytics',
      'Accept analytics',
    ]);
    expect(html).not.toContain('Close');
  });

  it('uses native buttons that are keyboard operable, with no positive tabindex anywhere', () => {
    for (const button of buttons(html)) {
      expect(button.attributes).toContain('type="button"');
      expect(button.attributes).not.toContain('tabindex');
    }
    expect(html).not.toMatch(/tabindex="[1-9]/);
    // The heading is only a programmatic focus target (tabindex -1), never a tab stop.
    expect(html).toContain('tabindex="-1"');
  });

  it('is not pre-selected: nothing is shown as already chosen on a first visit', () => {
    expect(html).not.toContain('Your current choice');
    expect(html).not.toContain('checked');
    expect(html).not.toContain('aria-pressed');
  });

  it('links to the Cookie Policy and Privacy Policy', () => {
    expect(html).toContain('href="/cookies"');
    expect(html).toContain('href="/privacy"');
  });

  it('says analytics is off unless accepted and points to the footer control', () => {
    expect(html).toContain('stays switched off unless you accept');
    expect(html).toContain('Cookie preferences');
  });

  it('has mobile-friendly layout: two equal full-width 44px buttons (grid), scrollable, safe-area padding', () => {
    expect(html).toContain('flex-col');
    expect(html).toContain('sm:flex-row');
    expect(html).toContain('grid-cols-2');
    expect(html).toContain('w-full');
    expect(html).toContain('min-h-11');
    expect(html).toContain('max-h-[85dvh]');
    expect(html).toContain('overflow-y-auto');
    expect(html).toContain('safe-area-inset-bottom');
    expect(html).toContain('fixed inset-x-0 bottom-0');
  });
});

describe('consent panel (reopened from the footer)', () => {
  it('shows the current choice, still offers Accept and Reject equally, and adds Close', () => {
    for (const [choice, text] of [
      ['granted', 'Your current choice: analytics accepted.'],
      ['denied', 'Your current choice: analytics rejected.'],
    ] as const) {
      const html = render({ mode: 'preferences', currentChoice: choice });
      expect(html).toContain(text);
      expect(html).toContain('role="status"');
      const labels = buttons(html).map((button) => button.label);
      expect(labels).toEqual(['Reject analytics', 'Accept analytics', 'Close']);
      const [reject, accept] = buttons(html);
      expect(classOf(reject?.attributes ?? '')).toBe(classOf(accept?.attributes ?? ''));
    }
  });
});

describe('keyboard: Escape', () => {
  it('closes a reopened panel without changing the choice', () => {
    expect(isDismissKey('preferences', 'Escape')).toBe(true);
  });

  it('does NOT dismiss a first-visit panel - closing is not consent', () => {
    expect(isDismissKey('first-visit', 'Escape')).toBe(false);
  });

  it('ignores every other key', () => {
    for (const key of ['Enter', ' ', 'Tab', 'a', 'Backspace']) {
      expect(isDismissKey('preferences', key)).toBe(false);
      expect(isDismissKey('first-visit', key)).toBe(false);
    }
  });
});

describe('footer "Cookie preferences" control', () => {
  afterEach(() => {
    vi.resetModules();
    vi.doUnmock('@/lib/analytics-config');
  });

  it('is rendered when analytics is configured, as a keyboard-operable button', async () => {
    vi.resetModules();
    vi.doMock('@/lib/analytics-config', () => ({ GA_MEASUREMENT_ID: 'G-TEST1234' }));
    const { CookiePreferencesButton } = await import('./cookie-preferences-button');
    const html = renderToStaticMarkup(<CookiePreferencesButton className="footer-link" />);
    expect(html).toBe('<button type="button" class="footer-link">Cookie preferences</button>');
  });

  it('is not rendered at all when analytics is not configured - nothing to choose', async () => {
    vi.resetModules();
    vi.doMock('@/lib/analytics-config', () => ({ GA_MEASUREMENT_ID: undefined }));
    const { CookiePreferencesButton } = await import('./cookie-preferences-button');
    expect(renderToStaticMarkup(<CookiePreferencesButton className="footer-link" />)).toBe('');
  });
});
