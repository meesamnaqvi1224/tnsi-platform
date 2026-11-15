/**
 * The website's calls to the member's own journal API (`/api/v1/journal/entries`), using the signed-in
 * session cookie. Unwraps the `{data}` / `{error}` envelope and throws an error carrying only `status` and
 * `code`, which is all the shared error description (`@tnsi/core`) reads. Nothing is logged.
 */
export class ReflectionRequestError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
  ) {
    super(code);
    this.name = 'ReflectionRequestError';
  }
}

async function request<T>(
  method: string,
  path: string,
  body?: unknown,
  keepalive = false,
): Promise<T> {
  let response: Response;
  try {
    response = await fetch(path, {
      method,
      headers: body === undefined ? undefined : { 'Content-Type': 'application/json' },
      body: body === undefined ? undefined : JSON.stringify(body),
      cache: 'no-store',
      // Lets a request started as the page is hidden or closed still finish (the draft autosave flush).
      ...(keepalive ? { keepalive: true } : {}),
    });
  } catch {
    throw new ReflectionRequestError(0, 'NETWORK_ERROR');
  }
  const parsed = (await response.json().catch(() => null)) as {
    data?: T;
    error?: { code?: string };
  } | null;
  if (!response.ok || !parsed || !('data' in parsed)) {
    throw new ReflectionRequestError(response.status, parsed?.error?.code ?? 'UNKNOWN_ERROR');
  }
  return parsed.data as T;
}

function makeApi(keepalive: boolean) {
  return {
    get: <T>(path: string) => request<T>('GET', path, undefined, keepalive),
    post: <T>(path: string, body?: unknown) => request<T>('POST', path, body, keepalive),
    patch: <T>(path: string, body?: unknown) => request<T>('PATCH', path, body, keepalive),
    delete: <T>(path: string) => request<T>('DELETE', path, undefined, keepalive),
  };
}

export const reflectionsApi = makeApi(false);

/**
 * The same calls with `keepalive`, for the final autosave as the page is hidden or closed. Browsers cap a
 * keepalive body at 64 KiB, so use `fitsKeepalive` first.
 */
export const reflectionsKeepaliveApi = makeApi(true);

export function fitsKeepalive(fields: { title: string; content: string }): boolean {
  // Generous margin below the 64 KiB limit for the JSON wrapper and multi-byte characters.
  return new TextEncoder().encode(JSON.stringify(fields)).length < 60_000;
}
