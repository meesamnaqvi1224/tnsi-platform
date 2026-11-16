/**
 * My Reflections - the member's own journal entries.
 *
 * GET  /api/v1/journal/entries   the member's SAVED entries, newest first by when the writing began,
 *                                with a short preview instead of the full text. `?status=draft` lists
 *                                the member's own drafts instead (to resume one). Paged like the other
 *                                history endpoints (limit/offset).
 * POST /api/v1/journal/entries   create a draft or a saved entry. An optional client-generated `id`
 *                                makes the create idempotent: repeating it returns the same entry.
 *
 * Access: a signed-in member whose account deletion is pending gets 423 on every journal route (see
 * lib/journal-access.ts) - nothing can be read, written or re-created while a deletion is unfinished.
 *
 * Privacy: every response is private/no-store; the owner is always the authenticated member and is
 * never read from the request; nothing here logs the body, the title or the text (see privateRoute).
 * Journal entries are independent of check-ins, recommendations and practice completion.
 */
import { requireJournalAccess, journalAccessErrorResponse } from '@/lib/journal-access';
import { success, badRequest, notFound, error } from '@/lib/api-response';
import { privateRoute } from '@/lib/private-response';
import { createJournalEntry, listJournalEntries } from '@/lib/journal';
import {
  journalEntryCreateSchema,
  journalEntriesListQuerySchema,
  journalValidationDetails,
} from '@/lib/validation';

export const runtime = 'nodejs';

/** A journal body is at most 20,000 characters of text plus a little structure; anything far beyond that is not a journal entry. */
const MAX_BODY_CHARS = 200_000;

export const GET = privateRoute('journal list', async (request: Request) => {
  let user;
  try {
    user = await requireJournalAccess();
  } catch (err) {
    return journalAccessErrorResponse(err);
  }

  const { searchParams } = new URL(request.url);
  const parsed = journalEntriesListQuerySchema.safeParse({
    limit: searchParams.get('limit') ?? undefined,
    offset: searchParams.get('offset') ?? undefined,
    status: searchParams.get('status') ?? undefined,
  });
  if (!parsed.success) {
    return badRequest('Invalid query parameters', journalValidationDetails(parsed.error));
  }
  const { limit, offset, status } = parsed.data;

  const { entries, hasMore } = await listJournalEntries(user.id, { limit, offset, status });
  return success({ entries, pagination: { limit, offset, hasMore } });
});

export const POST = privateRoute('journal create', async (request: Request) => {
  let user;
  try {
    user = await requireJournalAccess();
  } catch (err) {
    return journalAccessErrorResponse(err);
  }

  const text = await request.text();
  if (text.length > MAX_BODY_CHARS) {
    return error('PAYLOAD_TOO_LARGE', 'Request body is too large', 413);
  }
  let body: unknown;
  try {
    body = JSON.parse(text);
  } catch {
    return badRequest('Invalid JSON body');
  }

  const parsed = journalEntryCreateSchema.safeParse(body);
  if (!parsed.success) {
    return badRequest('Validation failed', journalValidationDetails(parsed.error));
  }

  const result = await createJournalEntry(user.id, parsed.data);
  switch (result.kind) {
    case 'created':
      return success(result.entry, 201);
    case 'replayed':
      return success(result.entry, 200);
    case 'reference_mismatch':
      return badRequest('The practice session does not belong to that practice');
    case 'reference_not_found':
    case 'not_found':
      return notFound('Not found');
  }
});
