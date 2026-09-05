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
 * callers can handle both with a single catch. `details` mirrors whatever
 * the server put in `error.details` - e.g. POST /api/v1/check-ins puts the
 * already-existing check-in there on a same-day duplicate, which callers
 * need to render the "already recorded" state instead of a generic error.
 */
export class ApiRequestError extends Error {
  readonly status: number;
  readonly code: string;
  readonly details?: Record<string, unknown>;

  constructor(message: string, status: number, code: string, details?: Record<string, unknown>) {
    super(message);
    this.name = 'ApiRequestError';
    this.status = status;
    this.code = code;
    this.details = details;
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

/** Mirrors packages/db/src/schema/check-ins.ts's `checkIns` row shape. */
export interface CheckIn {
  id: string;
  userId: string;
  moodScore: number;
  capacityScore: number;
  notes: string | null;
  completedAt: string;
  completedDate: string;
  metadata: unknown;
  createdAt: string;
}

/** Request body for POST /api/v1/check-ins, per apps/web/src/lib/validation.ts's `checkInSchema`. */
export interface CheckInInput {
  moodScore: number;
  capacityScore: number;
  notes?: string;
}

/** Mirrors packages/db/src/schema/practices.ts's `practices` row shape (fields this app uses). */
export type PracticeContentType =
  'audio' | 'video' | 'meditation' | 'breathwork' | 'movement' | 'journal';

export interface PracticeProgress {
  progressPct: number | null;
  positionSeconds: number | null;
  completed: boolean;
  completedAt: string | null;
  playCount: number;
  lastPlayedAt: string | null;
}

export interface TodayPractice {
  id: string;
  title: string;
  description: string | null;
  contentType: PracticeContentType;
  thumbnailUrl: string | null;
  durationSeconds: number | null;
  category: string | null;
  progress: PracticeProgress | null;
}

/** Response shape of GET /api/v1/today, per apps/web/src/app/api/v1/today/route.ts. */
export interface TodayResponse {
  date: string;
  checkIn: CheckIn | null;
  practices: TodayPractice[];
}
