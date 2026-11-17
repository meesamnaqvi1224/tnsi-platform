/**
 * Flowi (GoHighLevel) server-to-server integration.
 *
 * Contract confirmed by direct testing against the production account
 * during Batch C4 (via the Flowi MCP connection, used only for discovery —
 * this module never depends on MCP at runtime):
 *
 * - Flowi is GoHighLevel under the hood; the public API base is
 *   https://services.leadconnectorhq.com.
 * - POST /contacts/upsert creates a contact or updates the existing one
 *   matched by email — confirmed idempotent: submitting the same email
 *   twice returned the same contact id both times, with `new: true` then
 *   `new: false`. This matches the location's own settings
 *   (`contactUniqueIdentifiers: ["phone", "email"]`,
 *   `allowDuplicateContact: false`), not an assumption.
 * - GHL auto-assigns `type: "lead"` to new contacts — no field needs to be
 *   set explicitly to satisfy the project's "newsletter → lead" rule.
 * - The `Version` header value below is GoHighLevel's documented API
 *   version convention; it was not itself observable through the MCP tool
 *   schema (the MCP server owns its own auth/versioning), so treat it as
 *   the one inferred-not-confirmed detail here and adjust if the real
 *   credential proves otherwise.
 */

const FLOWI_API_BASE_URL = 'https://services.leadconnectorhq.com';
const FLOWI_API_VERSION = '2021-07-28';

/** How long one Flowi call may take unless the caller sets a shorter limit. */
export const FLOWI_DEFAULT_TIMEOUT_MS = 8000;

/**
 * The timeout to hand to `AbortSignal.timeout`, which only accepts a whole number of
 * milliseconds: a fractional value (such as one computed from `performance.now()`)
 * makes Node throw `RangeError ERR_OUT_OF_RANGE` before any request is sent. Rounds
 * down to at least 1 ms, and falls back to the default for anything not a finite number.
 */
export function toRequestTimeoutMs(timeoutMs: number | undefined): number {
  if (timeoutMs === undefined || !Number.isFinite(timeoutMs)) return FLOWI_DEFAULT_TIMEOUT_MS;
  return Math.max(1, Math.floor(timeoutMs));
}

export interface FlowiCallOptions {
  /** Abort the request after this many milliseconds (default `FLOWI_DEFAULT_TIMEOUT_MS`). */
  timeoutMs?: number;
}

export interface FlowiUpsertContactInput {
  email: string;
  source: string;
  /**
   * `firstName`/`lastName` are core, built-in fields on every GHL contact
   * object (unlike custom fields, which are per-location schema and may
   * not exist) — safe to send even though only `email`/`source`
   * have been directly tested against the production account.
   */
  firstName?: string;
  lastName?: string;
  /**
   * Custom field values, by the field's ID (see `flowi-fields.ts`). IDs, not
   * keys: the IDs were read from the real account, whereas how the API expects a
   * key to be written was never confirmed. Empty values are not sent.
   */
  customFields?: FlowiCustomFieldValue[];
}

export interface FlowiCustomFieldValue {
  id: string;
  value: string;
}

/**
 * Builds the JSON body for `/contacts/upsert`. Pure, so the exact payload can be
 * tested without the network.
 *
 * It NEVER contains `tags`: Flowi's API documents that `tags` on an upsert
 * "will overwrite all current tags associated with the contact", which would wipe
 * tags Caroline's automations depend on. Tags are added afterwards with
 * `addFlowiContactTags`. Blank names and blank custom-field values are left out
 * rather than overwriting what the CRM already holds with nothing.
 */
export function buildUpsertBody(
  input: FlowiUpsertContactInput,
  locationId: string,
): Record<string, unknown> {
  const customFields = (input.customFields ?? [])
    .filter((f) => f.value.trim() !== '')
    .map((f) => ({ id: f.id, field_value: f.value }));
  return {
    email: input.email,
    source: input.source,
    locationId,
    ...(input.firstName ? { firstName: input.firstName } : {}),
    ...(input.lastName ? { lastName: input.lastName } : {}),
    ...(customFields.length > 0 ? { customFields } : {}),
  };
}

/**
 * What kind of failure this is, which decides how it is retried:
 *  - `temporary`: Flowi is busy or down (429, 5xx), or the request got no answer
 *    (network failure, timeout). Retrying later can succeed.
 *  - `config`: not configured, or Flowi refused our credentials/permissions or
 *    cannot find the resource (401, 403, 404). Fixed by changing configuration,
 *    not by waiting - so retried only a few times, then left visible.
 *  - `rejected`: any other 4xx. The request itself is wrong (e.g. a bad custom
 *    field) and will fail the same way every time.
 */
export type FlowiFailureKind = 'temporary' | 'config' | 'rejected';

export function classifyFlowiFailure(error: unknown): FlowiFailureKind {
  if (error instanceof FlowiConfigError) return 'config';
  if (error instanceof FlowiRequestError) {
    const { status } = error;
    if (status === 429 || status >= 500) return 'temporary';
    if (status === 401 || status === 403 || status === 404) return 'config';
    return 'rejected';
  }
  return 'temporary'; // network failure / timeout
}

/**
 * Free text (e.g. an enquiry message) is attached through `customFields`, using
 * field IDs read from the real Flowi account (`flowi-fields.ts`). Never guess an
 * ID: a wrong one can make the whole upsert be rejected.
 */

export interface FlowiUpsertContactResult {
  isNew: boolean;
  contactId: string;
}

/** Thrown when FLOWI_API_KEY / FLOWI_LOCATION_ID are not configured. */
export class FlowiConfigError extends Error {}

/** Thrown when Flowi's API responds with a non-success status. */
export class FlowiRequestError extends Error {
  constructor(
    message: string,
    public readonly status: number,
  ) {
    super(message);
  }
}

function getFlowiConfig(): { apiKey: string; locationId: string } {
  const apiKey = process.env.FLOWI_API_KEY;
  const locationId = process.env.FLOWI_LOCATION_ID;

  if (!apiKey || !locationId) {
    throw new FlowiConfigError(
      'Flowi is not configured — set FLOWI_API_KEY and FLOWI_LOCATION_ID.',
    );
  }

  return { apiKey, locationId };
}

interface FlowiUpsertResponseBody {
  new?: boolean;
  contact?: { id?: string };
}

/**
 * Creates or updates a Flowi contact, matched by email. Safe to call
 * repeatedly with the same email — Flowi updates the existing contact
 * rather than creating a duplicate.
 */
export async function upsertFlowiContact(
  input: FlowiUpsertContactInput,
  options: FlowiCallOptions = {},
): Promise<FlowiUpsertContactResult> {
  const { apiKey, locationId } = getFlowiConfig();

  const response = await fetch(`${FLOWI_API_BASE_URL}/contacts/upsert`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      Version: FLOWI_API_VERSION,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify(buildUpsertBody(input, locationId)),
    // Never let a slow CRM hold up a visitor's request or a worker run.
    signal: AbortSignal.timeout(toRequestTimeoutMs(options.timeoutMs)),
  });

  if (!response.ok) {
    throw new FlowiRequestError(
      `Flowi request failed with status ${response.status}`,
      response.status,
    );
  }

  const data = (await response.json()) as FlowiUpsertResponseBody;

  // The contact ID is needed to add tags. A success without one is not a usable
  // success, so it is reported as a (temporary) server-side fault.
  const contactId = data.contact?.id;
  if (typeof contactId !== 'string' || contactId === '') {
    throw new FlowiRequestError('Flowi upsert returned no contact id', 502);
  }

  return { isNew: data.new ?? false, contactId };
}

/**
 * Adds tags to a contact WITHOUT removing the tags it already has
 * (`POST /contacts/{contactId}/tags`, body `{ tags: string[] }`, scope
 * `contacts.write`, `Version: 2021-07-28`, per Flowi's official API spec). Adding a
 * tag the contact already has is a no-op, so repeating this is safe.
 */
export async function addFlowiContactTags(
  contactId: string,
  tags: string[],
  options: FlowiCallOptions = {},
): Promise<void> {
  const { apiKey } = getFlowiConfig();
  if (contactId === '') throw new FlowiRequestError('Missing contact id', 502);
  if (tags.length === 0) return;

  const response = await fetch(
    `${FLOWI_API_BASE_URL}/contacts/${encodeURIComponent(contactId)}/tags`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        Version: FLOWI_API_VERSION,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({ tags }),
      signal: AbortSignal.timeout(toRequestTimeoutMs(options.timeoutMs)),
    },
  );

  if (!response.ok) {
    throw new FlowiRequestError(
      `Flowi add-tags request failed with status ${response.status}`,
      response.status,
    );
  }
}

/**
 * ACCOUNT DELETION SUPPORT (lookup, marketing suppression, contact deletion).
 *
 * STATUS: written from GoHighLevel's published API (same base URL, `Version` header and
 * bearer credential as the calls above). A live run on 17 Nov 2026 (flowi.live-check.test.ts) confirmed
 * the lookup, the do-not-disturb update (read back as `dnd: true`) and the first delete, and found that
 * a repeat delete answers 400 "Contact not found" rather than 404 (see `contactIsMissing`). The
 * suppression of a contact that no longer exists has NOT been exercised live. They must be verified against a
 * test contact (and the credential's scopes confirmed: `contacts.readonly` for the lookup,
 * `contacts.write` for the other two) before account deletion is released. See
 * docs/account-deletion-and-data-retention.md.
 *
 * None of them creates a contact: suppression and deletion act only on a contact that
 * already exists, so a late or repeated call can never bring a deleted contact back.
 */

function flowiHeaders(apiKey: string, withBody: boolean): Record<string, string> {
  return {
    Authorization: `Bearer ${apiKey}`,
    Version: FLOWI_API_VERSION,
    Accept: 'application/json',
    ...(withBody ? { 'Content-Type': 'application/json' } : {}),
  };
}

interface FlowiDuplicateResponseBody {
  contact?: { id?: string } | null;
}

/**
 * The id of the contact with this email in our location, or null when there is none
 * (`GET /contacts/search/duplicate?locationId=..&email=..`). Read-only.
 */
export async function findFlowiContactIdByEmail(
  email: string,
  options: FlowiCallOptions = {},
): Promise<string | null> {
  const { apiKey, locationId } = getFlowiConfig();
  const query = new URLSearchParams({ locationId, email });
  const response = await fetch(`${FLOWI_API_BASE_URL}/contacts/search/duplicate?${query}`, {
    method: 'GET',
    headers: flowiHeaders(apiKey, false),
    signal: AbortSignal.timeout(toRequestTimeoutMs(options.timeoutMs)),
  });
  if (!response.ok) {
    throw new FlowiRequestError(
      `Flowi contact lookup failed with status ${response.status}`,
      response.status,
    );
  }
  const data = (await response.json()) as FlowiDuplicateResponseBody;
  const id = data.contact?.id;
  return typeof id === 'string' && id !== '' ? id : null;
}

/**
 * True when Flowi is saying "that contact does not exist". LIVE-VERIFIED on the real account (17 Nov 2026):
 * a repeat DELETE of an already-deleted contact answers `400 {"message":"Contact not found for id:..."}`,
 * NOT 404 as the unit tests' fake Flowi first assumed. Both mean the same thing here - there is nothing
 * left to act on - and treating the 400 as a failure would leave a retried deletion `failed` for a
 * contact that is already gone. Any other 400 (different message, unreadable body) is still a failure.
 */
async function contactIsMissing(response: Response): Promise<boolean> {
  if (response.status === 404) return true;
  if (response.status !== 400) return false;
  try {
    const body = (await response.json()) as { message?: unknown };
    return typeof body.message === 'string' && /contact not found/i.test(body.message);
  } catch {
    return false;
  }
}

/**
 * Turns on "do not disturb" for every channel on an existing contact
 * (`PUT /contacts/{contactId}`, body `{ dnd: true }`), which stops Flowi's marketing
 * messages and automations from contacting them. Resolves false when the contact no
 * longer exists (404): there is nobody left to suppress. Repeating it is harmless.
 */
export async function suppressFlowiContact(
  contactId: string,
  options: FlowiCallOptions = {},
): Promise<boolean> {
  const { apiKey } = getFlowiConfig();
  if (contactId === '') throw new FlowiRequestError('Missing contact id', 502);
  const response = await fetch(`${FLOWI_API_BASE_URL}/contacts/${encodeURIComponent(contactId)}`, {
    method: 'PUT',
    headers: flowiHeaders(apiKey, true),
    body: JSON.stringify({ dnd: true }),
    signal: AbortSignal.timeout(toRequestTimeoutMs(options.timeoutMs)),
  });
  if (await contactIsMissing(response)) return false;
  if (!response.ok) {
    throw new FlowiRequestError(
      `Flowi suppression request failed with status ${response.status}`,
      response.status,
    );
  }
  return true;
}

/**
 * Permanently deletes a contact (`DELETE /contacts/{contactId}`). Resolves false when it
 * was already gone (404), which is the same outcome, so a retry never gets stuck.
 */
export async function deleteFlowiContact(
  contactId: string,
  options: FlowiCallOptions = {},
): Promise<boolean> {
  const { apiKey } = getFlowiConfig();
  if (contactId === '') throw new FlowiRequestError('Missing contact id', 502);
  const response = await fetch(`${FLOWI_API_BASE_URL}/contacts/${encodeURIComponent(contactId)}`, {
    method: 'DELETE',
    headers: flowiHeaders(apiKey, false),
    signal: AbortSignal.timeout(toRequestTimeoutMs(options.timeoutMs)),
  });
  if (await contactIsMissing(response)) return false;
  if (!response.ok) {
    throw new FlowiRequestError(
      `Flowi delete request failed with status ${response.status}`,
      response.status,
    );
  }
  return true;
}
