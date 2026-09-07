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

/**
 * The practice fields safe to expose to the UI - deliberately excludes
 * `sanityId`/`sanityData` (internal Sanity-sync bookkeeping), which the
 * `/api/v1/practices*` routes return in the raw row but which must never
 * reach a screen. Used by Home's Today's Practice card, the Practices
 * library, and practice detail alike - one shape, one source of truth.
 */
export interface Practice {
  id: string;
  title: string;
  description: string | null;
  contentType: PracticeContentType;
  mediaUrl: string | null;
  thumbnailUrl: string | null;
  durationSeconds: number | null;
  category: string | null;
  tags: string[];
  difficulty: number;
  progress: PracticeProgress | null;
}

/** Response shape of GET /api/v1/today, per apps/web/src/app/api/v1/today/route.ts. */
export interface TodayResponse {
  date: string;
  checkIn: CheckIn | null;
  practices: Practice[];
}

/** Response shape of GET /api/v1/practices, per apps/web/src/app/api/v1/practices/route.ts. */
export interface PracticesListResponse {
  practices: Practice[];
  pagination: { limit: number; offset: number };
}

/** Request body for POST /api/v1/practices/[id]/complete, per apps/web/src/lib/validation.ts's `practiceCompletionSchema`. */
export interface PracticeCompletionInput {
  progressPct?: number;
  positionSeconds?: number;
  completed?: boolean;
  playCount?: number;
}

/**
 * Response shape of POST /api/v1/practices/[id]/complete - the fields the
 * UI actually reads. The real response also nests a `practice` summary,
 * unused here since the detail screen already has the full `Practice`.
 */
export interface PracticeCompletionResult {
  progressPct: number;
  positionSeconds: number;
  completed: boolean;
  completedAt: string | null;
  playCount: number;
}

/** Mirrors apps/web/src/lib/article-api.ts's `ApiImage`. */
export interface ArticleImage {
  url: string;
  alt: string;
}

/** Mirrors apps/web/src/lib/article-api.ts's `ApiCategory` - a real Sanity `category` document, never invented. */
export interface ArticleCategory {
  title: string;
  slug: string | null;
}

/** Mirrors apps/web/src/lib/article-api.ts's `ApiAuthorSummary`. */
export interface ArticleAuthorSummary {
  name: string;
  role: string | null;
}

/**
 * The article fields the Resources library needs, per
 * apps/web/src/app/api/v1/articles/route.ts's response shape. Deliberately
 * only what GET /api/v1/articles actually returns - no `body`/`related`
 * (detail-only, added in Phase 4.3), no invented fields (tags, views,
 * likes, popularity never exist on the Sanity `article` schema).
 */
export interface ArticleListItem {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  coverImage: ArticleImage | null;
  category: ArticleCategory | null;
  author: ArticleAuthorSummary | null;
  publishedAt: string | null;
  readingTime: string | null;
  featured: boolean;
}

/** Response shape of GET /api/v1/articles, per apps/web/src/app/api/v1/articles/route.ts. */
export interface ArticlesListResponse {
  articles: ArticleListItem[];
  pagination: { limit: number; offset: number; total: number; hasMore: boolean };
}

/** Mirrors apps/web/src/lib/article-api.ts's `ApiAuthorDetail` - the detail-only author shape, with a photo. */
export interface ArticleAuthorDetail extends ArticleAuthorSummary {
  photo: ArticleImage | null;
}

/**
 * Mirrors apps/web/src/lib/article-api.ts's `ApiArticleBodyBlock` exactly -
 * every block type `GET /api/v1/articles/[slug]` can currently return.
 * Inline marks (bold/italic/links) are flattened to plain text by the API
 * itself (see that file's own doc comment) - there is no richer inline
 * shape to render here, so none is invented.
 */
export type ArticleBodyBlock =
  | { type: 'paragraph'; text: string }
  | { type: 'heading'; level: 2 | 3; text: string; id: string }
  | { type: 'pullQuote'; quote: string }
  | { type: 'orderedList'; items: string[] }
  | { type: 'unorderedList'; items: string[] }
  | { type: 'figure'; imageSrc: string | null; imageAlt: string; caption: string }
  | { type: 'callout'; title: string | null; text: string };

/**
 * Mirrors apps/web/src/lib/article-api.ts's `ApiRelatedArticle` - a
 * compact summary, deliberately without `author`/`featured` (the detail
 * API never nests a related article's own body/related, preventing
 * recursive expansion).
 */
export interface ArticleRelated {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  coverImage: ArticleImage | null;
  category: ArticleCategory | null;
  publishedAt: string | null;
  readingTime: string | null;
}

/** Response shape of GET /api/v1/articles/[slug], per apps/web/src/app/api/v1/articles/[slug]/route.ts. */
export interface ArticleDetail {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  coverImage: ArticleImage | null;
  category: ArticleCategory | null;
  author: ArticleAuthorDetail | null;
  publishedAt: string | null;
  readingTime: string | null;
  featured: boolean;
  body: ArticleBodyBlock[];
  related: ArticleRelated[];
}
