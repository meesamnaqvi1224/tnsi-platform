import { afterAll, describe, expect, it } from 'vitest';
import {
  deleteFlowiContact,
  findFlowiContactIdByEmail,
  suppressFlowiContact,
  upsertFlowiContact,
} from './flowi';

/**
 * LIVE CHECK of the three account-deletion calls against a REAL Flowi account (the lookup, the
 * do-not-disturb update and the delete used by account deletion; see flowi.ts and
 * docs/account-deletion-and-data-retention.md section 4). The unit tests prove what our client sends to a
 * FAKE Flowi; this proves the real service accepts those requests and behaves as the code assumes.
 *
 * SKIPPED unless BOTH `FLOWI_LIVE_CHECK=yes` and `FLOWI_API_KEY` / `FLOWI_LOCATION_ID` are set. It creates
 * ONE synthetic contact on the reserved `example.com` domain (nothing is ever sent to it), with NO tags,
 * and removes it again as part of the test. It never touches any other contact. Prefer a Flowi sub-account
 * or test location: a new contact can fire that location's "contact created" automations.
 *
 * Run (the credentials come from your own private file, never typed into a command line):
 *
 *   set -a; . ~/tnsi-secrets/flowi.env; set +a
 *   FLOWI_LIVE_CHECK=yes pnpm --filter @tnsi/integrations exec vitest run src/flowi.live-check.test.ts
 *
 * If the test fails part-way, the synthetic contact's id is printed so it can be deleted by hand.
 */
const enabled =
  process.env.FLOWI_LIVE_CHECK === 'yes' &&
  !!process.env.FLOWI_API_KEY &&
  !!process.env.FLOWI_LOCATION_ID;

const EMAIL = `tnsi-deletion-check-${Date.now()}@example.com`;
let createdId: string | null = null;
let removed = false;

async function readContactDnd(contactId: string): Promise<boolean | null> {
  const response = await fetch(`https://services.leadconnectorhq.com/contacts/${contactId}`, {
    headers: {
      Authorization: `Bearer ${process.env.FLOWI_API_KEY}`,
      Version: '2021-07-28',
      Accept: 'application/json',
    },
  });
  if (!response.ok) return null;
  const body = (await response.json()) as { contact?: { dnd?: boolean } };
  return body.contact?.dnd ?? null;
}

describe.skipIf(!enabled)('Flowi account-deletion calls against the real account', () => {
  afterAll(async () => {
    if (createdId && !removed) {
      console.error(
        `[flowi live check] the synthetic contact ${createdId} was NOT removed - delete it in Flowi by hand.`,
      );
      await deleteFlowiContact(createdId).catch(() => undefined);
    }
  });

  it('lookup, suppress, delete: each does what account deletion assumes', async () => {
    // Set-up (uses the already-proven upsert): one synthetic contact, no tags.
    const upserted = await upsertFlowiContact({
      email: EMAIL,
      source: 'TNSI deletion check (safe to delete)',
      firstName: 'Deletion',
      lastName: 'Check',
    });
    createdId = upserted.contactId;

    // 1. LOOKUP finds exactly that contact, and none for an address that does not exist.
    expect(await findFlowiContactIdByEmail(EMAIL)).toBe(createdId);
    expect(await findFlowiContactIdByEmail(`nobody-${Date.now()}@example.com`)).toBeNull();

    // 2. SUPPRESS turns on do-not-disturb (read back from Flowi), and repeating it is harmless.
    expect(await readContactDnd(createdId)).not.toBe(true);
    expect(await suppressFlowiContact(createdId)).toBe(true);
    expect(await readContactDnd(createdId)).toBe(true);
    expect(await suppressFlowiContact(createdId)).toBe(true);

    // 3. DELETE removes it; it is then gone from lookup; a repeat reports "already gone" (not an error);
    //    and suppressing a deleted contact reports "nothing to suppress" rather than recreating it.
    expect(await deleteFlowiContact(createdId)).toBe(true);
    removed = true;
    expect(await findFlowiContactIdByEmail(EMAIL)).toBeNull();
    expect(await deleteFlowiContact(createdId)).toBe(false);
    expect(await suppressFlowiContact(createdId)).toBe(false);
    expect(await findFlowiContactIdByEmail(EMAIL)).toBeNull(); // still not recreated
  }, 120_000);
});
