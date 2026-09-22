# TNSI Somatic Card Web UI v1

The first web consumer of the approved Somatic Card Read API
(docs/TNSI_Somatic_Card_Read_API_v1.md). No DB, CMS, or API schema
changes were made in this milestone — this is a presentation layer only,
over content already synchronized and exposed by prior, approved
milestones.

## 1. Routes Created

| Route                                     | Purpose                           |
| ----------------------------------------- | --------------------------------- |
| `/dashboard/somatic-cards`                | Series list                       |
| `/dashboard/somatic-cards/:seriesSlug`    | Series detail + ordered Card list |
| `/dashboard/somatic-cards/card/:cardSlug` | Individual Card reading view      |

This matches the milestone's suggested structure exactly, after
inspecting existing dashboard conventions (`/dashboard/practices`,
`/dashboard/practices/[id]`, `/dashboard/practices/history` — static and
dynamic segments already coexist as siblings elsewhere in this app).

## 2. API Endpoints Consumed

- `GET /api/v1/somatic-cards/series`
- `GET /api/v1/somatic-cards/series/:seriesSlug`
- `GET /api/v1/somatic-cards/:cardSlug`

All three, and only these three — no new endpoint was added or needed.

### How the UI calls them

`apps/web/src/lib/somatic-cards-client.ts` calls each Route Handler's
exported `GET` function **directly**, server-side, rather than issuing a
self-referential HTTP request. This was a deliberate choice after
inspecting the existing codebase: no page anywhere in `apps/web` fetches
its own `/api/v1/*` route over HTTP (every existing dashboard page —
`/dashboard/practices` included — queries Postgres directly via a `lib/*.ts`
helper instead, with the `/api/v1/*` routes documented as existing for a
future external/mobile client). This milestone's instructions were
explicit that the UI must consume the Read API rather than query Postgres
directly and must not create a second content-fetching implementation, so
neither existing pattern applied verbatim. Calling the Route Handler's
`GET` function directly is the standard way to reuse a Next.js Route
Handler from a Server Component without a wasted network round trip: it
is the exact same code path a real HTTP request to that route would run
(same `requireMemberAccess()` gate, same query, same publication
filtering, same response mapping) — Clerk's `auth()` reads the ambient
Next.js request context, not the synthetic `Request` object passed to the
handler, so authentication still resolves correctly. No page or component
in this milestone imports `@tnsi/db` or Sanity — `somatic-cards-client.ts`
is the only content-fetching path.

## 3. Access Control

`requireMemberAccessOrRedirect()` — the same gate `/dashboard/practices`
and `/dashboard/practices/[id]` already use — is the first call in every
one of the three pages, before any data fetch. A denied/unauthenticated
request redirects (to `/sign-in` or `/dashboard/billing`, per that
function's existing behavior) before `somatic-cards-client.ts` is ever
called. Verified by test (`somatic-cards-pages.test.tsx`): when the mock
throws (simulating a redirect), the fetch mock is never invoked.

The Read API's own `requireMemberAccess()` call inside each Route Handler
still runs too (harmless double-gating within the same session, not a
new decision) — access control is enforced at both the page and the API
layer, matching how the Read API was designed to be used standalone.

## 4. Series List Behavior

- Fetches `GET /api/v1/somatic-cards/series` via `fetchSomaticSeriesList()`.
- Renders exactly what the API returns, in the API's own order — no
  client-side re-sorting.
- Displays series number, title, description (when present), core
  question (when present). Card count is **not** shown: the list
  endpoint's response doesn't include one (only Series _detail_ embeds
  the `cards` array) — per the milestone's explicit "if the API does not
  provide a value, do not fabricate it" rule, nothing was invented to
  fill that gap.
- No therapeutic claims, invented descriptions, or new copy — every
  string rendered is a value the API returned, unmodified.

## 5. Series Detail Behavior

- Fetches `GET /api/v1/somatic-cards/series/:seriesSlug`.
- Displays series number, title, description, core question, then the
  Cards in the API's own `sortOrder`.
- Each Card entry shows its card number, title, and artwork thumbnail
  (when present) — no card count/progress/completion indicator, and no
  implication that Cards must be read in order (a plain grid of equal
  entry points, per the milestone's "progression is NOT mandatory" rule).
- An empty Series (no published Cards) shows a calm inline notice, not an
  error.

## 6. Card Reading Behavior

- Fetches `GET /api/v1/somatic-cards/:cardSlug`.
- Field order follows the milestone's required editorial hierarchy
  exactly: Series context → Card number → Card title → Invitation →
  Purpose → Description → Orientation → Practice (steps +
  demonstration sequence) → What to Notice → Supporting Images → Gentle
  Note → Anchor.
- Every section is conditionally rendered — a section with no content in
  the API response is omitted entirely, never shown as an empty
  heading/shell.
- Wording is rendered exactly as the API returns it — no rewriting,
  shortening, or clinical elaboration anywhere in this codebase's new
  code.
- `practiceSteps` renders every step regardless of count (never assumes
  exactly three), with an optional label rendered only when present.
- `whatToNotice` renders as an ordered list, in the API's authored order.

## 7. Asset Handling

The four asset types are rendered as four visually distinct sections,
never flattened into one gallery:

- **`cardArtwork`** — the finished 9:16 artwork, shown prominently near
  the top of the reading experience (immediately after the Card title),
  but never as a substitute for the structured text content that follows
  it.
- **`heroImage`** — rendered directly below the artwork when present.
- **`supportingImages[]`** — its own labeled section, rendered in the
  API's `order`, captions preserved when provided (no caption invented
  when absent).
- **`demonstrationSequence[]`** — its own labeled section, rendered in
  the API's `order`, with `label`/`instruction`/alt text preserved
  exactly as returned.

**A real ordering bug was found and fixed during testing**: the initial
implementation mapped over each of these four arrays in raw array
position, not by the item's own `order` field. Per the Read API's own
documented behavior (docs/TNSI_Somatic_Card_Read_API_v1.md §7), the API
returns these JSONB arrays as synced, **not** guaranteed sorted by array
position — the explicit `order` field is what defines display order
(the same "never infer order from array position" principle the schema
design itself is built on). All four renderers (`PracticeStepsList`,
`WhatToNoticeList`, `SupportingImagesGallery`,
`DemonstrationSequenceGallery`) now sort by `.order` before rendering.
This was caught by the "preserves order" tests, not discovered later.

## 8. Accessibility

- Semantic headings (`<h1>`/`<h2>`) for the page title and each content
  section.
- `practiceSteps` and `whatToNotice` are real `<ol>` elements — order is
  meaningful, not decorative.
- Supporting images and demonstration frames use `<figure>`/`<figcaption>`
  for their captions/labels — proper semantic association between an
  image and its caption text, not a floating paragraph.
- Every image's `alt` attribute is the exact value the API returned. No
  alt text is invented when the API has none (an image the API returned
  without alt text still renders — the alt validation and required-ness
  is a Read API/sync-layer responsibility, already enforced upstream —
  this UI never fabricates missing alt text itself).
- All interactive elements (Series cards, Card entries, back links) are
  real `<a>` elements via `next/link`, keyboard-reachable and focusable
  by default; no custom click handlers substitute for a real link.
- No content is encoded only inside an image — every visual asset is
  accompanied by real structured text elsewhere on the page (per the
  milestone's explicit accessibility requirement).
- Contrast/focus-visible styling is inherited from the existing
  `@tnsi/ui` design tokens and `interaction-focus`/`interaction-colors`
  utility classes already used throughout the dashboard — no new color or
  focus treatment was introduced.

## 9. Loading / Empty / Error / Not-Found States

- **Loading**: no client-visible loading state was added, and none
  exists anywhere in this codebase today (`apps/web` has zero
  `loading.tsx` files and zero uses of `@tnsi/ui`'s `Skeleton`/`Spinner`
  in any dashboard page — every existing dashboard page, including
  `/dashboard/practices`, is a fully server-rendered `async` Server
  Component with no client-side loading boundary). These new pages follow
  that same existing convention rather than introducing a new one.
- **Empty Series list**: `EmptyState` (from `@tnsi/ui`, the same
  component `/dashboard/practices` already uses for its own empty state)
  with the message "There are currently no published Somatic Card series
  available." — no invented content.
- **Empty Series** (a published Series with no published Cards): a calm
  inline notice inside `SeriesDetailView`, not an error.
- **Not Found** (missing/unpublished Series or Card): `notFound()` from
  `next/navigation` — the exact same mechanism `/dashboard/practices/[id]`
  already uses, rendering the app's existing root `not-found.tsx`.
- **API error**: an `EmptyState` with a generic "Something went wrong."
  message — never the raw error, status code, or any database/server
  detail. Verified by test that no stack-trace-like or backend-specific
  substring appears in the rendered output.

## 10. Navigation

**No navigation change was made.** `DashboardSidebar`'s `navItems` array
(`apps/web/src/components/dashboard/dashboard-sidebar.tsx`) is explicitly
documented in its own code comment as "the full Academy navigation
Caroline's reference screenshots establish" — a fixed list matching a
specific approved design reference, where only `Practices`/`My
Journey`/`Billing` are real, linked items and everything else is an
unlinked placeholder for a _specific, already-named_ future roadmap item
("My Learning", "Programs", "Workshops", "Resources", "Community", "Live
Events", "Certification").

"Somatic Cards" does not correspond to any of those pre-named placeholder
slots, and is not itself part of that locked reference list. Inserting a
brand-new label into a navigation array explicitly tied to Caroline's
approved reference design would be a product/IA decision beyond this
milestone's scope — exactly the kind of judgment call Step 10's own
escape hatch anticipates ("If navigation architecture makes this
inappropriate, keep the routes functional without forcing a broader
navigation refactor and document the decision"). The three routes are
fully functional and reachable by direct URL; they are simply not yet
wired into the sidebar. Adding a "Somatic Cards" entry to that reference
list is a natural, low-risk follow-up once product/design confirms where
it belongs — flagged here as a candidate for a future, explicitly-scoped
change, not decided unilaterally in this one.

## 11. Tests

All tests use synthetic fixtures only — no Caroline content, no
PowerDrop content used as fixtures.

### Component rendering tests (no jsdom/React Testing Library added)

No React component-testing library exists anywhere in `apps/web` today.
Rather than introduce one, these tests render the pure, hook-free view
components directly with `react-dom/server`'s `renderToStaticMarkup`
(already part of the existing `react-dom` dependency) under Vitest's
existing `node` test environment, and assert on the real rendered HTML.

- `series-list-view.test.tsx` — 4 tests (API data rendered, order
  preserved, correct slug in link, no empty shell for absent fields).
- `series-detail-view.test.tsx` — 6 tests (header data, card order,
  correct card slug in link, artwork rendered/omitted correctly, empty-
  series notice, no completion/progress indicator).
- `card-reading-view.test.tsx` — 16 tests (structured content rendered,
  series-context link, artwork + alt text, optional sections omitted
  when empty, exact wording preserved, `PracticeStepsList`/
  `WhatToNoticeList`/`SupportingImagesGallery`/`DemonstrationSequenceGallery`
  order preservation — including >3 practice steps — optional
  label/caption omission, and alt text preservation).

**Result: 26/26 passed.**

### Client-layer tests (no DB)

`somatic-cards-client.test.ts` — 7 tests mocking the three Route Handler
modules directly, verifying the `ok`/`not-found`/`error` status mapping
the pages depend on.

**Result: 7/7 passed.**

### Page-orchestration tests

`somatic-cards-pages.test.tsx` — 10 tests mocking `@/lib/auth-api`,
`@/lib/somatic-cards-client`, and `next/navigation`'s `notFound`,
covering: member access required before any fetch, no fetch when access
is denied, empty-state rendering, error-state rendering (with a check
that no stack-trace/backend-detail substring leaks through),
`notFound()` invoked for a missing Series/Card, and successful data
rendering.

**Result: 10/10 passed.**

### Full regression

- Full `apps/web` vitest suite (existing Read API/sync tests + all new UI
  tests): **158/158 passed.**
- `pnpm turbo run type-check`: 12/12 packages pass.
- `pnpm turbo run lint`: 0 errors; the same 4 pre-existing warnings as
  before this milestone (none in any new file).

### Test infrastructure change

`apps/web/vitest.config.ts` needed one addition: `esbuild: { jsx:
'automatic' }`. Vite's default esbuild transform compiled `.tsx` test
files using the classic JSX transform (`React.createElement`), which
threw `ReferenceError: React is not defined` for any `.tsx` file that
doesn't itself import a `React` namespace — every source file in this
codebase already relies on the automatic runtime (matching Next's own
SWC compilation), so this is a test-infrastructure correction to match
existing source conventions, not a new convention.

## 12. Known Gaps

- **No live-browser visual QA was performed.** These routes are gated by
  `requireMemberAccessOrRedirect()`, and no test Clerk session/credentials
  were available in this environment. Production currently has zero
  `somatic_series`/`somatic_cards` rows (confirmed in the prior Sync/Read
  API milestones), so a live visit today would only exercise the empty
  state regardless. Correctness was instead verified through 43 focused
  rendering/orchestration tests covering every structural requirement in
  this milestone's spec (field order, asset separation, ordering,
  alt text, conditional sections, access control, not-found/error/empty
  states).
- **No navigation entry was added** — see §10 for the explicit reasoning;
  flagged as a candidate follow-up, not a defect.
- **No SEO/canonical differentiation beyond the existing `noIndex: true`
  dashboard convention** — matches how every other `/dashboard/*` page in
  this codebase handles metadata (private member content, not indexed).

## 13. No Schema Changes

**Confirmed: this milestone made no changes to the database schema, CMS
schema, sync layer, or API contract.** `git status`/`git diff` were
inspected before finishing; the only changes are the new Somatic Card web
UI routes/components, their focused tests, the `@`/`esbuild.jsx`
Vitest-config additions needed to test Route Handlers and `.tsx` files at
all, and this documentation file.
