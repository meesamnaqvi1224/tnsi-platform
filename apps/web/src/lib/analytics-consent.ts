/**
 * The visitor's analytics-consent choice: how it is stored and read, and how
 * Google Analytics cookies are recognised and expired. Pure functions only, so
 * every rule is unit-testable without a browser.
 *
 * What is stored: one first-party `localStorage` entry holding the choice, a
 * schema version and a timestamp. It never contains an identifier. The entry
 * records the visitor's own decision so it can be honoured; it is not an
 * analytics cookie and is not sent to any server.
 */

export const CONSENT_STORAGE_KEY = 'tnsi-analytics-consent';

/**
 * Bump when the wording or purpose of the analytics consent materially changes,
 * so a saved choice made under the old wording is not carried forward and the
 * visitor is asked again.
 */
export const CONSENT_VERSION = 1;

export type ConsentChoice = 'granted' | 'denied';

export interface ConsentRecord {
  version: number;
  choice: ConsentChoice;
  updatedAt: string;
}

/** The part of `Storage` this module needs; `null` stands for "unavailable". */
export interface ConsentStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

/** Returns the record only if it is well-formed and from the current version. */
export function parseConsentRecord(raw: string | null): ConsentRecord | null {
  if (!raw) return null;
  try {
    const value: unknown = JSON.parse(raw);
    if (typeof value !== 'object' || value === null) return null;
    const { version, choice, updatedAt } = value as Record<string, unknown>;
    if (version !== CONSENT_VERSION) return null;
    if (choice !== 'granted' && choice !== 'denied') return null;
    if (typeof updatedAt !== 'string') return null;
    return { version, choice, updatedAt };
  } catch {
    return null;
  }
}

/** The saved choice, or `null` when none is saved, it is stale, or storage is unavailable. */
export function readConsent(storage: ConsentStorage | null): ConsentChoice | null {
  if (!storage) return null;
  try {
    return parseConsentRecord(storage.getItem(CONSENT_STORAGE_KEY))?.choice ?? null;
  } catch {
    return null;
  }
}

/** Saves the choice. Returns whether it was persisted (it is not when storage is blocked or full). */
export function writeConsent(
  storage: ConsentStorage | null,
  choice: ConsentChoice,
  now: Date,
): boolean {
  if (!storage) return false;
  const record: ConsentRecord = {
    version: CONSENT_VERSION,
    choice,
    updatedAt: now.toISOString(),
  };
  try {
    storage.setItem(CONSENT_STORAGE_KEY, JSON.stringify(record));
    return true;
  } catch {
    return false;
  }
}

/**
 * Whether a cookie name belongs to Google Analytics. GA4 sets `_ga` and
 * `_ga_<container id>`; the legacy Universal Analytics names `_gid`, `_gat` and
 * `_gat_*` are included so cookies left by older installs are cleaned up too.
 * Deliberately narrow: no other cookie (sign-in, consent preference) matches.
 */
export function isAnalyticsCookie(name: string): boolean {
  return (
    name === '_ga' ||
    name.startsWith('_ga_') ||
    name === '_gid' ||
    name === '_gat' ||
    name.startsWith('_gat_')
  );
}

/**
 * Domains a Google Analytics cookie might have been set on, for expiry. GA
 * defaults to the registrable parent domain, so every parent of the hostname
 * (with and without the leading dot) is a candidate. A top-level label on its
 * own (`com`) is never a candidate, and a bare host (`localhost`, an IP) only
 * ever has itself.
 */
export function cookieDomainCandidates(hostname: string): string[] {
  const host = hostname.trim().toLowerCase();
  if (!host) return [];
  const isIp = /^\d{1,3}(\.\d{1,3}){3}$/.test(host) || host.includes(':');
  const parts = host.split('.');
  if (isIp || parts.length < 2) return [host];
  const candidates: string[] = [];
  for (let i = 0; i <= parts.length - 2; i += 1) {
    const domain = parts.slice(i).join('.');
    candidates.push(domain, `.${domain}`);
  }
  return candidates;
}
