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

async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
  let response: Response;
  try {
    response = await fetch(path, {
      method,
      headers: body === undefined ? undefined : { 'Content-Type': 'application/json' },
      body: body === undefined ? undefined : JSON.stringify(body),
      cache: 'no-store',
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

export const reflectionsApi = {
  get: <T>(path: string) => request<T>('GET', path),
  post: <T>(path: string, body?: unknown) => request<T>('POST', path, body),
  patch: <T>(path: string, body?: unknown) => request<T>('PATCH', path, body),
  delete: <T>(path: string) => request<T>('DELETE', path),
};
