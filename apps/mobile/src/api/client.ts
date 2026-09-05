import { env } from '@/lib/env';
import { ApiRequestError, type ApiResponseBody } from './types';

/** Supplies a fresh Clerk session JWT for each request; `null` means signed out. */
export type TokenGetter = () => Promise<string | null>;

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PATCH' | 'DELETE';
  body?: unknown;
}

/**
 * Thin typed wrapper around the existing TNSI `/api/v1/*` routes. No
 * business logic lives here - it only attaches the bearer token, calls the
 * existing Next.js API, and unwraps the `{data}`/`{error}` envelope from
 * apps/web/src/lib/api-response.ts.
 */
export function createApiClient(getToken: TokenGetter) {
  async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
    const token = await getToken();

    const headers: Record<string, string> = {
      Accept: 'application/json',
    };
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }
    if (options.body !== undefined) {
      headers['Content-Type'] = 'application/json';
    }

    let response: Response;
    try {
      response = await fetch(`${env.apiBaseUrl}${path}`, {
        method: options.method ?? 'GET',
        headers,
        body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
      });
    } catch (cause) {
      throw new ApiRequestError(
        cause instanceof Error ? cause.message : 'Network request failed',
        0,
        'NETWORK_ERROR',
      );
    }

    let body: ApiResponseBody<T> | undefined;
    try {
      body = (await response.json()) as ApiResponseBody<T>;
    } catch {
      throw new ApiRequestError('Response was not valid JSON', response.status, 'INVALID_RESPONSE');
    }

    if (!response.ok || !('data' in body)) {
      const failure = 'error' in body ? body.error : undefined;
      throw new ApiRequestError(
        failure?.message ?? 'Request failed',
        response.status,
        failure?.code ?? 'UNKNOWN_ERROR',
        failure?.details,
      );
    }

    return body.data;
  }

  return {
    get: <T>(path: string) => request<T>(path, { method: 'GET' }),
    post: <T>(path: string, body?: unknown) => request<T>(path, { method: 'POST', body }),
  };
}

export type ApiClient = ReturnType<typeof createApiClient>;
