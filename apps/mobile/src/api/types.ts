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

/**
 * One entry from GET /api/v1/check-ins, per that route's `toCheckInSummary`
 * (apps/web/src/app/api/v1/check-ins/route.ts) - deliberately narrower than
 * `CheckIn` above (no `userId`, `metadata`, `createdAt`): this is read-only
 * history for display, not the full DB row.
 */
export interface CheckInSummary {
  id: string;
  completedDate: string;
  moodScore: number;
  capacityScore: number;
  notes: string | null;
  completedAt: string;
}

/** Response shape of GET /api/v1/check-ins, per that route. */
export interface CheckInsListResponse {
  checkIns: CheckInSummary[];
  pagination: { limit: number; offset: number; hasMore: boolean };
}

/** Mirrors packages/db/src/schema/practices.ts's `practices` row shape (fields this app uses). */
export type PracticeContentType =
  'audio' | 'video' | 'meditation' | 'breathwork' | 'movement' | 'journal';

/**
 * This member's *current* relationship with a practice - the most
 * recently touched session, not their full history (see
 * PracticeHistoryEntry for that). `id` identifies that specific session -
 * needed to submit a reflection against it (see PracticeReflectionInput's
 * `completionId`). Practice History (see packages/db/src/schema/
 * practice-completions.ts's own comment) means a practice can have many
 * completion rows for this member now; this is always the current one.
 */
export interface PracticeProgress {
  id: string;
  progressPct: number | null;
  positionSeconds: number | null;
  completed: boolean;
  completedAt: string | null;
  playCount: number;
  lastPlayedAt: string | null;
}

/** Mirrors packages/db/src/schema/enums.ts's `postPracticeResponseEnum` - a purely self-reported, never-interpreted answer to "how do you feel now?". */
export type PostPracticeResponse = 'DIFFERENT' | 'SAME' | 'NOT_SURE';

/** This member's own saved post-practice reflection for one specific practice session (`completionId`), if they ever saved one for it - not "this practice" in general (see practice_reflections's own schema comment on why). */
export interface PracticeReflectionState {
  completionId: string | null;
  response: PostPracticeResponse | null;
  reflection: string | null;
  updatedAt: string;
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
  /** Only ever populated by GET /api/v1/practices/[id] (the practice detail screen) - absent/undefined from the /today and list endpoints, which don't attach it. */
  reflection?: PracticeReflectionState | null;
  /** Whether the authenticated member currently has this practice saved. Populated by GET /api/v1/practices and GET /api/v1/practices/[id] - absent/undefined from /today, which doesn't attach it (Home doesn't show a save control). */
  saved?: boolean;
}

/**
 * One completed session in this member's Practice History - matches
 * apps/web/src/lib/practices.ts's `PracticeHistoryEntry` exactly. A
 * practice's own fields (title/category/etc.) are duplicated onto each
 * session rather than referenced by id, since GET /api/v1/practices/history
 * already returns them flattened - no second per-practice fetch needed to
 * render a history row.
 */
export interface PracticeHistoryEntry {
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
  completionId: string;
  completedAt: string;
  reflection: { response: PostPracticeResponse | null; reflection: string | null } | null;
}

/** Response shape of GET /api/v1/practices/history. */
export interface PracticeHistoryResponse {
  history: PracticeHistoryEntry[];
  pagination: { limit: number; offset: number; hasMore: boolean };
}

/**
 * My Journey: this member's own recorded activity, newest first - a
 * completed practice session or a daily check-in. Mirrors
 * apps/web/src/lib/journey-presentation.ts's `JourneyEntry` union exactly
 * (`occurredAt` as an ISO string here, same as every other timestamp in
 * this file). Presentation-only: nothing here is a score, a trend, or an
 * interpretation - just what the member actually recorded.
 */
export interface JourneyPracticeEntry {
  kind: 'practice';
  id: string;
  occurredAt: string;
  practiceId: string;
  title: string;
  contentType: PracticeContentType;
  category: string | null;
  durationSeconds: number | null;
  reflection: { response: PostPracticeResponse | null; reflection: string | null } | null;
}

export interface JourneyCheckInEntry {
  kind: 'check_in';
  id: string;
  occurredAt: string;
  moodScore: number;
  capacityScore: number;
  notes: string | null;
}

export type JourneyEntry = JourneyPracticeEntry | JourneyCheckInEntry;

/** Response shape of GET /api/v1/journey. */
export interface JourneyResponse {
  entries: JourneyEntry[];
  pagination: { limit: number; offset: number; hasMore: boolean };
}

/** Response shape of GET /api/v1/today, per apps/web/src/app/api/v1/today/route.ts. */
export interface TodayResponse {
  date: string;
  checkIn: CheckIn | null;
  practices: Practice[];
  /**
   * Deterministic content-routing pick from the user's latest capacity
   * check-in (see apps/web/src/lib/practices.ts's getRecommendedPractice) -
   * not "the first practice in the list" like the old client-side pick was.
   * `null` when the user has no check-in yet, or no published practice is
   * tagged with the recommended category yet (no fallback is silently
   * substituted).
   */
  todayPractice: Practice | null;
}

/** Response shape of GET /api/v1/practices, per apps/web/src/app/api/v1/practices/route.ts. */
export interface PracticesListResponse {
  practices: Practice[];
  pagination: { limit: number; offset: number };
}

/**
 * One entry from GET /api/v1/practices/saved, per
 * apps/web/src/lib/practices.ts's `getSavedPractices` - a plain practice
 * summary plus `savedAt`, never `progress`/`reflection` (this list isn't
 * about completion state, only "is it saved").
 */
export interface SavedPractice {
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
  savedAt: string;
}

/** Response shape of GET /api/v1/practices/saved. */
export interface SavedPracticesResponse {
  practices: SavedPractice[];
}

/** Response shape of POST/DELETE /api/v1/practices/[id]/save. */
export interface SavePracticeResult {
  practiceId: string;
  saved: boolean;
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
  id: string;
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

/** Mirrors packages/db/src/schema/enums.ts's `entitlement_tier`/`entitlement_status` enums. */
export type EntitlementTier = 'free' | 'monthly' | 'annual' | 'lifetime';
export type EntitlementStatus = 'active' | 'past_due' | 'canceled' | 'trialing' | 'expired';

/**
 * Response shape of GET /api/v1/me/entitlements, per
 * apps/web/src/app/api/v1/me/entitlements/route.ts - only the fields
 * meaningful to a member-facing account screen. The real response also
 * includes `stripeCustomerId`/`stripeSubscriptionId` (internal billing
 * ids) - deliberately not modeled here since nothing in this app should
 * ever display them.
 */
export interface Entitlements {
  tier: EntitlementTier;
  status: EntitlementStatus;
  programs: string[];
  certifications: string[];
  features: string[];
  currentPeriodEnd: string | null;
  /** Real field, already returned by the API - the account was canceled but access continues until `currentPeriodEnd`. */
  cancelAtPeriodEnd: boolean;
  /** Real field, already returned by the API - null unless the membership has actually been canceled. */
  canceledAt: string | null;
}

/** Mirrors apps/web/src/lib/assessment-api.ts's `ApiAssessmentChoice` - deliberately no score `value`, the server owns scoring. */
export interface AssessmentChoice {
  key: string;
  label: string;
}

/** Mirrors apps/web/src/lib/assessment-api.ts's `ApiAssessmentQuestion`. */
export interface AssessmentQuestion {
  key: string;
  text: string;
  choices: AssessmentChoice[];
}

/** Mirrors apps/web/src/lib/assessment-api.ts's `ApiAssessmentResultTier` - no `minScore`/`maxScore`, those never leave the server. */
export interface AssessmentResultTier {
  key: string;
  title: string;
  description: string | null;
}

/** Response shape of GET /api/v1/assessments/[slug], per apps/web/src/app/api/v1/assessments/[slug]/route.ts. */
export interface AssessmentDefinition {
  id: string;
  slug: string;
  title: string;
  questions: AssessmentQuestion[];
  resultTiers: AssessmentResultTier[];
}

/**
 * Response shape of POST /api/assessments/submit, per
 * apps/web/src/app/api/assessments/submit/route.ts. Deliberately NOT
 * wrapped in the `{data}`/`{error}` envelope every `/api/v1/*` route
 * uses - this is the pre-existing, unversioned submission endpoint the
 * web assessment already calls directly, returned exactly as-is here
 * rather than forced through a mismatched envelope.
 */
export interface AssessmentSubmitResult {
  key: string;
  title: string;
  description: string | null;
}

export interface AssessmentSubmitResponse {
  submitted: boolean;
  result: AssessmentSubmitResult | null;
}

/** Mirrors apps/web/src/lib/power-drop-api.ts's `ApiPowerDropImage`. */
export interface PowerDropImage {
  url: string;
  alt: string;
}

/**
 * PowerDrops™ are short, practical interventions for a specific moment -
 * conceptually distinct from `Practice` (a library to learn and practise
 * over time). Fields the library/card view needs, per
 * apps/web/src/app/api/v1/powerdrops/route.ts's response shape.
 */
export interface PowerDropSummary {
  id: string;
  title: string;
  slug: string;
  category: string | null;
  description: string;
  cardImage: PowerDropImage | null;
  focus: string;
  featured: boolean;
}

/** Response shape of GET /api/v1/powerdrops, per that route. */
export interface PowerDropsListResponse {
  powerDrops: PowerDropSummary[];
  pagination: { limit: number; offset: number; total: number; hasMore: boolean };
}

/**
 * Response shape of GET /api/v1/powerdrops/[slug] - adds the fields only
 * the detail screen needs (instructions, anchor statement, duration) on
 * top of `PowerDropSummary`.
 */
export interface PowerDrop extends PowerDropSummary {
  duration: string | null;
  instructions: string[];
  anchorStatement: string;
}

/** Response shape of POST /api/v1/powerdrops/[slug]/usage, per that route. */
export interface PowerDropUsageResult {
  id: string;
  powerDropId: string;
  powerDropSlug: string;
  usedAt: string;
}
