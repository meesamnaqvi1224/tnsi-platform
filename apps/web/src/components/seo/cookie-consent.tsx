'use client';

import { useEffect, useSyncExternalStore } from 'react';
import NextLink from 'next/link';
import { Button } from '@tnsi/ui';
import { getAnalyticsController, type ConsentStatus } from '@/lib/analytics-controller';

export const COOKIE_CONSENT_TITLE_ID = 'cookie-consent-title';
const COOKIE_CONSENT_BODY_ID = 'cookie-consent-body';
const COOKIE_CONSENT_GPC_ID = 'cookie-consent-gpc';

export type CookieConsentMode = 'first-visit' | 'preferences';

export interface CookieConsentViewProps {
  /** `first-visit`: no choice yet, must choose. `preferences`: reopened from the footer. */
  mode: CookieConsentMode;
  currentChoice: ConsentStatus;
  /** The browser is sending a Global Privacy Control signal: analytics stays off. */
  gpc?: boolean;
  onAccept: () => void;
  onReject: () => void;
  onClose: () => void;
}

/**
 * The consent panel. Presentational and hook-free so its markup is testable.
 *
 * Accept and Reject are the same component with identical props, so they have
 * identical size, weight and colour - neither is visually preferred. Nothing on
 * the page counts as consent: only a press of Accept does.
 *
 * It is a non-modal dialog (`aria-modal="false"`): it does not trap focus or
 * block the page, because declining must be as easy as accepting and the site
 * has to stay usable while the choice is pending.
 */
export function CookieConsentView({
  mode,
  currentChoice,
  gpc = false,
  onAccept,
  onReject,
  onClose,
}: CookieConsentViewProps) {
  return (
    <section
      role="dialog"
      aria-modal="false"
      aria-labelledby={COOKIE_CONSENT_TITLE_ID}
      aria-describedby={
        gpc ? `${COOKIE_CONSENT_BODY_ID} ${COOKIE_CONSENT_GPC_ID}` : COOKIE_CONSENT_BODY_ID
      }
      data-cookie-consent={mode}
      className="border-border bg-background fixed inset-x-0 bottom-0 z-50 max-h-[85dvh] overflow-y-auto border-t shadow-[0_-8px_30px_rgba(0,0,0,0.08)]"
    >
      <div className="mx-auto flex max-w-5xl flex-col gap-(--space-md) p-(--space-md) pb-[max(var(--space-md),env(safe-area-inset-bottom))] sm:flex-row sm:items-end sm:justify-between sm:gap-(--space-2xl) sm:p-(--space-xl)">
        <div className="flex max-w-2xl flex-col gap-(--space-sm)">
          <h2
            id={COOKIE_CONSENT_TITLE_ID}
            tabIndex={-1}
            className="font-heading text-foreground text-base font-semibold tracking-tight outline-none sm:text-lg"
          >
            Cookies and analytics
          </h2>
          <p id={COOKIE_CONSENT_BODY_ID} className="text-foreground text-sm leading-relaxed">
            We would like to use Google Analytics to understand how visitors use this website. It
            sets analytics cookies on your device and stays switched off unless you accept. You can
            change your choice at any time from &ldquo;Cookie preferences&rdquo; in the footer.
          </p>
          {gpc ? (
            <p id={COOKIE_CONSENT_GPC_ID} className="text-foreground text-sm font-medium">
              Your browser is sending a Global Privacy Control signal, so analytics stays off while
              it is on, whichever option you choose.
            </p>
          ) : null}
          {mode === 'preferences' ? (
            <p className="text-foreground text-sm font-medium" role="status">
              {currentChoice === 'granted'
                ? 'Your current choice: analytics accepted.'
                : currentChoice === 'denied'
                  ? 'Your current choice: analytics rejected.'
                  : 'You have not made a choice yet.'}
            </p>
          ) : null}
          <p className="text-sm">
            <NextLink
              href="/cookies"
              className="interaction-focus text-foreground hover:text-foreground/80 underline underline-offset-4"
            >
              Cookie Policy
            </NextLink>
            <span aria-hidden="true" className="text-muted-foreground mx-2">
              ·
            </span>
            <NextLink
              href="/privacy"
              className="interaction-focus text-foreground hover:text-foreground/80 underline underline-offset-4"
            >
              Privacy Policy
            </NextLink>
          </p>
        </div>

        <div className="grid grid-cols-2 gap-(--space-sm) sm:flex sm:flex-row sm:items-center">
          <Button
            variant="outline"
            size="lg"
            className="min-h-11 w-full sm:w-auto"
            onClick={onReject}
          >
            Reject analytics
          </Button>
          <Button
            variant="outline"
            size="lg"
            className="min-h-11 w-full sm:w-auto"
            onClick={onAccept}
          >
            Accept analytics
          </Button>
          {mode === 'preferences' ? (
            <Button
              variant="ghost"
              size="lg"
              className="col-span-2 min-h-11 w-full sm:w-auto"
              onClick={onClose}
            >
              Close
            </Button>
          ) : null}
        </div>
      </div>
    </section>
  );
}

/**
 * Escape closes a REOPENED panel without changing the saved choice. On a first
 * visit it does nothing: dismissing the banner is not consent, so the visitor
 * must press Accept or Reject.
 */
export function isDismissKey(mode: CookieConsentMode, key: string): boolean {
  return mode === 'preferences' && key === 'Escape';
}

/** Where focus returns to when the panel closes - the control that opened it. */
let preferencesTrigger: HTMLElement | null = null;

export function rememberPreferencesTrigger(element: HTMLElement | null): void {
  preferencesTrigger = element;
}

/**
 * Puts focus back on the footer control once the panel is gone, so keyboard and
 * screen-reader users are not dropped at the top of the page. On a first visit
 * the control has not been used yet, so it is looked up by its data attribute.
 */
export function focusPreferencesTrigger(): void {
  const target =
    preferencesTrigger ?? document.querySelector<HTMLElement>('[data-cookie-preferences]');
  target?.focus();
}

/**
 * The connected panel. Renders nothing until the saved choice has been read on
 * the client (so there is no flash of the banner for people who already chose),
 * nothing when analytics is not configured, and nothing once a choice exists
 * unless the visitor reopens it from the footer.
 */
export function CookieConsent() {
  const controller = getAnalyticsController();
  const state = useSyncExternalStore(
    controller.subscribe,
    controller.getState,
    controller.getServerState,
  );

  const visible =
    state.ready && state.configured && (state.consent === 'unset' || state.preferencesOpen);
  const mode: CookieConsentMode = state.consent === 'unset' ? 'first-visit' : 'preferences';

  // When the visitor reopens preferences, move focus into the panel so a
  // keyboard or screen-reader user lands on it. On a first visit focus is left
  // alone (the panel is first in the tab order after the skip link) so the
  // page is not hijacked on load.
  useEffect(() => {
    if (visible && mode === 'preferences') {
      document.getElementById(COOKIE_CONSENT_TITLE_ID)?.focus();
    }
  }, [visible, mode]);

  const closeAndRestoreFocus = () => {
    controller.closePreferences();
    focusPreferencesTrigger();
  };

  if (!visible) return null;

  return (
    <div
      onKeyDown={(event) => {
        if (isDismissKey(mode, event.key)) closeAndRestoreFocus();
      }}
    >
      <CookieConsentView
        mode={mode}
        currentChoice={state.consent}
        gpc={state.gpc}
        onAccept={() => {
          controller.grant();
          focusPreferencesTrigger();
        }}
        onReject={() => {
          controller.deny();
          focusPreferencesTrigger();
        }}
        onClose={closeAndRestoreFocus}
      />
    </div>
  );
}
