/**
 * My Reflections: the logic the app and the website share, free of any framework so it is tested once.
 * Nothing here logs, stores or transmits writing anywhere except through the `api` the caller passes in
 * (the member's own journal API). The text lives in memory while the editor is open and nowhere else.
 */
import { REFLECTION_STATES } from './copy';

/** Mirrors JOURNAL_TITLE_MAX / JOURNAL_CONTENT_MAX in packages/db/src/schema/journal-entries.ts. */
export const REFLECTION_TITLE_MAX = 200;
export const REFLECTION_CONTENT_MAX = 20_000;

/** Show a "characters left" hint only when the member is close to the limit, so it is never noise. */
export const REFLECTION_COUNTER_THRESHOLD = 18_000;

/**
 * A random RFC 4122 v4 id, made once per new reflection and sent with the first save. The server
 * treats it as an idempotency key: a double tap or a retry after a flaky connection returns the same
 * entry instead of creating a second one. Uses the platform's secure source when present.
 */
export function newClientId(
  random: (bytes: Uint8Array) => Uint8Array = defaultRandomBytes,
): string {
  const bytes = random(new Uint8Array(16));
  bytes[6] = (bytes[6]! & 0x0f) | 0x40; // version 4
  bytes[8] = (bytes[8]! & 0x3f) | 0x80; // variant 10
  const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

function defaultRandomBytes(bytes: Uint8Array): Uint8Array {
  const webCrypto = (globalThis as { crypto?: { getRandomValues?: (a: Uint8Array) => Uint8Array } })
    .crypto;
  if (webCrypto?.getRandomValues) return webCrypto.getRandomValues(bytes);
  // Fallback for runtimes without Web Crypto. The id is an idempotency key, not a secret: the server
  // scopes it to the signed-in member, so a collision can only ever be refused, never expose anything.
  for (let i = 0; i < bytes.length; i += 1) bytes[i] = Math.floor(Math.random() * 256);
  return bytes;
}

export interface ReflectionFields {
  title: string;
  content: string;
}

/** The parts of a server entry the shared logic reads. */
export interface ReflectionEntryLike {
  id: string;
  title: string | null;
  content: string;
  status: 'draft' | 'saved';
}

/** The fields as the server would hold them: the title trimmed ('' is "no title"), the text untouched. */
export function normalizeFields(fields: ReflectionFields): ReflectionFields {
  return { title: fields.title.trim(), content: fields.content };
}

export const EMPTY_FIELDS: ReflectionFields = { title: '', content: '' };

export function fieldsOf(entry: Pick<ReflectionEntryLike, 'title' | 'content'>): ReflectionFields {
  return { title: entry.title ?? '', content: entry.content };
}

export function hasUnsavedChanges(current: ReflectionFields, baseline: ReflectionFields): boolean {
  const a = normalizeFields(current);
  const b = normalizeFields(baseline);
  return a.title !== b.title || a.content !== b.content;
}

/** True when there is nothing worth keeping: no text (a title alone does not make a reflection). */
export function isBlank(fields: ReflectionFields): boolean {
  return fields.content.trim().length === 0;
}

/** Characters left, only when the member is near the limit. */
export function charactersLeft(content: string): number | null {
  return content.length >= REFLECTION_COUNTER_THRESHOLD
    ? REFLECTION_CONTENT_MAX - content.length
    : null;
}

export type SaveTarget = 'draft' | 'saved';

export class ReflectionSaveError extends Error {
  constructor(readonly reason: 'needs_text' | 'already_saved') {
    super(reason);
    this.name = 'ReflectionSaveError';
  }
}

/** The two calls saving needs; each resolves to the unwrapped `data` or throws an error with `status`/`code`. */
export interface ReflectionApi {
  post<T>(path: string, body?: unknown): Promise<T>;
  patch<T>(path: string, body?: unknown): Promise<T>;
}

interface SaveInput<E extends ReflectionEntryLike> {
  api: ReflectionApi;
  /** The id minted once for this reflection; used only for the first save. */
  clientId: string;
  /** The server's copy once one exists (after a first successful save or when opened from history). */
  existing: E | null;
  fields: ReflectionFields;
  target: SaveTarget;
}

/**
 * Saves the reflection and returns the server's copy.
 *
 *  - First save: POST with the client id (idempotent). If the server answers with a copy that does not
 *    match what we meant to write - which happens when an earlier attempt with this same id reached the
 *    server but its reply was lost, and the member kept typing before trying again - the newer text is
 *    applied with a follow-up PATCH, so a retry can never silently keep the older text.
 *  - Later saves: PATCH.
 *  - A saved reflection can never become a draft; asking for that is refused here, before any request.
 */
export async function saveReflection<E extends ReflectionEntryLike>({
  api,
  clientId,
  existing,
  fields,
  target,
}: SaveInput<E>): Promise<E> {
  const wanted = normalizeFields(fields);
  if (target === 'saved' && isBlank(wanted)) throw new ReflectionSaveError('needs_text');
  if (existing?.status === 'saved' && target === 'draft') {
    throw new ReflectionSaveError('already_saved');
  }

  const title = wanted.title === '' ? null : wanted.title;

  if (!existing) {
    const created = await api.post<E>('/api/v1/journal/entries', {
      id: clientId,
      title,
      content: wanted.content,
      status: target,
    });
    const matches =
      (created.title ?? '') === wanted.title &&
      created.content === wanted.content &&
      (target === 'draft' || created.status === 'saved');
    if (matches) return created;
    return api.patch<E>(`/api/v1/journal/entries/${created.id}`, {
      title,
      content: wanted.content,
      ...(target === 'saved' && created.status === 'draft' ? { status: 'saved' } : {}),
    });
  }

  return api.patch<E>(`/api/v1/journal/entries/${existing.id}`, {
    title,
    content: wanted.content,
    ...(target === 'saved' && existing.status === 'draft' ? { status: 'saved' } : {}),
  });
}

export type ReflectionErrorKind =
  'locked' | 'not_found' | 'already_saved' | 'signed_out' | 'network' | 'failed';

export interface DescribedError {
  kind: ReflectionErrorKind;
  message: string;
}

/**
 * A calm message for a failed request. Reads only `status` and `code` from the error (so it works for
 * any client's error class) and never repeats server text, which could in principle describe the
 * request. Never claims the action succeeded. `action` picks the wording for a generic failure.
 */
export function describeReflectionError(
  err: unknown,
  action: 'load' | 'save' | 'delete' | 'list',
): DescribedError {
  if (err instanceof ReflectionSaveError) {
    return err.reason === 'needs_text'
      ? { kind: 'failed', message: REFLECTION_STATES.needsText }
      : { kind: 'already_saved', message: REFLECTION_STATES.alreadySaved };
  }
  const { status, code } = err as { status?: unknown; code?: unknown };
  if (typeof status === 'number') {
    if (status === 423 || code === 'ACCOUNT_DELETION_PENDING') {
      return { kind: 'locked', message: REFLECTION_STATES.lockedForDeletion };
    }
    if (status === 404) return { kind: 'not_found', message: REFLECTION_STATES.notFound };
    if (status === 409) return { kind: 'already_saved', message: REFLECTION_STATES.alreadySaved };
    if (status === 401) return { kind: 'signed_out', message: REFLECTION_STATES.signedOut };
    if (status === 413) return { kind: 'failed', message: REFLECTION_STATES.tooLong };
    if (status === 0) return { kind: 'network', message: REFLECTION_STATES.network };
  }
  const message =
    action === 'save'
      ? REFLECTION_STATES.saveFailed
      : action === 'delete'
        ? REFLECTION_STATES.deleteFailed
        : action === 'list'
          ? REFLECTION_STATES.listFailed
          : REFLECTION_STATES.loadFailed;
  return { kind: 'failed', message };
}

/** "2026-11-14T10:00:00Z" -> "14 November 2026". Dated by when the writing began (`createdAt`). */
export function formatReflectionDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}
