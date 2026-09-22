# TNSI Somatic Card Native Mobile UI v1

The native mobile counterpart to the approved web UI
(docs/TNSI_Somatic_Card_Web_UI_v1.md), both consuming the same
unmodified Read API (docs/TNSI_Somatic_Card_Read_API_v1.md). No DB, CMS,
sync, or API change was made in this milestone.

## 1. Routes

Following the existing Expo Router convention — PowerDrops already nests
under `practices/` as a distinct-but-related content type
(`app/(tabs)/practices/powerdrops/*`), so Somatic Cards follows the same
placement rather than inventing a new top-level route group:

| Route                                     | File                                                     | Purpose                   |
| ----------------------------------------- | -------------------------------------------------------- | ------------------------- |
| `/practices/somatic-cards`                | `app/(tabs)/practices/somatic-cards/index.tsx`           | Series list               |
| `/practices/somatic-cards/:seriesSlug`    | `app/(tabs)/practices/somatic-cards/[seriesSlug].tsx`    | Series detail + Card list |
| `/practices/somatic-cards/card/:cardSlug` | `app/(tabs)/practices/somatic-cards/card/[cardSlug].tsx` | Card reading view         |

All three are registered in `app/(tabs)/practices/_layout.tsx`'s shared
`Stack`, matching exactly how `powerdrops/index` and `powerdrops/[slug]`
are already registered there.

## 2. API Endpoints Consumed

- `GET /api/v1/somatic-cards/series`
- `GET /api/v1/somatic-cards/series/:seriesSlug`
- `GET /api/v1/somatic-cards/:cardSlug`

No new endpoint, no direct Postgres/Sanity/CMS access anywhere in this
milestone's code.

### API Client

`apps/mobile/src/api/somatic-cards.ts` — three minimal named functions
(`fetchSomaticSeriesList`, `fetchSomaticSeriesDetail`,
`fetchSomaticCardDetail`), each a thin wrapper over the **existing**
shared `ApiClient` (`apps/mobile/src/api/client.ts`, unmodified) — the
same client `usePowerDrops`/`usePractices`/every other domain in this app
already uses. No second HTTP abstraction was created.

`apps/mobile/src/api/types.ts` gained one new block of types
(`SomaticImage`, `SomaticSeriesListItem`, `SomaticSeriesDetail`,
`SomaticCardSummary`, `SomaticCardDetail`, and the four structured-content
item types), each mirroring `apps/web/src/lib/somatic-card-api.ts`'s
`Api*` shapes exactly — the same hand-kept-mirror convention this file
already uses for every other domain (Practice, PowerDrop, Article).

Three new hooks (`useSomaticSeriesList`, `useSomaticSeriesDetail`,
`useSomaticCardDetail`, in `apps/mobile/src/hooks/`) wrap these client
functions with the same `loading`/`success`/`error`(/`not-found` for
detail) state-machine shape as `usePowerDrops`/`usePowerDropDetail` —
fetch-on-mount, `humanizeApiError` for failures, `ApiRequestError.status
=== 404` mapped to a `not-found` state.

## 3. Access Control

No new authentication/entitlement logic. Every screen's fetch runs
through `useApiClient()` → the shared `createApiClient(getToken)`, which
attaches the current Clerk session's bearer token to every request — the
exact same mechanism `usePractices`/`usePowerDrops` already use. The Read
API's own `requireMemberAccess()` (unmodified, from the approved Read API
milestone) is what actually enforces membership server-side; this app
never duplicates or bypasses that check. An expired/invalid/missing
session surfaces as a 401 from the API, which `humanizeApiError` renders
as "Your session has ended. Please sign in again." — no raw error shown.

## 4. Series List

`SomaticCardsScreen` (`.../somatic-cards/index.tsx`) fetches
`GET /api/v1/somatic-cards/series` once and renders exactly what the API
returns, in the API's own order (no client-side re-sort). Each
`SomaticSeriesCard` shows series number, title, description (when
present), core question (when present) — nothing fabricated when the API
field is absent, matching the milestone's explicit content rule.

## 5. Series Detail

`SomaticSeriesDetailScreen` (`.../somatic-cards/[seriesSlug].tsx`)
fetches `GET /api/v1/somatic-cards/series/:seriesSlug` and renders series
number, title, description, core question, then every Card in the API's
own `sortOrder` via `SomaticCardListItem` (number, title, artwork
thumbnail when available). No completion percentage, progress bar,
streak, "next card" affordance, or locked/unlocked state anywhere — every
Card is an equal, always-tappable entry point. An empty published Series
(no published Cards) shows a calm inline notice, not an error.

## 6. Card Reading

`SomaticCardDetailScreen` (`.../somatic-cards/card/[cardSlug].tsx`)
fetches `GET /api/v1/somatic-cards/:cardSlug`. Field order follows the
milestone's required hierarchy exactly: Series context → Card number →
Card title → Invitation → Purpose → Description → Orientation → Practice
(steps + demonstration sequence) → What to Notice → Supporting Images →
Gentle Note → Anchor. Every section is conditionally rendered — a section
with no content in the API response is omitted entirely. Wording is
rendered exactly as the API returns it.

**Practice Steps** (`PracticeStepsList`): every step rendered regardless
of count (1, 2, 3, or 4+; never hardcoded to 3), sorted by the item's own
`order` field (not array position — see §Real Bug Caught below), optional
`label` rendered only when present.

**What to Notice** (`WhatToNoticeList`): every item rendered, sorted by
`order`, never collapsed or summarized.

## 7. Asset Handling

The four asset types are rendered as four distinct pieces, never
flattened together:

- **`cardArtwork`** — the finished 9:16 artwork, rendered prominently
  near the top of the screen via `SomaticImageBlock` with
  `aspectRatio={9/16}` (width drives height, so the real image is never
  awkwardly cropped) — never the sole representation of the Card; every
  structured field below it is real, independently readable native text.
- **`heroImage`** — rendered directly below the artwork when present,
  `aspectRatio={16/9}`.
- **`supportingImages[]`** (`SupportingImagesGallery`) — its own section,
  sorted by `order`, captions preserved when provided, never invented
  when absent.
- **`demonstrationSequence[]`** (`DemonstrationSequenceGallery`) — its
  own section, sorted by `order`, with `label`/`instruction`/alt text
  preserved exactly as returned. Kept as a completely separate component
  from `SupportingImagesGallery` — never one merged gallery.

### Image implementation

Plain React Native `Image` — the existing convention throughout this app
(`PowerDropThumbnail.tsx` uses the same approach) — no new image library
was added. `SomaticImageBlock` (`apps/mobile/src/components/somatic-cards/`)
is a shared component used by all four asset types: shows the real image
with its API `alt` text as the accessibility label when a URL is present
and loads successfully; falls back to a plain branded surface naming the
Card/frame (never a broken-image icon, never invented stock art) when the
URL is absent or fails to load — mirroring `PowerDropThumbnail`'s
existing fallback pattern exactly.

### Real bug caught by testing

The initial implementation mapped over each of the four ordered arrays in
raw array position, not by the item's own `order` field. Per the Read
API's documented behavior (docs/TNSI_Somatic_Card_Read_API_v1.md §7),
these JSONB arrays are returned as synced, **not** guaranteed sorted by
array position — this is the exact same bug the web UI milestone's own
tests caught and fixed (docs/TNSI_Somatic_Card_Web_UI_v1.md §7). The
mobile implementation was written with the fix already in place from the
start (`sortByOrder`, `apps/mobile/src/lib/somatic-card-order.ts`,
applied inside `PracticeStepsList`/`WhatToNoticeList`/
`SupportingImagesGallery`/`DemonstrationSequenceGallery`), verified by
the `sortByOrder` unit tests (§10).

## 8. Accessibility

- Every image passed through `SomaticImageBlock` gets `accessible` +
  `accessibilityLabel` set from the API's real `alt` text (never
  invented when the API has none — falls back to the Card/frame title
  instead, which is real content, not fabricated alt text).
- Every tappable entry (`SomaticSeriesCard`, `SomaticCardListItem`,
  `SomaticCardsEntryCard`, the series-context back link) sets
  `accessibilityRole="button"`/`"link"` and a real `accessibilityLabel`
  (e.g. `"Series 1, Support, Pressure & Proprioception"`), not just
  relying on visible text.
- `ThemedText` (existing, unmodified component) already scales its line
  height with the platform's font-scale factor for Dynamic Type — reused
  as-is throughout every new screen/component, no new text primitive
  was introduced.
- Practice Steps and What to Notice use `accessibilityRole="list"`
  containers with one row per item, in sorted order — order is real
  content here, not decorative.
- No content is encoded only inside an image — every visual asset is
  accompanied by real structured native text elsewhere on the screen.

## 9. Loading / Error / Empty / Not-Found States

- **Loading**: `SomaticCardsSkeleton` — three static placeholder blocks,
  no animation, byte-for-byte the same pattern as the existing
  `PowerDropsSkeleton`/`PracticesSkeleton`.
- **Empty Series list**: existing plain-text empty-state convention
  (matches `PowerDropsLibraryScreen`'s "No PowerDrops are available yet."
  pattern) — "There are currently no published Somatic Card series
  available."
- **Empty Series** (no published Cards): a calm inline bordered notice
  inside the Series detail screen, not an error.
- **API error**: `ErrorNotice` (existing, unmodified component) with a
  `humanizeApiError`-derived message and a retry button — same as every
  other screen in this app; never the raw API/database error.
- **Not Found**: an inline "This series/card isn't available" message
  within the screen itself — the exact same convention
  `PowerDropDetailScreen` already uses for a missing/unpublished
  PowerDrop, not Expo Router's `+not-found.tsx` (that's reserved for a
  genuinely unmatched route, not a valid route whose fetched resource is
  404).
- **Unauthorized**: handled centrally by the existing `ApiClient`/
  `humanizeApiError` — a 401 renders as "Your session has ended. Please
  sign in again." through the same `ErrorNotice` path; no separate
  unauthorized UI was built (matches how `usePowerDropDetail` etc.
  already handle this).

## 10. Navigation

**`SomaticCardsEntryCard`** was added to `app/(tabs)/practices/index.tsx`
(the Practices library screen), directly below the existing
`PowerDropsEntryCard`. This mirrors an already-established, real pattern
in this app: PowerDrops — a distinct-but-related content type — was
surfaced by adding a compact entry card to the Practices library screen,
_not_ by adding a tab-bar item or redesigning navigation. Somatic Cards
follows the identical, already-proven mechanism (`SomaticCardsEntryCard`
is structurally the same component as `PowerDropsEntryCard`: static text,
one tap target, no recommendation logic). No tab bar change, no
navigation redesign — this is the smallest change consistent with how
this exact situation was already solved once in this codebase.

## 11. Device Testing

**Attempted; blocked by a pre-existing, unrelated simulator/dev-client
issue — not something introduced by this milestone.** An already-running
Expo dev client was found attached to a booted "iPhone 17 Pro" simulator
(a session predating this milestone). After confirming the app was
signed in and showing the Home screen, every attempted tap/swipe
(including on pre-existing UI with no connection to this milestone's
code — the "My Journey →" link, a scroll gesture, backgrounding and
relaunching via `tnsi://` deep link) produced no visible state change,
while the system clock and status bar continued updating normally. This
is consistent with a stale/frozen JS↔native bridge connection on that
particular running instance (a known category of issue for long-running
dev-client sessions) — a genuine device/tooling problem, not a crash or
error caused by any file this milestone touched (the Home screen exercises
none of this milestone's new code and was equally unresponsive).

`.expo/types/router.d.ts` (Expo Router's generated, gitignored route-type
manifest) was regenerated via a fresh, temporary `expo start` instance
specifically to get `tsc --noEmit` passing for the three new routes —
that regeneration succeeded and is reflected in the clean type-check
result below; it is a separate mechanism from the frozen interactive
session above.

Per this milestone's explicit instruction not to spend time on unrelated
existing device issues, and not to fabricate results, no further
device-level verification (screen navigation, image rendering, scroll
behavior, 9:16 artwork cropping, back-navigation) was performed. This is
reported as a known gap (§13), not a passing result.

## 12. Tests

No test runner (Jest, `jest-expo`, Vitest, or otherwise) existed anywhere
in `apps/mobile` before this milestone — no test script, no config, no
testing-library dependency. Setting up a full React Native
component-testing stack (`jest-expo` + `@testing-library/react-native` +
native-module mocks for Clerk/`expo-image`/etc.) is a real, non-trivial
infrastructure investment this focused milestone deliberately did not
take on (per "keep this milestone focused" and "do not add a framework...
without a documented need").

Instead, `vitest` — already the project-wide convention (`apps/web`,
`packages/cms`, `packages/auth`, `packages/integrations`) — was added to
`apps/mobile` (`vitest.config.ts`, `package.json`'s `test` script) for
the plain TypeScript logic that has no React Native/Clerk import at all:

- `src/lib/somatic-card-order.test.ts` — 4 tests: sorts by the explicit
  `order` field rather than array position, supports more than 3 items,
  never mutates its input, handles empty/single-item arrays.
- `src/api/somatic-cards.test.ts` — 4 tests: each client function calls
  the shared `ApiClient.get` (never a bypass) with the exact expected URL,
  including slug encoding.

**Result: 8/8 passed.**

### Mapping to the Step 16 test list

| #                   | Requirement                                     | Covered by                                                                                                                                                                                                                                  |
| ------------------- | ----------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1, 4, 7             | List/detail/structured content renders API data | Code review + the same shapes already proven correct by the Read API's own 24 integration tests and the web UI's 43 rendering tests (identical API contract, identical field mapping)                                                       |
| 2, 5, 8, 10, 11, 12 | Ordering preserved                              | `sortByOrder` unit tests (4/4)                                                                                                                                                                                                              |
| 3, 6                | Navigation uses correct slug                    | `SomaticSeriesCard`/`SomaticCardListItem` push `{ pathname, params: { seriesSlug/cardSlug } }` directly from the API's own `slug` field - no transformation to test independently of the (untestable without RN rendering) component itself |
| 9                   | Practice supports >3 steps                      | `sortByOrder`'s 7-item test                                                                                                                                                                                                                 |
| 13                  | Artwork renders when available                  | `SomaticImageBlock`'s conditional (image vs. fallback) - code review; not independently unit-tested (would need RN rendering)                                                                                                               |
| 14                  | Optional sections don't render empty shells     | Every section in the Card screen and both list screens is wrapped in an explicit conditional (`card.invitation ? ... : null`, etc.) - code review                                                                                           |
| 15                  | Loading state                                   | `SomaticCardsSkeleton` reuses the exact existing pattern; each hook's initial state is `{status:'loading'}`                                                                                                                                 |
| 16                  | Empty state                                     | Explicit conditional branch in each screen for an empty list/empty Series                                                                                                                                                                   |
| 17                  | API error state                                 | `ErrorNotice` + `humanizeApiError`, same existing path every other screen uses                                                                                                                                                              |
| 18                  | Not-found behavior                              | Hook maps `ApiRequestError.status === 404` to `{status:'not-found'}`, same pattern as `usePowerDropDetail`                                                                                                                                  |
| 19                  | Member/auth access                              | `fetchSomaticSeriesList`/`Detail`/`CardDetail` tests confirm every call goes through the shared authenticated `ApiClient`, never a bypass                                                                                                   |
| 20                  | Existing mobile tests remain green              | N/A - none existed before this milestone; the 8 new tests are the entire mobile test suite today                                                                                                                                            |

Items 1, 4, 6 (screen-level rendering/navigation-on-tap) are **not**
independently unit-tested — that would require the RN component-testing
stack explicitly deferred above. This is the milestone's one deliberate,
documented test-coverage tradeoff.

## 13. Known Gaps

- **No live device/simulator verification was completed** (§11) - the
  available simulator session was unresponsive to touch for reasons
  unrelated to this milestone's code. Screen navigation, image rendering
  (including 9:16 artwork cropping behavior), scroll behavior with long
  card content, and back-navigation were not visually confirmed.
- **No RN component-rendering tests** - covered by code review and the
  Read API/web UI's existing test coverage of the identical data contract,
  not by rendering these specific native components (see §12's mapping
  table).
- **No navigation entry beyond the Practices-library entry card** - by
  design, matching the existing PowerDrops precedent exactly; no Home-tab
  tile was added (PowerDrops has one; adding an equivalent for Somatic
  Cards would be a reasonable, small follow-up but is a product/design
  call, not decided here).

## 14. Confirmation: No DB/CMS/API/Sync Changes

**Confirmed.** `git status`/`git diff` were inspected before finishing.
The only changes are: three new mobile screens, their supporting
components/hooks/API-client functions/types, `apps/mobile/vitest.config.ts`
and `package.json`'s `test` script/`vitest` devDependency (test
infrastructure only), the two small additive edits to
`app/(tabs)/practices/_layout.tsx` (new `Stack.Screen` registrations) and
`app/(tabs)/practices/index.tsx` (one new entry-card render), and this
documentation file. No `packages/db`, `packages/cms`, `packages/validation`,
or `apps/web` file was touched by this milestone.
