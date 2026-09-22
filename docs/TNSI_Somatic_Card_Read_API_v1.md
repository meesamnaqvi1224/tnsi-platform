# TNSI Somatic Card Read API v1

## 1. Purpose

The first consumer of the Somatic Card synchronization layer
(docs/TNSI_Somatic_Card_Sync_v1.md). Exposes the synchronized `somatic_series`/
`somatic_cards` Postgres state to web/mobile clients as a small, typed
read-only JSON API. Canonical flow:

```
Sanity → Somatic Sync → Postgres → THIS READ API → Web / Mobile
```

This API reads Postgres only. It never queries Sanity — Sanity's
publication state was already resolved by the sync layer; this API's only
job is to consume the synchronized Postgres state correctly. No second CMS
read path exists.

No UI, navigation, card viewer, saves, completion, reflections, search,
analytics, recommendations, AI, or content import is part of this
milestone — API only.

## 2. Authentication / Access

**`requireMemberAccess()`** — the same gate `/api/v1/practices` already
uses (`apps/web/src/lib/auth-api.ts`), not the public-unauthenticated
model `/api/v1/articles` uses, and not the authenticated-only-no-
entitlement model `/api/v1/powerdrops` uses pending its own deferred
entitlement decision.

**Why this one, of the three existing patterns**: Somatic Cards are a
structured content library members work through over time — the same
shape as Practices (learn/practise content), not public marketing content
like Articles. This exact choice was already reasoned through and locked
in the prior, approved Schema Design milestone
(docs/TNSI_Somatic_Card_Schema_Design_v1.md §10/§14: "mirrors
`/api/v1/practices` and `/api/v1/powerdrops` list-route shape exactly,
including `requireMemberAccess()` as the first line") and the Architecture
Audit ("reusing `requireMemberAccess()` verbatim"). This milestone applies
that existing technical mechanism; it does not make or revisit the
commercial free/paid decision, and no entitlement was modified.

Every route's first step, before any query, is a `requireMemberAccess()`
call; a rejection short-circuits to `memberAccessErrorResponse()` (401 for
no session, 403 for an authenticated session without member access) —
never runs a database query first.

## 3. Endpoints

| Method | Path                                       | Purpose                                               |
| ------ | ------------------------------------------ | ----------------------------------------------------- |
| `GET`  | `/api/v1/somatic-cards/series`             | Series list (navigation)                              |
| `GET`  | `/api/v1/somatic-cards/series/:seriesSlug` | Series detail + its ordered published Cards (summary) |
| `GET`  | `/api/v1/somatic-cards/:cardSlug`          | Single Card detail (full structured content)          |

All three were implemented — each is independently justified by the
existing list/detail convention (Articles, PowerDrops, Practices each have
both a list and a `[slug]`/`[id]` detail route) and by the client's actual
minimum needs: Series navigation, Card listing within a Series, and Card
detail. No other endpoint was added.

## 4. Request Parameters

- **`GET /api/v1/somatic-cards/series`** — optional `limit` (default 20,
  max 50) and `offset` (default 0) query params, same inline
  parse-and-clamp convention as `/api/v1/practices` (not the Sanity-backed
  `total`/`hasMore` shape `/api/v1/articles`/`/api/v1/powerdrops` use —
  see §12 for why).
- **`GET /api/v1/somatic-cards/series/:seriesSlug`** — `seriesSlug` route
  param, validated via `somaticSeriesSlugParamSchema`
  (`apps/web/src/lib/validation.ts`), same shape as
  `articleSlugParamSchema`/`powerDropSlugParamSchema`.
- **`GET /api/v1/somatic-cards/:cardSlug`** — `cardSlug` route param,
  validated via `somaticCardSlugParamSchema`, same shape.

## 5. Response Models

Defined in `apps/web/src/lib/somatic-card-api.ts`, following the same
dedicated-mapping-file pattern as `article-api.ts`/`power-drop-api.ts` —
a stable, hand-written JSON contract, never a raw Drizzle row spread and
never `sanityData`.

**Series (list item / detail)**:

```
id, seriesNumber, title, slug, collection, description, coreQuestion,
visualTreatment, defaultLayout, sortOrder
```

Series detail adds `cards: CardSummary[]`.

**Card summary** (embedded in Series detail — identity + presentation
only, not full content):

```
id, cardNumber, title, slug, sortOrder, visualTreatment, cardArtwork
```

**Card detail** (`GET /api/v1/somatic-cards/:cardSlug`):

```
id, cardNumber, title, slug, sortOrder,
series: { id, seriesNumber, title, slug, collection },
invitation, purpose, description, orientation, gentleNote, anchor,
visualTreatment,
cardArtwork, heroImage, supportingImages[], demonstrationSequence[],
practiceSteps[], whatToNotice[]
```

Never exposed, on any response: `sanityId`, `sanityData`, `createdAt`,
`updatedAt`, or any other sync/DB-internal column. Verified by tests (see
§11).

### Why Series detail embeds a Card _summary_, not full content

Full structured content (practiceSteps/whatToNotice/supportingImages/
demonstrationSequence) is only in Card detail. Embedding full content for
every Card in a Series (avg. ~11 Cards/Series in the Core Series) would
make the Series-detail payload disproportionate to what a listing/
navigation screen actually needs; Card detail exists precisely to serve
the full-content case.

## 6. Publication Rules

The API reads Postgres's already-synchronized `status` column — it does
not (and cannot) inspect Sanity's own draft/publish state; that
distinction was already resolved by the sync layer
(docs/TNSI_Somatic_Card_Sync_v1.md §5).

- **Series list / Series detail lookup**: only `somatic_series.status =
'published'`. A `draft`/`archived` Series slug reads as 404 on detail
  lookup, and never appears in the list.
- **Cards within a Series detail response**: only `somatic_cards.status =
'published'` **and** belonging to that (already-published) Series. Since
  the Series row is filtered to `published` before its Cards are queried,
  every Card returned is guaranteed to belong to a valid, published Series
  by construction.
- **Card detail lookup**: a single query requires `somatic_cards.status =
'published'` **and** its resolved `somatic_series.status = 'published'`
  together, via one `INNER JOIN ... WHERE`. A Card whose Series is
  draft/archived (an "orphaned" Card relative to member visibility) reads
  as 404 — the same response as a genuinely nonexistent card, never
  distinguished, so nothing about the Series' state leaks through a Card
  lookup.
- No invalid database data is repaired by this API. If a Card's JSONB
  content fails final shape validation, the response is `500` (see §9) —
  never a partial or silently-corrected render.

## 7. Ordering

Explicit `sortOrder` only, ascending — never `createdAt`, `updatedAt`,
UUID, or insertion order, per the locked architecture. Applied via
`.orderBy(asc(somaticSeries.sortOrder))` / `.orderBy(asc(somaticCards.sortOrder))`
at the query level, not sorted client-side or in application code after
the fact.

`cardNumber` is returned as content metadata (a Card's own editorial
number, e.g. for display as "Card 3 of 11") but never substituted for
`sortOrder` as the ordering key.

The `order` field inside each `practiceSteps`/`whatToNotice`/
`supportingImages`/`demonstrationSequence` JSONB item is returned exactly
as synced (its own authored field), not re-sorted by array position —
matching how the sync layer itself treats these arrays as pass-through
content.

## 8. Asset Representation

Four distinct, never-flattened asset types, each preserving order and alt
text:

- **`cardArtwork`** — the finished 9:16 card artwork (`{url, alt}` or
  `null` if absent).
- **`heroImage`** — a genuinely separate field from artwork (`{url, alt}`
  or `null`).
- **`supportingImages`** — ordered array, each `{order, imageUrl,
imageAlt, caption?}`.
- **`demonstrationSequence`** — ordered array, each `{order, imageUrl,
imageAlt, label?, instruction?}`.

Every image's `alt` is a required, non-empty string wherever the
image/URL itself is present — enforced upstream by the sync layer's Zod
validation (`somaticCardContentSchema`'s `.superRefine`,
`packages/validation/src/somatic-cards.ts`) before the row is ever
written; this API surfaces whatever alt text was validated in, never
inventing or dropping it.

The API never requires a client to extract text from the artwork JPEG —
`invitation`/`purpose`/`description`/`orientation`/`gentleNote`/`anchor`/
`practiceSteps`/`whatToNotice` are the actual authored structured content,
returned as real fields alongside (not instead of) the visual assets.

## 9. Error Handling

| Status | Meaning                        | When                                                                                                          |
| ------ | ------------------------------ | ------------------------------------------------------------------------------------------------------------- |
| 400    | Invalid request parameters     | Malformed slug param (fails Zod validation)                                                                   |
| 401    | Unauthenticated                | No valid Clerk session/bearer token (`requireMemberAccess()` throws `UNAUTHENTICATED`)                        |
| 403    | Authenticated but not entitled | Session valid, member access denied (`EntitlementRequiredError`)                                              |
| 404    | Not found / not available      | Series/Card doesn't exist, is draft/archived, or (for a Card) belongs to an unpublished Series                |
| 500    | Unexpected server failure      | A Card's JSONB content fails final shape validation — a genuine data-integrity problem, never repaired inline |

No database details (query text, constraint names, connection info) are
ever included in a response body — matches `apps/web/src/lib/api-response.ts`'s
existing `ApiError` shape (`{code, message, details?}`) used by every
other `/api/v1/*` route.

## 10. Caching

No caching layer was introduced. Every existing `/api/v1/*` route in this
codebase (`articles`, `powerdrops`, `practices`) relies on the Next.js App
Router's default dynamic Route Handler behavior — no `revalidate` export,
no `no-store`/`force-dynamic` directive, no custom cache layer anywhere in
the existing convention. These new routes follow that same default: plain
`export const runtime = 'nodejs'`, a normal `async function GET`, nothing
else. Since Somatic Card content is CMS-authored and expected to change
over time, introducing a caching layer here would risk stale content
persisting indefinitely — exactly the failure mode the "follow existing
(no-cache) convention" choice avoids without any new mechanism to reason
about.

## 11. Testing

Required tests run against the isolated Neon test branch
(`ep-bold-sea-ay8wezwh...`), never production, using synthetic fixtures
only (no Caroline's real content, no PowerDrop content used as fixtures).

### Pure unit tests (no DB)

`apps/web/src/lib/somatic-card-api.test.ts` — 9 tests covering the
response-mapping functions directly: nullable-field pass-through, image
resolution (`null` when no URL, `alt: ''` default when URL present with
no alt), JSONB parse success/failure (`parseSomaticCardJsonbFields`
returns `null` rather than throwing/repairing on malformed content), and
that no mapped shape (Series list/detail, Card detail, embedded Series
ref) ever includes `sanityId`/`sanityData`/`createdAt`/`updatedAt`.
**Result: 9/9 passed.**

### DB-integration tests (isolated Neon branch)

`apps/web/src/app/api/v1/somatic-cards/somatic-cards.integration.test.ts`
— 24 tests, invoking the three routes' exported `GET` handlers directly
(no HTTP server) with `requireMemberAccess` mocked at the `@/lib/auth-api`
module boundary (Clerk itself has no existing test coverage anywhere in
this codebase to build on). Covers the full required matrix:

- **Series (1–5)**: published returned, draft excluded, archived
  excluded, `sortOrder` ordering (not insertion order), `collection`
  returned correctly.
- **Cards (6–18)**: published returned, draft excluded, archived
  excluded, Card-belongs-to-published-Series, Card-in-unpublished-Series
  excluded (whole detail lookup 404s), `sortOrder` ordering, `cardNumber`
  returned, structured content fields returned correctly, variable-length
  `practiceSteps`, ordered `whatToNotice`/`supportingImages`/
  `demonstrationSequence`, alt text preserved on both JSONB images and
  `cardArtwork`/`heroImage`.
- **Detail (19–22)**: valid Series lookup, missing Series → 404, valid
  Card lookup, missing Card → 404.
- **Security (23–24)**: unauthenticated → 401, authenticated-not-entitled
  → 403.
- **Integrity (25–28)**: no raw `sanityData`, no internal DB metadata
  (`sanityId`/`createdAt`/`updatedAt`), no Practice-domain fields
  (`focus`, `anchorStatement`, `cardImage`, `contentType`, `difficulty`)
  present on any response.

**Result: 24/24 passed.**

### Regression

- Full `apps/web` vitest suite (existing + new): **115/115 passed.**
- `pnpm turbo run type-check`: 12/12 packages pass.
- `pnpm turbo run lint`: 0 errors; only pre-existing warnings unrelated to
  this milestone.

### Test infrastructure fix

`apps/web/vitest.config.ts` had no `@/*` → `./src` alias (only
`tsconfig.json` declared it, which Next's own bundler honors but Vitest
does not). Since every Route Handler in this codebase imports via `@/lib/...`,
no `/api/v1/*` route — old or new — could be imported into a Vitest test
at all without this. Added the matching alias; this is test-infrastructure
only, changes no application behavior, and was necessary for any route-level
test in this repository to run.

## 12. Pagination

Not introduced beyond the `limit`/`offset` query params already present on
the Series list route for convention-consistency (see §4). The Core
Series is 9 Series and 102 Cards total — both comfortably under the
existing default/max limits (`limit` default 20/max 50 on Series list; the
embedded Cards array within a Series detail response is unpaginated,
matching how nested resources elsewhere in this codebase — e.g. a
Practice's completions/reflections — are never separately paginated
either). No pagination was added to Card detail (a single-resource
response) or to the embedded Cards array, since neither is a top-level
list endpoint.
