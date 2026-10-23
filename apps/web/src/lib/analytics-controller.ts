import {
  cookieDomainCandidates,
  isAnalyticsCookie,
  readConsent,
  writeConsent,
  type ConsentChoice,
  type ConsentStorage,
} from '@/lib/analytics-consent';
import { GA_MEASUREMENT_ID } from '@/lib/analytics-config';
import {
  UTM_STORAGE_KEY,
  hasUtm,
  parseUtmFromSearch,
  sanitiseUtm,
  type UtmParams,
} from '@/lib/utm';

/**
 * The one place that decides whether Google Analytics may run.
 *
 * Rules it enforces (each has a test in analytics-controller.test.ts):
 *  - Nothing Google-related is initialised or requested until the visitor has
 *    explicitly accepted: no script tag, no `dataLayer`, no `gtag`.
 *  - A saved choice is honoured on every later page load; nothing but an
 *    explicit Accept or Reject is ever treated as a choice.
 *  - Rejecting, or never choosing, leaves analytics off and clears any Google
 *    Analytics cookies an earlier version of the site may have left behind.
 *  - Withdrawing stops collection immediately (GA's own `ga-disable` switch plus
 *    a consent update), expires the Google Analytics cookies, and silences
 *    `track()` and route-change page views.
 *  - Initialisation happens at most once per page load, and a page view is sent
 *    at most once per distinct path.
 *  - Measurement only: when analytics starts, advertising storage, ad user data
 *    and ad personalization are declared denied (consent default, before
 *    config), and Google signals / ad-personalization signals are switched off
 *    on every page view. What the Analytics property itself is set to is
 *    outside this code and unverified.
 *  - Campaign (UTM) parameters follow the same rule. They may be READ from the
 *    landing URL into memory (nothing stored, nothing sent), but are written to
 *    `sessionStorage` and returned to callers - and so reach analytics events - only
 *    while analytics is accepted (the sign-up request carries no UTM fields). Rejecting or
 *    withdrawing clears them, and an old stored copy is removed on page load.
 *
 * GLOBAL PRIVACY CONTROL: read from `navigator.globalPrivacyControl`. While it
 * is on, analytics never starts: a saved Accept does not enable it, a new Accept
 * is stored but stays inert, and a running session is stopped by
 * `refreshSignal()` (the saved choice is kept, never rewritten by the signal).
 * Turning the signal off does not start anything mid-session; a saved Accept
 * applies on the next page load. This is a conservative technical behaviour,
 * not a statement that any law is satisfied.
 * DO NOT TRACK: not read and not supported. It is a separate, discontinued
 * signal and is deliberately not treated as GPC.
 *
 * Every browser dependency is injected, so tests run in plain Node and can never
 * reach the real Google endpoint.
 */

export type ConsentStatus = 'unset' | ConsentChoice;

export interface AnalyticsState {
  /** False until the client has read the saved choice; the UI renders nothing before then. */
  ready: boolean;
  /** Whether a valid measurement ID is configured. Without one analytics is off and no UI shows. */
  configured: boolean;
  consent: ConsentStatus;
  /** Whether the visitor has asked to see their choice again (footer "Cookie preferences"). */
  preferencesOpen: boolean;
  /**
   * Whether the browser is sending a Global Privacy Control signal. While it is,
   * analytics stays off whatever the saved choice is.
   */
  gpc: boolean;
}

export interface GaWindow {
  dataLayer?: unknown[];
  gtag?: (...args: unknown[]) => void;
  [key: string]: unknown;
}

export interface CookieJar {
  names(): string[];
  expire(name: string): void;
}

export interface CampaignStorage extends ConsentStorage {
  removeItem(key: string): void;
}

export interface AnalyticsDeps {
  measurementId: string | undefined;
  storage: ConsentStorage | null;
  win: GaWindow;
  loadScript(src: string): void;
  cookies: CookieJar;
  /** Where campaign parameters come from (the URL) and may be kept (`sessionStorage`). */
  campaign: { search(): string; storage: CampaignStorage | null };
  now(): Date;
  /** Reads the browser's Global Privacy Control signal. Omitted or throwing means no signal. */
  gpc?(): boolean;
}

export interface AnalyticsController {
  hydrate(path: string): void;
  grant(): void;
  deny(): void;
  openPreferences(): void;
  closePreferences(): void;
  /**
   * Re-reads the Global Privacy Control signal. If it has turned on, analytics
   * stops at once (the saved choice is kept). If it has turned off, nothing is
   * started mid-session: a saved acceptance takes effect on the next page load.
   */
  refreshSignal(): void;
  routeChanged(path: string): void;
  track(name: string, params?: Record<string, unknown>): void;
  /** Reads UTM parameters from the current URL into memory only - no storage, no sending. */
  captureCampaign(): void;
  /** The campaign parameters, or `{}` unless analytics is accepted (then they are also kept for the tab session). */
  getCampaignParams(): UtmParams;
  getState(): AnalyticsState;
  getServerState(): AnalyticsState;
  subscribe(listener: () => void): () => void;
}

/**
 * Sent with every page view: this site measures visits only. Google's
 * `allow_google_signals` (demographics/interest reporting) and
 * `allow_ad_personalization_signals` both default to true, so they are switched
 * off explicitly rather than left to the Analytics property's settings.
 */
const MEASUREMENT_ONLY = {
  allow_google_signals: false,
  allow_ad_personalization_signals: false,
} as const;

export function createAnalyticsController(deps: AnalyticsDeps): AnalyticsController {
  const id = deps.measurementId;
  const serverState: AnalyticsState = {
    ready: false,
    configured: Boolean(id),
    consent: 'unset',
    preferencesOpen: false,
    gpc: false,
  };
  let state = serverState;
  const listeners = new Set<() => void>();

  let hydrated = false;
  let initialised = false; // gtag.js has been requested in this page load
  let active = false; // analytics may currently collect
  let currentPath = '/';
  let lastSentPath: string | null = null;
  let memoryChoice: ConsentChoice | null = null; // keeps the choice for this page load if storage is blocked
  let campaignMemory: UtmParams = {}; // landing-URL parameters, in memory only until accepted

  function gpcActive(): boolean {
    try {
      return deps.gpc?.() === true;
    } catch {
      return false;
    }
  }

  function setState(patch: Partial<AnalyticsState>): void {
    const next = { ...state, ...patch };
    if (
      next.ready === state.ready &&
      next.configured === state.configured &&
      next.consent === state.consent &&
      next.preferencesOpen === state.preferencesOpen &&
      next.gpc === state.gpc
    ) {
      return; // keep the snapshot identity stable for useSyncExternalStore
    }
    state = next;
    listeners.forEach((listener) => listener());
  }

  function persist(choice: ConsentChoice): void {
    memoryChoice = choice;
    writeConsent(deps.storage, choice, deps.now());
  }

  function expireAnalyticsCookies(): void {
    for (const name of deps.cookies.names()) {
      if (isAnalyticsCookie(name)) deps.cookies.expire(name);
    }
  }

  function installGtag(): void {
    const win = deps.win;
    win.dataLayer = win.dataLayer ?? [];
    const layer = win.dataLayer;
    // GA's own snippet pushes the `arguments` object, not an array - gtag.js
    // does not recognise array entries.
    win.gtag = function gtag() {
      // eslint-disable-next-line prefer-rest-params
      layer.push(arguments);
    };
  }

  function captureCampaign(): void {
    const fromUrl = parseUtmFromSearch(deps.campaign.search());
    if (hasUtm(fromUrl)) campaignMemory = fromUrl; // memory only: nothing is stored before consent
  }

  function clearCampaign(): void {
    campaignMemory = {};
    try {
      deps.campaign.storage?.removeItem(UTM_STORAGE_KEY);
    } catch {
      // Blocked storage has nothing to clear.
    }
  }

  function sendPageView(): void {
    if (!id || !deps.win.gtag) return;
    deps.win.gtag('config', id, { page_path: currentPath, ...MEASUREMENT_ONLY });
    lastSentPath = currentPath;
  }

  function enable(): void {
    if (!id || active || gpcActive()) return; // GPC on: never start. Already running: a second Accept must not repeat the page view
    deps.win[`ga-disable-${id}`] = false;
    if (!initialised) {
      installGtag();
      // Must come before js/config (Google's required order). Analytics was
      // just accepted; advertising storage and signals were never requested.
      deps.win.gtag?.('consent', 'default', {
        analytics_storage: 'granted',
        ad_storage: 'denied',
        ad_user_data: 'denied',
        ad_personalization: 'denied',
      });
      deps.win.gtag?.('js', deps.now());
      sendPageView();
      deps.loadScript(`https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(id)}`);
      initialised = true;
    } else {
      // Granted again after a withdrawal in the same page load: gtag.js is
      // already here, so switch it back on instead of loading it a second time.
      deps.win.gtag?.('consent', 'update', { analytics_storage: 'granted' });
      sendPageView();
    }
    active = true;
  }

  function disable(): void {
    active = false;
    lastSentPath = null;
    if (id) deps.win[`ga-disable-${id}`] = true;
    if (typeof deps.win.gtag === 'function') {
      deps.win.gtag('consent', 'update', {
        analytics_storage: 'denied',
        ad_storage: 'denied',
        ad_user_data: 'denied',
        ad_personalization: 'denied',
      });
    }
    expireAnalyticsCookies();
    clearCampaign();
  }

  return {
    hydrate(path) {
      if (hydrated) return; // React strict mode runs effects twice in development
      hydrated = true;
      currentPath = path;
      const saved = id ? (readConsent(deps.storage) ?? memoryChoice) : null;
      const gpc = gpcActive();
      if (saved === 'granted' && !gpc) {
        enable();
      } else {
        // Never chosen, rejected, or analytics not configured: make sure no
        // Google Analytics cookie, and no campaign copy, from an earlier version
        // of the site survives.
        expireAnalyticsCookies();
        clearCampaign();
      }
      setState({ ready: true, consent: saved ?? 'unset', gpc });
    },

    grant() {
      if (!id) return;
      persist('granted');
      enable(); // does nothing while GPC is on
      setState({ consent: 'granted', preferencesOpen: false, gpc: gpcActive() });
    },

    deny() {
      if (!id) return;
      persist('denied');
      disable();
      setState({ consent: 'denied', preferencesOpen: false, gpc: gpcActive() });
    },

    openPreferences() {
      setState({ preferencesOpen: true });
    },

    closePreferences() {
      setState({ preferencesOpen: false });
    },

    refreshSignal() {
      if (!hydrated) return;
      const gpc = gpcActive();
      if (gpc === state.gpc) return;
      if (gpc && active) disable();
      setState({ gpc });
    },

    routeChanged(path) {
      currentPath = path;
      if (!active || path === lastSentPath) return;
      sendPageView();
    },

    track(name, params = {}) {
      if (!active || typeof deps.win.gtag !== 'function') return;
      try {
        deps.win.gtag('event', name, params);
      } catch {
        // Analytics must never break the page that calls it.
      }
    },

    captureCampaign,

    getCampaignParams() {
      captureCampaign();
      if (!active) return {}; // not accepted (never chosen, rejected, withdrawn or unconfigured)
      const storage = deps.campaign.storage;
      if (hasUtm(campaignMemory)) {
        try {
          storage?.setItem(UTM_STORAGE_KEY, JSON.stringify(campaignMemory));
        } catch {
          // Blocked or full: the in-memory copy still serves this page load.
        }
        return { ...campaignMemory };
      }
      try {
        const stored = storage?.getItem(UTM_STORAGE_KEY);
        return stored ? sanitiseUtm(JSON.parse(stored)) : {};
      } catch {
        return {};
      }
    },

    getState: () => state,
    getServerState: () => serverState,
    subscribe(listener) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
  };
}

function browserCookieJar(): CookieJar {
  const expiry = 'Thu, 01 Jan 1970 00:00:00 GMT';
  return {
    names() {
      return document.cookie
        .split(';')
        .map((entry) => entry.split('=')[0]?.trim() ?? '')
        .filter(Boolean);
    },
    expire(name) {
      const clear = `${name}=; expires=${expiry}; max-age=0; path=/`;
      document.cookie = clear; // host-only cookie
      for (const domain of cookieDomainCandidates(window.location.hostname)) {
        document.cookie = `${clear}; domain=${domain}`;
      }
    },
  };
}

function browserStorage(): ConsentStorage | null {
  try {
    return window.localStorage;
  } catch {
    return null; // blocked (some private modes, strict settings)
  }
}

function browserSessionStorage(): CampaignStorage | null {
  try {
    return window.sessionStorage;
  } catch {
    return null;
  }
}

let browserController: AnalyticsController | undefined;

/**
 * The app's controller. On the client it is created once and shared (the footer
 * button, the banner, the page-view tracker and `trackEvent` all talk to the
 * same instance). On the server a fresh inert instance is returned each time:
 * it never hydrates, so it never touches storage, cookies or the window.
 */
export function getAnalyticsController(): AnalyticsController {
  if (typeof window === 'undefined') {
    return createAnalyticsController({
      measurementId: GA_MEASUREMENT_ID,
      storage: null,
      win: {},
      loadScript: () => undefined,
      cookies: { names: () => [], expire: () => undefined },
      campaign: { search: () => '', storage: null },
      now: () => new Date(),
    });
  }
  browserController ??= createAnalyticsController({
    measurementId: GA_MEASUREMENT_ID,
    storage: browserStorage(),
    win: window as unknown as GaWindow,
    loadScript(src) {
      if (document.querySelector('script[data-tnsi-ga]')) return;
      const script = document.createElement('script');
      script.async = true;
      script.src = src;
      script.dataset.tnsiGa = 'true';
      document.head.appendChild(script);
    },
    cookies: browserCookieJar(),
    campaign: { search: () => window.location.search, storage: browserSessionStorage() },
    now: () => new Date(),
    gpc: () =>
      (navigator as Navigator & { globalPrivacyControl?: boolean }).globalPrivacyControl === true,
  });
  return browserController;
}
