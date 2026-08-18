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

export interface FlowiUpsertContactInput {
  email: string;
  source: string;
  tags: string[];
}

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
    body: JSON.stringify({
      email: input.email,
      source: input.source,
      tags: input.tags,
      locationId,
    }),
  });

  if (!response.ok) {
    throw new FlowiRequestError(
      `Flowi request failed with status ${response.status}`,
      response.status,
    );
  }

  const data = (await response.json()) as FlowiUpsertResponseBody;

  return {
    isNew: data.new ?? false,
    contactId: data.contact?.id ?? '',
  };
}
