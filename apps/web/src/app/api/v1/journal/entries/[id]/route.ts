/**
 * One journal entry, owner only.
 *
 * GET    return the entry (full text).
 * PATCH  edit the title and/or text, or save a draft (`status: 'saved'`). A saved entry can never go
 *        back to draft (409). `created_at` - when the writing began - never changes; `updated_at` does.
 * DELETE permanently delete the entry.
 *
 * A member whose account deletion is pending gets 423 (lib/journal-access.ts).
 * Another member's entry is reported as 404, exactly like one that does not exist, so ids reveal nothing.
 * Every response is private/no-store, and nothing here logs the body, title or text (see privateRoute).
 */
import { requireJournalAccess, journalAccessErrorResponse } from '@/lib/journal-access';
import { success, badRequest, notFound, error } from '@/lib/api-response';
import { privateRoute, safeErrorCode } from '@/lib/private-response';
import { deleteJournalEntry, getJournalEntry, updateJournalEntry } from '@/lib/journal';
import {
  journalEntryIdParam,
  journalEntryUpdateSchema,
  journalValidationDetails,
} from '@/lib/validation';

export const runtime = 'nodejs';

const MAX_BODY_CHARS = 200_000;

interface RouteParams {
  params: Promise<{ id: string }>;
}

export const GET = privateRoute(
  'journal get',
  async (_request: Request, { params }: RouteParams) => {
    let user;
    try {
      user = await requireJournalAccess();
    } catch (err) {
      return journalAccessErrorResponse(err);
    }
    const id = journalEntryIdParam.safeParse(await params);
    if (!id.success) return notFound('Not found');

    const entry = await getJournalEntry(user.id, id.data.id);
    return entry ? success(entry) : notFound('Not found');
  },
);

export const PATCH = privateRoute(
  'journal update',
  async (request: Request, { params }: RouteParams) => {
    let user;
    try {
      user = await requireJournalAccess();
    } catch (err) {
      return journalAccessErrorResponse(err);
    }
    const id = journalEntryIdParam.safeParse(await params);
    if (!id.success) return notFound('Not found');

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
    const parsed = journalEntryUpdateSchema.safeParse(body);
    if (!parsed.success) {
      return badRequest('Validation failed', journalValidationDetails(parsed.error));
    }

    let result;
    try {
      result = await updateJournalEntry(user.id, id.data.id, parsed.data);
    } catch (err) {
      // 23514 = check_violation: the database refused the change (the draft-revert backstop, or a
      // limit). Reported as a plain conflict with no detail; the error object is never logged or returned.
      if (safeErrorCode(err) === '23514') {
        return error('CONFLICT', 'This change is not allowed for this entry', 409);
      }
      throw err;
    }

    switch (result.kind) {
      case 'updated':
        return success(result.entry);
      case 'not_found':
        return notFound('Not found');
      case 'revert_refused':
        return error('CONFLICT', 'A saved entry cannot be returned to a draft', 409);
      case 'empty_saved':
        return badRequest('Validation failed', { fields: ['content'] });
    }
  },
);

export const DELETE = privateRoute(
  'journal delete',
  async (_request: Request, { params }: RouteParams) => {
    let user;
    try {
      user = await requireJournalAccess();
    } catch (err) {
      return journalAccessErrorResponse(err);
    }
    const id = journalEntryIdParam.safeParse(await params);
    if (!id.success) return notFound('Not found');

    const deleted = await deleteJournalEntry(user.id, id.data.id);
    return deleted ? success({ deleted: true }) : notFound('Not found');
  },
);
