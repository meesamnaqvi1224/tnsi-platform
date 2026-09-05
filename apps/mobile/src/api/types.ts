/**
 * Mirrors apps/web/src/lib/api-response.ts's response envelope. Not
 * imported directly from @tnsi/web (apps can't depend on each other), so
 * this is a hand-kept type mirror - if that shape changes, update this too.
 */
export interface ApiErrorBody {
  code: string;
  message: string;
  details?: Record<string, unknown>;
}

export interface ApiSuccess<T> {
  data: T;
}

export interface ApiFailure {
  error: ApiErrorBody;
}

export type ApiResponseBody<T> = ApiSuccess<T> | ApiFailure;

/**
 * Thrown by the API client for both transport failures (network, non-JSON
 * response) and server-reported errors (the `{error}` envelope), so
 * callers can handle both with a single catch.
 */
export class ApiRequestError extends Error {
  readonly status: number;
  readonly code: string;

  constructor(message: string, status: number, code: string) {
    super(message);
    this.name = 'ApiRequestError';
    this.status = status;
    this.code = code;
  }
}

/** Response shape of GET /api/v1/me, per apps/web/src/app/api/v1/me/route.ts. */
export interface MeResponse {
  id: string;
  clerkUserId: string;
  email: string;
  fullName: string | null;
  avatarUrl: string | null;
  metadata: unknown;
  createdAt: string;
  updatedAt: string;
}
