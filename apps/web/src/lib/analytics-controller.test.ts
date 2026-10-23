import { describe, expect, it, vi } from 'vitest';
import {
  createAnalyticsController,
  type AnalyticsDeps,
  type CampaignStorage,
  type GaWindow,
} from './analytics-controller';
import { UTM_STORAGE_KEY } from './utm';
import { CONSENT_STORAGE_KEY, CONSENT_VERSION, type ConsentStorage } from './analytics-consent';

/**
 * Every browser dependency is a fake, and the only way anything could reach
 * Google is `loadScript`, which is a spy. These tests cannot touch the real
 * Google Analytics endpoint.
 */
const ID = 'G-TEST1234';
const NOW = new Date('2026-10-23T12:00:00.000Z');

function makeStorage(): ConsentStorage & { data: Map<string, string> } {
  const data = new Map<string, string>();
  return {
    data,
    getItem: (key) => data.get(key) ?? null,
    setItem: (key, value) => {
      data.set(key, value);
    },
  };
}

interface Options {
  measurementId?: string | undefined;
  storage?: ConsentStorage | null;
  cookies?: string[];
  /** Initial URL query string, e.g. '?utm_source=newsletter'. */
  search?: string;
  /** Initial contents of sessionStorage. */
  session?: Record<string, string>;
  /** Pass null to simulate blocked sessionStorage. */
  sessionStorage?: CampaignStorage | null;
}

function makeEnv(options: Options = {}) {
  const storage = options.storage === undefined ? makeStorage() : options.storage;
  const win: GaWindow = {};
  const scripts: string[] = [];
  const jar = [...(options.cookies ?? [])];
  const expired: string[] = [];
  let search = options.search ?? '';
  const sessionData = new Map(Object.entries(options.session ?? {}));
  const sessionWrites: string[] = [];
  const sessionStorage: CampaignStorage | null =
    options.sessionStorage === undefined
      ? {
          getItem: (key) => sessionData.get(key) ?? null,
          setItem: (key, value) => {
            sessionWrites.push(key);
            sessionData.set(key, value);
          },
          removeItem: (key) => {
            sessionData.delete(key);
          },
        }
      : options.sessionStorage;
  const deps: AnalyticsDeps = {
    measurementId: 'measurementId' in options ? options.measurementId : ID,
    storage,
    win,
    loadScript: (src) => {
      scripts.push(src);
    },
    cookies: {
      names: () => [...jar],
      expire: (name) => {
        expired.push(name);
        const index = jar.indexOf(name);
        if (index >= 0) jar.splice(index, 1);
      },
    },
    campaign: { search: () => search, storage: sessionStorage },
    now: () => NOW,
  };
  /** Everything pushed to Google's dataLayer, as plain arrays. */
  const layer = () => (win.dataLayer ?? []).map((entry) => Array.from(entry as ArrayLike<unknown>));
  const pageViews = () => layer().filter((entry) => entry[0] === 'config');
  const events = () => layer().filter((entry) => entry[0] === 'event');
  return {
    deps,
    win,
    storage,
    scripts,
    jar,
    expired,
    layer,
    pageViews,
    events,
    sessionData,
    sessionWrites,
    setSearch: (next: string) => {
      search = next;
    },
  };
}

/** A fresh controller on a fresh page load that shares the same saved storage. */
function reload(previous: ReturnType<typeof makeEnv>, path = '/') {
  const next = makeEnv({ storage: previous.storage, cookies: previous.jar });
  const controller = createAnalyticsController(next.deps);
  controller.hydrate(path);
  return { ...next, controller };
}

describe('first visit (no choice yet)', () => {
  it('initialises nothing and requests nothing from Google', () => {
    const env = makeEnv();
    const controller = createAnalyticsController(env.deps);
    controller.hydrate('/');

    expect(env.scripts).toEqual([]);
    expect(env.win.dataLayer).toBeUndefined();
    expect(env.win.gtag).toBeUndefined();
    expect(controller.getState()).toMatchObject({
      ready: true,
      configured: true,
      consent: 'unset',
    });
  });

  it('sends no page views and no events, even across route changes and interaction', () => {
    const env = makeEnv();
    const controller = createAnalyticsController(env.deps);
    controller.hydrate('/');

    controller.routeChanged('/about');
    controller.routeChanged('/programs');
    controller.track('email_submitted', { source: 'the_return_path' });

    expect(env.scripts).toEqual([]);
    expect(env.layer()).toEqual([]);
  });

  it('does not treat opening and closing the preferences panel as a choice', () => {
    const env = makeEnv();
    const controller = createAnalyticsController(env.deps);
    controller.hydrate('/');
    controller.openPreferences();
    controller.closePreferences();

    expect(controller.getState().consent).toBe('unset');
    expect(env.storage && (env.storage as ReturnType<typeof makeStorage>).data.size).toBe(0);
    expect(env.scripts).toEqual([]);
  });

  it('is not ready until the saved choice has been read (the UI renders nothing before then)', () => {
    const env = makeEnv();
    const controller = createAnalyticsController(env.deps);
    expect(controller.getState().ready).toBe(false);
    expect(controller.getServerState().ready).toBe(false);
    controller.hydrate('/');
    expect(controller.getState().ready).toBe(true);
    expect(controller.getServerState().ready).toBe(false);
  });
});

describe('Accept', () => {
  it('initialises analytics exactly once and sends the first page view with the current path', () => {
    const env = makeEnv();
    const controller = createAnalyticsController(env.deps);
    controller.hydrate('/programs');
    controller.grant();

    expect(env.scripts).toEqual([`https://www.googletagmanager.com/gtag/js?id=${ID}`]);
    expect(env.layer()[0]?.[0]).toBe('js');
    expect(env.pageViews()).toEqual([['config', ID, { page_path: '/programs' }]]);
    expect(controller.getState().consent).toBe('granted');
  });

  it('saves the choice as a versioned record', () => {
    const env = makeEnv();
    const controller = createAnalyticsController(env.deps);
    controller.hydrate('/');
    controller.grant();

    const saved = JSON.parse(
      (env.storage as ReturnType<typeof makeStorage>).data.get(CONSENT_STORAGE_KEY) ?? '{}',
    );
    expect(saved).toEqual({
      version: CONSENT_VERSION,
      choice: 'granted',
      updatedAt: NOW.toISOString(),
    });
  });

  it('does not initialise twice when Accept fires again or effects run twice', () => {
    const env = makeEnv();
    const controller = createAnalyticsController(env.deps);
    controller.hydrate('/');
    controller.hydrate('/'); // React strict mode runs effects twice in development
    controller.grant();
    controller.grant();

    expect(env.scripts).toHaveLength(1);
    expect(env.layer().filter((entry) => entry[0] === 'js')).toHaveLength(1);
    expect(env.pageViews()).toHaveLength(1);
  });

  it('lets events through once active', () => {
    const env = makeEnv();
    const controller = createAnalyticsController(env.deps);
    controller.hydrate('/');
    controller.grant();
    controller.track('email_submitted', { source: 'the_return_path', level: 1 });

    expect(env.events()).toEqual([
      ['event', 'email_submitted', { source: 'the_return_path', level: 1 }],
    ]);
  });

  it('pushes gtag calls as `arguments` objects, which is what gtag.js requires', () => {
    const env = makeEnv();
    const controller = createAnalyticsController(env.deps);
    controller.hydrate('/');
    controller.grant();
    const first = env.win.dataLayer?.[0] as unknown;
    expect(Array.isArray(first)).toBe(false);
    expect(Object.prototype.toString.call(first)).toBe('[object Arguments]');
  });
});

describe('Reject', () => {
  it('keeps analytics disabled and saves the choice', () => {
    const env = makeEnv();
    const controller = createAnalyticsController(env.deps);
    controller.hydrate('/');
    controller.deny();

    expect(controller.getState().consent).toBe('denied');
    expect(env.scripts).toEqual([]);
    expect(env.win.dataLayer).toBeUndefined();
    const saved = JSON.parse(
      (env.storage as ReturnType<typeof makeStorage>).data.get(CONSENT_STORAGE_KEY) ?? '{}',
    );
    expect(saved.choice).toBe('denied');
  });

  it('sends nothing afterwards: no route page views, no events', () => {
    const env = makeEnv();
    const controller = createAnalyticsController(env.deps);
    controller.hydrate('/');
    controller.deny();
    controller.routeChanged('/about');
    controller.track('email_submitted');

    expect(env.layer()).toEqual([]);
    expect(env.scripts).toEqual([]);
  });
});

describe('reload: the saved choice is respected', () => {
  it('re-enables analytics automatically after a saved Accept - once, with the new page path', () => {
    const first = makeEnv();
    const c1 = createAnalyticsController(first.deps);
    c1.hydrate('/');
    c1.grant();

    const second = reload(first, '/resources');
    expect(second.controller.getState().consent).toBe('granted');
    expect(second.scripts).toHaveLength(1);
    expect(second.pageViews()).toEqual([['config', ID, { page_path: '/resources' }]]);
  });

  it('stays off after a saved Reject', () => {
    const first = makeEnv();
    const c1 = createAnalyticsController(first.deps);
    c1.hydrate('/');
    c1.deny();

    const second = reload(first, '/resources');
    expect(second.controller.getState().consent).toBe('denied');
    expect(second.scripts).toEqual([]);
    expect(second.layer()).toEqual([]);
  });

  it('asks again when the saved choice is from an older consent version', () => {
    const storage = makeStorage();
    storage.setItem(
      CONSENT_STORAGE_KEY,
      JSON.stringify({
        version: CONSENT_VERSION - 1,
        choice: 'granted',
        updatedAt: NOW.toISOString(),
      }),
    );
    const env = makeEnv({ storage });
    const controller = createAnalyticsController(env.deps);
    controller.hydrate('/');

    expect(controller.getState().consent).toBe('unset');
    expect(env.scripts).toEqual([]);
  });
});

describe('withdrawing consent', () => {
  function accepted() {
    // Only unrelated cookies exist when the page loads; the Google cookies are
    // set by gtag.js AFTER the visitor accepts, so they must be simulated after
    // grant() - otherwise the page-load cleanup would remove them first and this
    // test would pass without withdrawal doing anything.
    const env = makeEnv({ cookies: ['__session', '__clerk_db_jwt'] });
    const controller = createAnalyticsController(env.deps);
    controller.hydrate('/');
    controller.grant();
    env.jar.push('_ga', '_ga_TEST1234', '_gid');
    return { env, controller };
  }

  it('switches Google collection off and updates consent to denied', () => {
    const { env, controller } = accepted();
    controller.deny();

    expect(env.win[`ga-disable-${ID}`]).toBe(true);
    const last = env.layer().at(-1);
    expect(last?.[0]).toBe('consent');
    expect(last?.[1]).toBe('update');
    expect(last?.[2]).toMatchObject({ analytics_storage: 'denied', ad_storage: 'denied' });
    expect(controller.getState().consent).toBe('denied');
  });

  it('stops all future collection: no events and no route page views', () => {
    const { env, controller } = accepted();
    controller.deny();
    const sizeAfterWithdrawal = env.layer().length;

    controller.track('email_submitted');
    controller.routeChanged('/about');
    controller.routeChanged('/contact');

    expect(env.layer()).toHaveLength(sizeAfterWithdrawal);
    expect(env.events()).toEqual([]);
  });

  it('expires the Google Analytics cookies and nothing else', () => {
    const { env, controller } = accepted();
    controller.deny();

    expect(env.expired.sort()).toEqual(['_ga', '_ga_TEST1234', '_gid']);
    expect(env.jar).toEqual(['__session', '__clerk_db_jwt']);
  });

  it('keeps analytics off after the page reloads', () => {
    const { env, controller } = accepted();
    controller.deny();
    const next = reload(env, '/');
    expect(next.controller.getState().consent).toBe('denied');
    expect(next.scripts).toEqual([]);
    void controller;
  });
});

describe('route changes', () => {
  it('sends one page view per distinct path once active, never a duplicate', () => {
    const env = makeEnv();
    const controller = createAnalyticsController(env.deps);
    controller.hydrate('/');
    controller.grant(); // first page view for "/"
    controller.routeChanged('/'); // same path: the initial mount must not double-count
    controller.routeChanged('/about');
    controller.routeChanged('/about'); // unchanged path
    controller.routeChanged('/contact');

    expect(env.pageViews().map((entry) => (entry[2] as { page_path: string }).page_path)).toEqual([
      '/',
      '/about',
      '/contact',
    ]);
  });

  it('sends no page view for navigation that happened before consent, then only the current page when accepted', () => {
    const env = makeEnv();
    const controller = createAnalyticsController(env.deps);
    controller.hydrate('/');
    controller.routeChanged('/about');
    controller.routeChanged('/programs');
    expect(env.layer()).toEqual([]); // nothing before consent

    controller.grant();
    expect(env.pageViews()).toEqual([['config', ID, { page_path: '/programs' }]]);
  });
});

describe('reopening preferences', () => {
  it('opens and closes without altering the saved choice', () => {
    const env = makeEnv();
    const controller = createAnalyticsController(env.deps);
    controller.hydrate('/');
    controller.deny();
    const before = (env.storage as ReturnType<typeof makeStorage>).data.get(CONSENT_STORAGE_KEY);

    controller.openPreferences();
    expect(controller.getState()).toMatchObject({ preferencesOpen: true, consent: 'denied' });
    controller.closePreferences();
    expect(controller.getState()).toMatchObject({ preferencesOpen: false, consent: 'denied' });
    expect((env.storage as ReturnType<typeof makeStorage>).data.get(CONSENT_STORAGE_KEY)).toBe(
      before,
    );
  });

  it('lets a visitor who rejected change their mind and accept', () => {
    const env = makeEnv();
    const controller = createAnalyticsController(env.deps);
    controller.hydrate('/');
    controller.deny();
    controller.openPreferences();
    controller.grant();

    expect(controller.getState()).toMatchObject({ consent: 'granted', preferencesOpen: false });
    expect(env.scripts).toHaveLength(1);
    expect(env.pageViews()).toHaveLength(1);
  });

  it('lets a visitor who accepted withdraw, and accepting again re-uses the loaded script', () => {
    const env = makeEnv();
    const controller = createAnalyticsController(env.deps);
    controller.hydrate('/');
    controller.grant();
    controller.openPreferences();
    controller.deny();
    expect(controller.getState().consent).toBe('denied');

    controller.routeChanged('/about');
    controller.openPreferences();
    controller.grant();

    expect(env.scripts).toHaveLength(1); // no second <script> for the same page load
    expect(env.win[`ga-disable-${ID}`]).toBe(false);
    expect(env.layer().filter((entry) => entry[0] === 'js')).toHaveLength(1);
    expect(env.pageViews().map((entry) => (entry[2] as { page_path: string }).page_path)).toEqual([
      '/',
      '/about',
    ]);
    const consentUpdates = env.layer().filter((entry) => entry[0] === 'consent');
    expect(
      consentUpdates.map((entry) => (entry[2] as { analytics_storage: string }).analytics_storage),
    ).toEqual(['denied', 'granted']);
  });
});

describe('cookies left by an earlier version of the site', () => {
  it('are expired when there is no choice or the choice is Reject', () => {
    const noChoice = makeEnv({ cookies: ['_ga', '_ga_OLD', 'keep_me'] });
    createAnalyticsController(noChoice.deps).hydrate('/');
    expect(noChoice.jar).toEqual(['keep_me']);

    const first = makeEnv();
    const c1 = createAnalyticsController(first.deps);
    c1.hydrate('/');
    c1.deny();
    first.jar.push('_ga', '_gid');
    const second = reload(first);
    expect(second.jar).toEqual([]);
  });

  it('are left alone for a visitor who accepted', () => {
    const first = makeEnv();
    const c1 = createAnalyticsController(first.deps);
    c1.hydrate('/');
    c1.grant();
    first.jar.push('_ga', '_ga_TEST1234');
    const second = reload(first);
    expect(second.jar).toEqual(['_ga', '_ga_TEST1234']);
    expect(second.expired).toEqual([]);
  });
});

describe('when analytics is not configured', () => {
  it('never loads anything, shows no UI, and ignores Accept and Reject', () => {
    const env = makeEnv({ measurementId: undefined, cookies: ['_ga'] });
    const controller = createAnalyticsController(env.deps);
    controller.hydrate('/');
    controller.grant();
    controller.deny();
    controller.track('x');

    expect(controller.getState()).toMatchObject({ configured: false, consent: 'unset' });
    expect(env.scripts).toEqual([]);
    expect(env.layer()).toEqual([]);
    expect(env.jar).toEqual([]); // leftover cookies from an older install are still cleaned up
  });
});

describe('when browser storage is blocked', () => {
  it('still works for the page load, keeps the choice in memory, and does not throw', () => {
    const env = makeEnv({ storage: null });
    const controller = createAnalyticsController(env.deps);
    expect(() => {
      controller.hydrate('/');
      controller.grant();
    }).not.toThrow();
    expect(controller.getState().consent).toBe('granted');
    expect(env.scripts).toHaveLength(1);
  });
});

describe('subscriptions (what React reads)', () => {
  it('notifies on change, keeps the snapshot identity when nothing changed, and unsubscribes', () => {
    const env = makeEnv();
    const controller = createAnalyticsController(env.deps);
    const listener = vi.fn();
    const unsubscribe = controller.subscribe(listener);

    controller.hydrate('/');
    expect(listener).toHaveBeenCalledTimes(1);

    const snapshot = controller.getState();
    controller.closePreferences(); // already closed: no change
    expect(controller.getState()).toBe(snapshot);
    expect(listener).toHaveBeenCalledTimes(1);

    controller.grant();
    expect(listener).toHaveBeenCalledTimes(2);

    unsubscribe();
    controller.deny();
    expect(listener).toHaveBeenCalledTimes(2);
  });
});

describe('a failing gtag never breaks the page', () => {
  it('swallows errors from event calls', () => {
    const env = makeEnv();
    const controller = createAnalyticsController(env.deps);
    controller.hydrate('/');
    controller.grant();
    env.win.gtag = () => {
      throw new Error('blocked by an extension');
    };
    expect(() => controller.track('email_submitted')).not.toThrow();
  });
});

describe('campaign (UTM) parameters follow the consent choice', () => {
  const LANDING =
    '?utm_source=newsletter&utm_medium=email&utm_campaign=autumn&utm_term=calm&utm_content=hero&other=ignored';
  const ALL = {
    utm_source: 'newsletter',
    utm_medium: 'email',
    utm_campaign: 'autumn',
    utm_term: 'calm',
    utm_content: 'hero',
  };

  it('before any choice: reads the URL into memory only - nothing stored, nothing returned', () => {
    const env = makeEnv({ search: LANDING });
    const controller = createAnalyticsController(env.deps);
    controller.hydrate('/the-return-path');
    controller.captureCampaign();

    expect(controller.getCampaignParams()).toEqual({});
    expect(env.sessionWrites).toEqual([]);
    expect(env.sessionData.size).toBe(0);
  });

  it('after Reject: returns nothing and never writes to storage', () => {
    const env = makeEnv({ search: LANDING });
    const controller = createAnalyticsController(env.deps);
    controller.hydrate('/the-return-path');
    controller.captureCampaign();
    controller.deny();

    expect(controller.getCampaignParams()).toEqual({});
    expect(env.sessionWrites).toEqual([]);
  });

  it('after Accept: attribution is preserved - parameters seen BEFORE the choice are kept and returned', () => {
    const env = makeEnv({ search: LANDING });
    const controller = createAnalyticsController(env.deps);
    controller.hydrate('/the-return-path');
    controller.captureCampaign(); // landing: captured in memory
    env.setSearch(''); // visitor navigates inside the app; the URL loses its query string
    controller.grant();

    expect(controller.getCampaignParams()).toEqual(ALL); // known keys only, "other" dropped
    expect(JSON.parse(env.sessionData.get(UTM_STORAGE_KEY) ?? '{}')).toEqual(ALL);
  });

  it('after Accept: parameters from the current URL are used and stored', () => {
    const env = makeEnv();
    const controller = createAnalyticsController(env.deps);
    controller.hydrate('/');
    controller.grant();
    env.setSearch('?utm_source=social');

    expect(controller.getCampaignParams()).toEqual({ utm_source: 'social' });
    expect(env.sessionWrites).toEqual([UTM_STORAGE_KEY]);
  });

  it('after Accept: falls back to the stored copy when the URL has none', () => {
    // A realistic case: Accept was saved on an earlier page of this tab session,
    // which stored the parameters; this page has no query string.
    const storage = makeStorage();
    storage.setItem(
      CONSENT_STORAGE_KEY,
      JSON.stringify({ version: CONSENT_VERSION, choice: 'granted', updatedAt: NOW.toISOString() }),
    );
    const env = makeEnv({
      storage,
      session: { [UTM_STORAGE_KEY]: JSON.stringify({ utm_campaign: 'autumn' }) },
    });
    const controller = createAnalyticsController(env.deps);
    controller.hydrate('/');
    expect(controller.getCampaignParams()).toEqual({ utm_campaign: 'autumn' });
  });

  it('withdrawal clears the stored copy and the memory copy', () => {
    const env = makeEnv({ search: LANDING });
    const controller = createAnalyticsController(env.deps);
    controller.hydrate('/');
    controller.grant();
    expect(controller.getCampaignParams()).toEqual(ALL);
    expect(env.sessionData.has(UTM_STORAGE_KEY)).toBe(true);

    env.setSearch('');
    controller.deny();

    expect(env.sessionData.has(UTM_STORAGE_KEY)).toBe(false);
    expect(controller.getCampaignParams()).toEqual({});
  });

  it('a page load without an Accept removes a copy left by an earlier version of the site', () => {
    for (const choice of [null, 'denied'] as const) {
      const storage = makeStorage();
      if (choice) {
        storage.setItem(
          CONSENT_STORAGE_KEY,
          JSON.stringify({ version: CONSENT_VERSION, choice, updatedAt: NOW.toISOString() }),
        );
      }
      const env = makeEnv({
        storage,
        session: { [UTM_STORAGE_KEY]: JSON.stringify({ utm_source: 'old' }) },
      });
      createAnalyticsController(env.deps).hydrate('/');
      expect(env.sessionData.has(UTM_STORAGE_KEY)).toBe(false);
    }
  });

  it('a page load with a saved Accept keeps the stored copy', () => {
    const storage = makeStorage();
    storage.setItem(
      CONSENT_STORAGE_KEY,
      JSON.stringify({ version: CONSENT_VERSION, choice: 'granted', updatedAt: NOW.toISOString() }),
    );
    const env = makeEnv({
      storage,
      session: { [UTM_STORAGE_KEY]: JSON.stringify({ utm_source: 'kept' }) },
    });
    const controller = createAnalyticsController(env.deps);
    controller.hydrate('/');
    expect(env.sessionData.has(UTM_STORAGE_KEY)).toBe(true);
    expect(controller.getCampaignParams()).toEqual({ utm_source: 'kept' });
  });

  it('cuts values to 200 characters and ignores tampered stored data', () => {
    const long = 'x'.repeat(500);
    const env = makeEnv({ search: `?utm_source=${long}` });
    const controller = createAnalyticsController(env.deps);
    controller.hydrate('/');
    controller.grant();
    expect(controller.getCampaignParams().utm_source).toHaveLength(200);

    for (const junk of ['not json', '[]', '"str"', '{"utm_source":5,"evil":"x"}', 'null']) {
      const tampered = makeEnv({ session: { [UTM_STORAGE_KEY]: junk } });
      const c = createAnalyticsController(tampered.deps);
      c.hydrate('/');
      c.grant();
      expect(c.getCampaignParams()).toEqual({});
    }
  });

  it('is always empty when analytics is not configured, and still removes an old copy', () => {
    const env = makeEnv({
      measurementId: undefined,
      search: LANDING,
      session: { [UTM_STORAGE_KEY]: JSON.stringify({ utm_source: 'old' }) },
    });
    const controller = createAnalyticsController(env.deps);
    controller.hydrate('/');
    controller.grant();
    expect(controller.getCampaignParams()).toEqual({});
    expect(env.sessionData.has(UTM_STORAGE_KEY)).toBe(false);
  });

  it('works when sessionStorage is blocked: in-memory for this page load, no throw', () => {
    const env = makeEnv({ search: LANDING, sessionStorage: null });
    const controller = createAnalyticsController(env.deps);
    controller.hydrate('/');
    controller.grant();
    expect(() => controller.getCampaignParams()).not.toThrow();
    expect(controller.getCampaignParams()).toEqual(ALL);

    const throwing: CampaignStorage = {
      getItem: () => {
        throw new Error('blocked');
      },
      setItem: () => {
        throw new Error('quota');
      },
      removeItem: () => {
        throw new Error('blocked');
      },
    };
    const env2 = makeEnv({ search: LANDING, sessionStorage: throwing });
    const c2 = createAnalyticsController(env2.deps);
    expect(() => {
      c2.hydrate('/');
      c2.grant();
      c2.getCampaignParams();
      c2.deny();
    }).not.toThrow();
  });
});
