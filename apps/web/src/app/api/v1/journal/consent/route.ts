/**
 * My Reflections - the member's first-use acknowledgement (decision Q1, 16 Nov 2026).
 *
 * GET    /api/v1/journal/consent   { status: 'granted' | 'required' | 'withdrawn', version }
 * POST   /api/v1/journal/consent   body { version }: records that the member acknowledged that notice
 *                                  version. A version other than the current one is refused (409), so
 *                                  nobody is recorded as agreeing to wording they were not shown.
 * DELETE /api/v1/journal/consent   withdraws permission to write. Existing reflections are untouched;
 *                                  the member can still read and delete them.
 *
 * Same access rule and privacy rules as the journal itself: a signed-in member whose deletion is not
 * pending (423 otherwise), private/no-store responses, nothing logged. The wording and legal basis are
 * not approved: see docs/my-reflections-consent.md.
 */
import { requireJournalAccess, journalAccessErrorResponse } from '@/lib/journal-access';
import { AccountDeletionPendingError } from '@/lib/deletion-state';
import { success, badRequest, error } from '@/lib/api-response';
import { privateRoute } from '@/lib/private-response';
import { journalConsentBodySchema } from '@/lib/validation';
import {
  getJournalConsent,
  recordJournalConsent,
  withdrawJournalConsent,
} from '@/lib/journal-consent';

export const runtime = 'nodejs';

export const GET = privateRoute('journal consent get', async () => {
  let user;
  try {
    user = await requireJournalAccess();
  } catch (err) {
    return journalAccessErrorResponse(err);
  }
  return success(await getJournalConsent(user.id));
});

export const POST = privateRoute('journal consent record', async (request: Request) => {
  let user;
  try {
    user = await requireJournalAccess();
  } catch (err) {
    return journalAccessErrorResponse(err);
  }
  let body: unknown;
  try {
    body = JSON.parse(await request.text());
  } catch {
    return badRequest('Invalid JSON body');
  }
  const parsed = journalConsentBodySchema.safeParse(body);
  if (!parsed.success) return badRequest('Validation failed');

  try {
    const result = await recordJournalConsent(user.id, parsed.data.version);
    if (result.kind === 'stale_version') {
      return error(
        'CONSENT_VERSION_MISMATCH',
        'This notice has been updated. Please read it again.',
        409,
      );
    }
    return success(result.state);
  } catch (err) {
    if (err instanceof AccountDeletionPendingError) return journalAccessErrorResponse(err);
    throw err;
  }
});

export const DELETE = privateRoute('journal consent withdraw', async () => {
  let user;
  try {
    user = await requireJournalAccess();
  } catch (err) {
    return journalAccessErrorResponse(err);
  }
  try {
    return success(await withdrawJournalConsent(user.id));
  } catch (err) {
    if (err instanceof AccountDeletionPendingError) return journalAccessErrorResponse(err);
    throw err;
  }
});
