/**
 * Trial eligibility key: a deterministic, privacy-preserving identifier for
 * "one free trial per verified, normalised email address".
 *
 * ## What is stored
 * Only `HMAC-SHA-256(secret, normalisedEmail)` as lowercase hex, in
 * `trial_claims.email_key` (see packages/db/src/schema/trial-claims.ts), with
 * the `key_version` of the secret that produced it. The raw address is never
 * stored, and neither it nor the derived key may ever be logged. Unlike a plain
 * hash, the key cannot be matched against a list of candidate addresses
 * without the server-side secret.
 *
 * ## Normalisation (and its deliberate limits)
 * Unicode NFKC, trim, lowercase - nothing more. Plus-tags and Gmail dots are
 * NOT stripped, so `a+1@x.com` and `a@x.com` are different people for this
 * purpose. An alternate address can therefore claim another trial; the owner
 * has accepted that limitation.
 *
 * ## Configuration (server environment only)
 * - `TRIAL_ELIGIBILITY_SECRET`        current secret, >= 32 characters from
 *                                     `[A-Za-z0-9+/=_.-]` (e.g. `openssl rand -base64 48`)
 * - `TRIAL_ELIGIBILITY_KEY_VERSION`   current version, an integer 1-32767
 *                                     (the `key_version` column is a smallint)
 * - `TRIAL_ELIGIBILITY_PREVIOUS_KEYS` optional, comma-separated `version:secret`
 *                                     pairs for still-active older versions
 *
 * Anything missing or malformed throws `TrialKeyConfigError`: there is no
 * fallback to an unhashed email, a random key, or an account-only key, because
 * each of those would quietly stop enforcing "one per person".
 *
 * ## Rotation
 * HMAC is one-way and raw emails are not stored, so an existing claim can never
 * be recomputed under a new secret from the table alone. Rotation therefore
 * never replaces a secret; it adds a version:
 *  1. Generate a new secret and choose the next version number.
 *  2. Deploy with the new secret as current and the old one listed in
 *     `TRIAL_ELIGIBILITY_PREVIOUS_KEYS`. New claims are written under the new
 *     version; every eligibility check looks the email up under ALL active
 *     versions (`lookup`), so existing claims stay discoverable.
 *  3. Claims migrate forward on touch: when a lookup finds a claim under an
 *     older version, `claimTrial` re-keys that row to the current version in the
 *     same transaction (see `rekeyPlan`).
 *  4. An old version may be removed from the environment ONLY when
 *     `SELECT count(*) FROM trial_claims WHERE key_version = <old>` is zero, or
 *     when the owner explicitly accepts that those claimants become eligible
 *     again. Dropping a version with live claims silently re-grants trials.
 * Losing the secret is equivalent to dropping every version: all claimants
 * become eligible. Treat it like any other production secret.
 */
import { createHmac } from 'node:crypto';

export class InvalidEmailError extends Error {
  constructor() {
    super('Email address is not valid.');
    this.name = 'InvalidEmailError';
  }
}

export class UnverifiedEmailError extends Error {
  constructor() {
    super('A verified primary email address is required.');
    this.name = 'UnverifiedEmailError';
  }
}

/** Configuration is missing or malformed. Messages name a variable, never a value. */
export class TrialKeyConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'TrialKeyConfigError';
  }
}

/**
 * Unicode NFKC, trim, lowercase. Idempotent: normalising an already-normalised
 * address returns it unchanged (a final NFKC pass guards against lowercasing
 * producing a decomposable sequence). Rejects anything that is not shaped like
 * `local@domain` - exactly one `@`, both sides non-empty.
 */
export function normaliseEmail(raw: string): string {
  if (typeof raw !== 'string') throw new InvalidEmailError();
  const normalised = raw.normalize('NFKC').trim().toLowerCase().normalize('NFKC');
  const at = normalised.indexOf('@');
  if (at <= 0 || at !== normalised.lastIndexOf('@') || at === normalised.length - 1) {
    throw new InvalidEmailError();
  }
  return normalised;
}

/** The slice of an identity provider's user this needs; Clerk's `User` satisfies it. */
export interface ProviderUserEmails {
  primaryEmailAddressId: string | null | undefined;
  emailAddresses: ReadonlyArray<{
    id: string;
    emailAddress: string;
    verification?: { status?: string | null } | null;
  }>;
}

/**
 * The user's primary email address, only if the provider reports it verified.
 * An unverified, missing or non-primary address is refused - never substituted
 * with another address on the account.
 */
export function requireVerifiedPrimaryEmail(user: ProviderUserEmails): string {
  if (!user.primaryEmailAddressId) throw new UnverifiedEmailError();
  const primary = user.emailAddresses.find((e) => e.id === user.primaryEmailAddressId);
  if (!primary || primary.verification?.status !== 'verified') throw new UnverifiedEmailError();
  return primary.emailAddress;
}

export interface TrialKeyVersion {
  version: number;
  secret: string;
}

export interface TrialKeyConfig {
  current: TrialKeyVersion;
  /** Older versions still active for lookup; never used to write new claims. */
  previous: TrialKeyVersion[];
}

const MIN_SECRET_LENGTH = 32;
const SECRET_CHARSET = /^[A-Za-z0-9+/=_.-]+$/;
const MAX_KEY_VERSION = 32767; // smallint

function parseVersion(raw: string | undefined, variable: string): number {
  if (raw === undefined || raw.trim() === '') {
    throw new TrialKeyConfigError(`${variable} is required.`);
  }
  if (!/^\d+$/.test(raw.trim())) {
    throw new TrialKeyConfigError(`${variable} must be a whole number.`);
  }
  const version = Number(raw.trim());
  if (version < 1 || version > MAX_KEY_VERSION) {
    throw new TrialKeyConfigError(`${variable} must be between 1 and ${MAX_KEY_VERSION}.`);
  }
  return version;
}

function checkSecret(secret: string, variable: string): string {
  if (secret.length < MIN_SECRET_LENGTH) {
    throw new TrialKeyConfigError(`${variable} must be at least ${MIN_SECRET_LENGTH} characters.`);
  }
  if (!SECRET_CHARSET.test(secret)) {
    throw new TrialKeyConfigError(`${variable} contains unsupported characters.`);
  }
  return secret;
}

/** Reads and validates the key configuration. Throws `TrialKeyConfigError` - fails closed. */
export function loadTrialKeyConfig(
  env: Readonly<Record<string, string | undefined>> = process.env,
): TrialKeyConfig {
  const rawSecret = env.TRIAL_ELIGIBILITY_SECRET;
  if (rawSecret === undefined || rawSecret.trim() === '') {
    throw new TrialKeyConfigError('TRIAL_ELIGIBILITY_SECRET is required.');
  }
  const current: TrialKeyVersion = {
    secret: checkSecret(rawSecret.trim(), 'TRIAL_ELIGIBILITY_SECRET'),
    version: parseVersion(env.TRIAL_ELIGIBILITY_KEY_VERSION, 'TRIAL_ELIGIBILITY_KEY_VERSION'),
  };

  const previous: TrialKeyVersion[] = [];
  const rawPrevious = env.TRIAL_ELIGIBILITY_PREVIOUS_KEYS;
  if (rawPrevious !== undefined && rawPrevious.trim() !== '') {
    for (const entry of rawPrevious.split(',')) {
      const colon = entry.indexOf(':');
      if (colon <= 0) {
        throw new TrialKeyConfigError(
          'TRIAL_ELIGIBILITY_PREVIOUS_KEYS entries must look like version:secret.',
        );
      }
      previous.push({
        version: parseVersion(entry.slice(0, colon), 'TRIAL_ELIGIBILITY_PREVIOUS_KEYS version'),
        secret: checkSecret(
          entry.slice(colon + 1).trim(),
          'TRIAL_ELIGIBILITY_PREVIOUS_KEYS secret',
        ),
      });
    }
  }

  const versions = [current.version, ...previous.map((p) => p.version)];
  if (new Set(versions).size !== versions.length) {
    throw new TrialKeyConfigError('Trial eligibility key versions must be unique.');
  }
  return { current, previous };
}

/** Label mixed into every HMAC so this secret's output cannot be confused with any other use of it. */
const KEY_DOMAIN = 'tnsi:trial-eligibility:v1';

/** Hex HMAC-SHA-256 of an already-normalised email under one secret. */
export function deriveEmailKey(normalisedEmail: string, secret: string): string {
  return createHmac('sha256', secret).update(`${KEY_DOMAIN}\0${normalisedEmail}`).digest('hex');
}

export interface EligibilityKey {
  version: number;
  key: string;
}

export interface EligibilityKeys {
  /** The key new claims are written under. */
  current: EligibilityKey;
  /** The current key plus one per still-active older version - what every lookup must check. */
  lookup: EligibilityKey[];
}

/**
 * The keys for a verified email: the current one for writing, and one per
 * active version for looking up existing claims. `verifiedEmail` must already
 * have passed `requireVerifiedPrimaryEmail`.
 */
export function buildEligibilityKeys(
  verifiedEmail: string,
  config: TrialKeyConfig,
): EligibilityKeys {
  const email = normaliseEmail(verifiedEmail);
  const current: EligibilityKey = {
    version: config.current.version,
    key: deriveEmailKey(email, config.current.secret),
  };
  const older = config.previous.map((p) => ({
    version: p.version,
    key: deriveEmailKey(email, p.secret),
  }));
  return { current, lookup: [current, ...older] };
}

/**
 * What to do with a claim found under `foundVersion`: nothing if it is already
 * under the current version, otherwise move it forward (see Rotation, step 3).
 */
export function rekeyPlan(
  found: { emailKey: string; keyVersion: number },
  keys: EligibilityKeys,
): { rekey: false } | { rekey: true; fromKey: string; toKey: string; toVersion: number } {
  if (found.keyVersion === keys.current.version) return { rekey: false };
  return {
    rekey: true,
    fromKey: found.emailKey,
    toKey: keys.current.key,
    toVersion: keys.current.version,
  };
}
