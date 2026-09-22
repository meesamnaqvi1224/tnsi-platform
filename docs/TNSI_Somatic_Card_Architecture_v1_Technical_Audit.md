# TNSI Somatic Card Architecture v1 — Technical Audit

**Type:** Read-only technical audit. No implementation, no schema changes, no commits.
**Source of the approved architecture:** `docs/TNSI_Somatic_Card_Content_Architecture_v1.docx` was requested as the source document but **does not exist anywhere in this repository** (checked `docs/`, the full repo tree, and common user directories — see §0). This audit is therefore evaluated against the architecture description embedded directly in the audit request itself, treated as the authoritative spec. If the actual `.docx` differs from that description, this audit should be re-run against it.

---

## 0. Source Document Note

`find` across `docs/`, the repository root, and `~/Desktop`, `~/Downloads`, `~/Documents` found no `.docx`, no equivalent `.md`, and no partial copy of this architecture document. `git log --all -i --grep="somatic|card|series"` (full history, all branches) found zero commits referencing this architecture. Per instructions, no file was created to work around this — the audit proceeds on the inline spec provided in the task prompt and flags this gap explicitly rather than inventing or assuming document contents.

---

## 1. Executive Summary

**READY WITH GAPS.**

The repository has no Somatic Card content, schema, or infrastructure today — this is a clean-slate feature from the database up. That is expected and is not itself a blocker. What matters is _how cleanly_ it can be added, and the evidence says: cleanly, with real, identifiable gaps, and one genuine conceptual risk that isn't a code problem.

The good news, backed by direct evidence: the Sanity → webhook → Postgres → API → web/mobile pipeline is a proven, repeatable pattern (Practice and PowerDrop both went through it), the member-auth gate (`requireMemberAccessOrRedirect`) is a single reusable checkpoint with zero Card-specific auth work needed, and the API/route/validation conventions are consistent enough to predict the exact shape new Card routes should take.

The real gaps: no 9:16 portrait UI treatment exists anywhere in web or mobile (everything today is landscape/square/`minHeight`-driven), no ordered-variable-length-array content pattern exists in any schema to imitate, no full-screen swipeable viewer exists on either platform, and Postgres's only publication-state pattern is a boolean (`isPublished`), not the draft/published/archived tri-state the architecture wants.

The one non-code risk worth surfacing prominently: **PowerDrops already exists in production and is explicitly sourced from "the approved PowerDrop card deck (Caroline Somatic healing cards PDF)"** — the same source material this new architecture targets, but modeled far more simply (flat fields, no Series hierarchy, no Invitation/Purpose/Gentle Note/Anchor structure). This is a product-communication risk, not a technical blocker, but it needs to be named before anyone starts building, so PowerDrops and Somatic Healing Cards don't get conflated by users, Caroline, or future engineers.

---

## 2. Architecture Alignment

| Area                | Status                        | Finding                                                                                                                                                                                                               | Evidence                                                                                                                                                 | Impact                                                                        |
| ------------------- | ----------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------- |
| Repository          | ✅ Understood                 | Monorepo structure matches the task's assumed layout exactly; `packages/core`, `ai`, `analytics` exist but are near-empty stubs                                                                                       | `packages/ai/src/index.ts`, `packages/analytics/src/index.ts` (single-line stub files)                                                                   | No conflict; nothing to avoid touching there                                  |
| Database            | ⚠️ Gap                        | No Series/Card/Collection table exists; no ordering column exists anywhere; publication state is a boolean, not tri-state                                                                                             | `packages/db/src/schema/practices.ts:44` (`isPublished` boolean); no `sortOrder` column in any table                                                     | New tables + new patterns needed (not reuse)                                  |
| Sanity              | ⚠️ Gap + Risk                 | No Series/Card schema exists; closest analog (`powerDrop`) is a simpler, already-shipped model of the _same source content_                                                                                           | `packages/cms/src/schema/documents/powerDrop.ts:12-13`                                                                                                   | Conceptual collision risk, not a technical blocker                            |
| CMS sync            | ⚠️ Gap                        | Webhook routing is by Sanity-side filter + hardcoded `z.literal('practice')`, not in-endpoint branching — a new type needs a **parallel** endpoint, not a new case in the existing one                                | `packages/cms/src/webhook/schema.ts:44-49`, `apps/web/src/app/api/webhooks/sanity/route.ts:41,46`                                                        | Zero risk to Practice sync either way; extra endpoint is the safe path        |
| Practice separation | ✅ Clean                      | `practiceSaves` has a hard FK to `practices.id`; a Card-saves table would need to be a structural twin, not a shared table — no accidental conflation possible                                                        | `packages/db/src/schema/practice-saves.ts:25-29`                                                                                                         | Confirms coexistence is safe by construction                                  |
| Web                 | ⚠️ Gap                        | Auth/nav/loader patterns fully reusable; no 9:16 image treatment, no static-image renderer (player only does audio/video), no full-screen viewer                                                                      | `apps/web/src/components/dashboard/practice-player.tsx` (video/audio only), `apps/web/src/components/utility/editorial-image.tsx:15-19` (no 9:16 preset) | New UI components needed; no architectural blocker                            |
| Mobile              | ⚠️ Gap                        | Full-screen/no-header route precedent exists (`breathing/session.tsx`); no swipe/pager library as a direct dependency; no 9:16 aspect-locked component                                                                | `apps/mobile/app/(tabs)/practices/_layout.tsx:61-64`; `apps/mobile/package.json` (no pager/carousel dep)                                                 | New dependency + new component needed                                         |
| Authentication      | ✅ Clean                      | Single reusable gate works identically for web and mobile (bearer token vs cookie resolved transparently)                                                                                                             | `apps/web/src/lib/auth-api.ts:38-53, 195-207`                                                                                                            | Zero new auth work for a technical integration                                |
| Entitlements        | ✅ Clean, decision deferred   | `requireMemberAccess`/`hasMemberAccess` is status-only, content-type-agnostic — "is Cards free or paid" is a pure config choice, not a code change                                                                    | `packages/auth/src/authorize/entitlements.ts:123,134-143`                                                                                                | No technical blocker; commercial decision stays open                          |
| Assets              | ⚠️ Gap                        | Practice stores images as plain `text` URL columns; Sanity `powerDrop.cardImage` already uses structured `image` type with hotspot — good precedent, but multi-image/ordered-sequence assets have no existing pattern | `packages/db/src/schema/practices.ts:33-36`; `packages/cms/src/schema/documents/powerDrop.ts` (image field)                                              | New Sanity object types needed for supportingImages[]/demonstrationSequence[] |
| Validation          | ⚠️ Gap                        | Zod convention is well-established but has zero precedent for ordered-array-of-structured-objects (Practice Steps, What to Notice)                                                                                    | `apps/web/src/lib/validation.ts` (all schemas are flat/scalar)                                                                                           | New schema shape, first of its kind in the repo                               |
| API                 | ✅ Clean pattern              | List/detail/nested-action convention is completely consistent; a Card API would slot in predictably                                                                                                                   | `apps/web/src/app/api/v1/practices/*` structure                                                                                                          | Low ambiguity for a future API design                                         |
| Accessibility       | ⚠️ Gap                        | No existing precedent for "structured text co-equal with card artwork" — Practice already separates `thumbnailUrl` from title/description, which is the right shape, but nothing enforces text-first rendering        | `apps/mobile/src/components/practices/PracticeThumbnail.tsx` (image-with-text-overlay pattern, not text-as-primary)                                      | Needs deliberate design attention, not a technical gap                        |
| Import readiness    | ⚠️ Gap, script pattern exists | `seed-sanity.mjs`'s `createOrReplace` + asset-upload pattern is a real, working reference for a future 50-card import script                                                                                          | `apps/web/scripts/seed-sanity.mjs` (full file read)                                                                                                      | Reusable pattern, but no Card schema to import into yet                       |
| Data integrity      | N/A (nothing built)           | No current risk since nothing exists; risks below are anticipatory only                                                                                                                                               | —                                                                                                                                                        | See §12                                                                       |

---

## 3. What Already Exists

### Safe to Reuse (as-is, no modification)

- `requireMemberAccess()` / `requireMemberAccessOrRedirect()` — `apps/web/src/lib/auth-api.ts:180-207`. Status-only, content-agnostic.
- `resolveClerkUserId()`'s bearer-token/cookie dual handling — same file, lines 38-53. Already works identically for mobile and web without any Card-specific code.
- `apps/mobile/src/api/client.ts` — generic `fetch` wrapper, takes any path/type, nothing Practice-specific in it.
- `ResponsiveImage` (`apps/web/src/components/utility/responsive-image.tsx`) — standard image rendering, used repo-wide.
- Dashboard sidebar nav registration (`apps/web/src/components/dashboard/dashboard-sidebar.tsx:51-62`) — adding a nav entry is a one-line array addition.
- Sanity schema registration mechanism (`packages/cms/src/schema/index.ts`) — additive, two-step, no existing file needs edits beyond adding an import + array entry.
- `apps/web/scripts/seed-sanity.mjs`'s `createOrReplace`/asset-upload pattern as a structural reference for a future import script.
- `@tnsi/ui` layout/typography primitives (`Container`, `Stack`, `Grid`, `Section`, `Heading`, `Text`, `Badge`, `EmptyState`).

### Reuse With Modification (pattern-copy, not code-share)

- The Sanity-fetch-with-static-fallback loader pattern (`apps/web/src/content/cms/loaders.ts:54-71`) — copy the shape, write new functions.
- The Drizzle-backed per-user-state loader pattern (`apps/web/src/lib/practices.ts`) — copy the shape if Cards need saved/viewed state.
- Fetch-on-mount mobile hook shape (`apps/mobile/src/hooks/usePracticeDetail.ts`) — copy the discriminated-union state pattern, not the hook itself.
- Full-screen/no-header/gesture-disabled route config (`apps/mobile/app/(tabs)/practices/breathing/session.tsx`) — direct structural template for a card-viewer screen.
- `packages/ui`'s `Card` primitive — needs a new image-slot/aspect-ratio variant; base component (border/shadow/radius) is fine as-is.

### Do Not Reuse

- `practices` table itself — Practice-specific columns (`contentType` enum, `difficulty` check constraint, completion/reflection FKs elsewhere) don't generalize to Cards.
- `practice_saves` table — hard FK to `practices.id`; a Card-saves table must be a separate, structurally similar table, never a shared one (see §9).
- `PracticeThumbnail`/`PracticeCard` components — built around Practice's `contentType` enum and completion-progress display; a Card component needs different data entirely.
- `VideoPlayer.tsx` — fixed 16:9, tracks Practice-specific completion callbacks; not applicable to static card imagery.
- `packages/core/src/practices/recommendation.ts` — the Practice recommendation engine. The task is explicit this must not be proposed for Cards, and nothing in the current architecture spec calls for it.

---

## 4. Database Gap Analysis

**Existing tables** (`packages/db/src/schema/*.ts`, confirmed via the schema barrel): `users`, `entitlements`, `check_ins`, `practices`, `practice_completions`, `practice_reflections`, `practice_saves`, `assessment_submissions`, `power_drop_usages`. No `series`, `card`, `somatic_card`, or `collection` table exists.

**Proposed Series requirements vs. existing patterns:**

| Conceptual field                                   | Existing precedent                                                                                                                    | Gap                                    |
| -------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------- |
| `id`                                               | `uuid().primaryKey().default(sql\`gen_random_uuid()\`)` — used everywhere                                                             | None                                   |
| `seriesNumber`                                     | No numeric-identity-distinct-from-sortOrder field exists anywhere                                                                     | New                                    |
| `title`, `description`                             | `text()` columns, standard                                                                                                            | None                                   |
| `slug`                                             | **Not present in Postgres anywhere** — `practices` uses `sanityId` only, no slug column at all                                        | New pattern for this table             |
| `collection`                                       | No hierarchy-parent column pattern exists in Postgres (closest is Sanity-side `module→program` reference, not yet synced to Postgres) | New                                    |
| `status` (draft/published/archived)                | Only `isPublished: boolean` exists (`practices.ts:44`) — one-way flag, never a 3-state enum                                           | New enum needed                        |
| `coreQuestion`, `visualTreatment`, `defaultLayout` | No analog                                                                                                                             | New                                    |
| `sortOrder`                                        | **No sortOrder/order column exists in any Postgres table today**                                                                      | New, and this is the first of its kind |

**Proposed Card requirements vs. existing patterns:**

| Conceptual field                                                                                  | Existing precedent                                                                                                                                                                                                          | Gap                                         |
| ------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------- |
| `cardNumber` (editorial identity, distinct from `sortOrder`)                                      | No dual-identity (business number vs. display order) pattern exists anywhere                                                                                                                                                | New                                         |
| `seriesId` FK                                                                                     | Standard `.references(() => x.id)` pattern used throughout (`practice_saves.ts:25-29` etc.)                                                                                                                                 | Pattern exists, table doesn't               |
| Structured content (Invitation, Purpose, Practice Steps[], What to Notice[], Gentle Note, Anchor) | `practices.sanityData: jsonb` stores the **entire raw Sanity document** alongside flattened columns — this is real, working precedent for storing rich/variable content without normalizing every field into its own column | Genuinely useful precedent — see note below |
| Practice Steps as ordered variable-length array                                                   | **No existing schema anywhere (DB, Sanity, or Zod) models an ordered array of structured objects**                                                                                                                          | New — first of its kind in the codebase     |

**Important precedent worth calling out:** `practices.sanityData jsonb NOT NULL` (`packages/db/src/schema/practices.ts:45`) already establishes that this codebase is comfortable storing a full raw Sanity payload as JSONB alongside a handful of flattened, queryable top-level columns. This is directly relevant to the "variable-length Practice Steps" requirement — the existing convention suggests such arrays don't need to become normalized child tables; they could live inside a JSONB column on `somatic_cards`, mirroring how `practices.sanityData` already works, while `cardNumber`, `seriesId`, `status`, `sortOrder` stay as real flattened/indexed columns. This is an architectural option the evidence supports, not a recommendation being made here.

**New indexes/constraints likely needed** (naming only — not proposing implementation): a uniqueness constraint on `cardNumber` scoped to `collection` (not global — the architecture doesn't state cross-collection uniqueness), a `sortOrder` index per `seriesId` (mirroring `idx_practice_saves_user_created`'s pattern of a composite index for ordered retrieval), and a `status` index (mirroring `idx_practices_published`).

**Potential conflicts:** None found that would break existing Practice functionality — every new table is additive. The only real conflict is conceptual, not structural: see §9 and §13 on PowerDrops.

---

## 5. Sanity CMS Gap Analysis

**Existing schemas** (`packages/cms/src/schema/documents/*.ts`, registered in `packages/cms/src/schema/index.ts:14-27`): `practice`, `powerDrop`, `article`, `program`, `author`, `category`, `module`, `lesson`, `assessment`. (Note: `apps/web/src/sanity/schema/index.ts` is a stale, unregistered duplicate missing several of these — confirmed dead code, not a second live schema registry, and out of scope to touch.)

**Closest existing precedent — `powerDrop`** (`packages/cms/src/schema/documents/powerDrop.ts:17-121`): `title`, `slug` (type `slug`, sourced from title), `category` (fixed list), `description`, `cardImage` (type `image`, `options: { hotspot: true }`, nested `alt`), `duration`, `focus`, `instructions` (array of plain strings — an ordered list, but _unstructured_, not objects), `anchorStatement`, `featured`, `sortOrder` (number, explicit "manual display order" field — **this is the one existing precedent for explicit ordering in Sanity**), `status` (published/draft radio).

**Closest hierarchy precedent — `program → module → lesson`** (`program.ts`, `module.ts`, `lesson.ts`): a real 3-level parent-reference chain with `order` fields and `orderAsc` Sanity orderings, each with the same published/draft radio. Explicitly marked in its own code comments as **not yet consumed by any app** — a designed-but-dormant pattern, useful as a structural template, not as proof the pattern works end-to-end in production.

**Proposed Series schema requirements:** `seriesNumber`, `title`, `slug`, `collection` (reference or string), `status`, `description`, `coreQuestion`, `visualTreatment`, `defaultLayout`, `sortOrder` — every field type needed (string, slug, reference, radio-select) already exists as a Sanity field type in this codebase; nothing exotic is required.

**Proposed Card schema requirements:** `cardNumber`, `title`, `slug`, `seriesId` (reference), `status`, `sortOrder`, plus the structured content object (Invitation, Purpose, Practice Steps[], What to Notice[], Gentle Note, Anchor). The **array-of-structured-objects** requirement (Practice Steps, What to Notice, Demonstration Sequence) has no existing Sanity precedent in this repo — `powerDrop.instructions` is the closest analog and it's an array of plain strings, not objects with `{label, instruction, sortOrder}` shape. This would be genuinely new Sanity schema work (Sanity supports it natively via `array of objects` — it's not a platform limitation, just unprecedented in this codebase).

**Asset requirements:** `cardArtwork`, `heroImage` map directly onto the existing `image` type + hotspot pattern already used by `powerDrop.cardImage`/`article.coverImage`/`program.heroImage`. `supportingImages[]` (ordered, with captions) and `demonstrationSequence[]` (ordered frames with label/instruction) have no existing precedent — would be new `array of object` schemas, but built from existing primitive field types.

**Publication requirements:** `draft/published/archived` — the existing Sanity convention is binary (`published`/`draft` radio, e.g. `practice.ts`, `powerDrop.ts`). No 3-state precedent exists in Sanity schemas either (the "archived" state is new everywhere, not just Postgres).

**Sync implications:** See §4 (webhook) — a new document type is Sanity-schema-safe to add (additive registration), but the _sync pipeline_ needs a parallel webhook/route, not a modification of the existing one, per the hardcoded `z.literal('practice')` routing finding.

---

## 6. Web Gap Analysis

**Already supports the architecture:**

- Middleware protection is automatic for anything under `/dashboard/*` — a `/dashboard/cards` route needs zero middleware changes (`apps/web/src/middleware.ts:12-59,79`).
- `requireMemberAccessOrRedirect()` is a one-line addition to any new page, identical to every existing Practice page.
- Sidebar nav registration is a one-line array addition (`dashboard-sidebar.tsx:51-62`).
- Both content-loader patterns (Sanity-with-fallback, and Drizzle-per-user-state) are well-established and directly copyable.
- `ResponsiveImage` handles standard image rendering already.

**Would need future work:**

- **No 9:16 preset exists anywhere.** `editorial-image.tsx`'s presets are `landscape (16/10)`, `portrait (4/5)`, `square`, `video (16/9)`, `ultrawide (21/9)` — nothing close to a tall phone-card ratio. A repo-wide grep for aspect-ratio classes found nothing beyond these five presets plus two ad-hoc `aspect-[3/4]`/`aspect-square` usages.
- **No static-image renderer in the practice player path.** `practice-player.tsx` only renders `<video>` or `<audio>` elements — there is no still-image display code to reuse; a Card viewer needs this built from scratch (small, well-precedented work, but genuinely new).
- **No full-screen/immersive viewer exists.** The only overlay primitives are `Modal` (small, centered, `max-w-lg`, not full-screen) and `Drawer` (side panel, used only for mobile nav). No lightbox, gallery, or swipeable full-bleed viewer exists in `packages/ui` or `apps/web`.

---

## 7. Mobile Gap Analysis

**Already supports the architecture:**

- File-based routing cleanly supports adding a new tab or nested stack area, following either `(tabs)/_layout.tsx`'s pattern (new top-level tab) or `practices/_layout.tsx`'s pattern (nested stack within an existing tab).
- A genuine full-screen, no-header, gesture-controlled route template already exists and works in production: `breathing/session.tsx` — `SafeAreaView` direct usage, custom header, `headerShown: false`, `gestureEnabled: false`, unified exit handling across iOS swipe / Android hardware back / on-screen close button.
- `src/api/client.ts` is fully generic — no Practice-specific code in the fetch layer itself.
- The tab-bar-hiding mechanism (`(tabs)/_layout.tsx:12,33,47-49`) is a working precedent for making a card-viewer route feel fully immersive within the existing tab structure.

**Would need future work:**

- **No 9:16 aspect-locked component exists.** The closest hero treatment (`WelcomeHeader.tsx`) is `minHeight`-driven, not `aspectRatio`-driven. The only explicit aspect-ratio styling anywhere in mobile is `QuickPracticeRow.tsx`'s `1.05` (near-square) and `VideoPlayer.tsx`'s `16/9` (landscape) — nothing portrait.
- **No swipe/pager library as a direct dependency.** `react-native-gesture-handler` exists only transitively (pulled in by Expo Router's stack navigator), not declared or used directly anywhere in app code. `react-native-reanimated`/`worklets` are present and could underlie a custom swipe implementation, but nothing built on them exists today.
- **`expo-image` is not the house standard** — used in exactly one file (`EditableAvatar.tsx`); plain RN `Image` (with manual `onError` fallback handling) is what's used everywhere else, including `PracticeThumbnail.tsx`.
- New hooks (`useSomaticCards`, `useSomaticCardDetail`) would be pattern-copies of `usePractices`/`usePracticeDetail`, not modifications — the existing ones are tightly coupled to Practice shapes and completion/reflection submission.

---

## 8. Content Pipeline Impact

The intended flow — **Sanity → webhook → database → web/mobile** — is a real, working, twice-proven pattern (Practice and PowerDrop both go through variants of it). For Somatic Cards specifically:

1. **Sanity**: new `somaticSeries`/`somaticCard` document types register additively in `packages/cms/src/schema/index.ts` — zero risk to `practice`/`powerDrop` schemas, confirmed by reading the registration file.
2. **Webhook**: the existing `/api/webhooks/sanity` endpoint is hardcoded to Practice's Zod schema (`z.literal('practice')`) and has no internal `_type` branching — routing today happens via a Sanity-side webhook filter (`_type == "practice"`), not in-code. This means Practice sync is **entirely unaffected** by adding Cards, because there is no shared branch to accidentally break — but it also means a new endpoint (e.g. `/api/webhooks/sanity-somatic`) with its own Zod schema and sync-plan function is the safe path, not extending the existing route. This mirrors the existing signature-verification/idempotent-upsert pattern (`packages/cms/src/webhook/verify.ts`, `sync-plan.ts`) exactly — just a parallel instance of it.
3. **Database**: new tables (`somatic_series`, `somatic_cards`), fully additive, no FK into or out of `practices`/`practice_saves`/`practice_completions` required.
4. **API**: new `/api/v1/somatic-series`, `/api/v1/somatic-cards`, `/api/v1/somatic-cards/[id]` routes following the exact list/detail/nested-action convention already established, reusing `requireMemberAccess()` verbatim.
5. **Web/mobile**: new pages/screens, new loader/hook functions (pattern-copied, not shared), new UI components for 9:16 presentation (genuinely new).

Nothing in this flow requires modifying Practice's version of any of these five layers.

---

## 9. Practice Separation Audit

**Can Somatic Cards remain a genuinely separate content system while reusing shared infrastructure? Yes — with one important caveat that isn't about Practice at all.**

Direct evidence for clean separation:

- `practice_saves` has a hard, typed FK to `practices.id` (`packages/db/src/schema/practice-saves.ts:25-29`) — it is structurally impossible for a Card save to accidentally land in this table; a `somatic_card_saves` table would need to be a genuine structural twin (same shape, different FK target), never a shared/polymorphic table.
- `practices.contentType` enum (`audio|video|meditation|breathwork|movement|journal`) has no "card" value and nothing suggests one should be added — Cards are correctly outside this enum's domain entirely.
- The webhook's hardcoded `z.literal('practice')` schema (§4/§8) means there is no shared routing logic to accidentally couple.
- `packages/core/src/practices/recommendation.ts` (the Practice recommendation engine) is a self-contained module with no generic "content" abstraction that Cards would need to plug into or could accidentally inherit behavior from.

**The one real coupling risk is not a code risk — it's PowerDrops.** `packages/cms/src/schema/documents/powerDrop.ts:11-13` states explicitly: _"Content is entered here by the product owner from the approved PowerDrop card deck (Caroline Somatic healing cards PDF) — this schema holds no seeded copy of its own."_ PowerDrops is already live, already drawing from Caroline's card material, and already has its own `cardImage`, `sortOrder`, `category`, and `instructions` fields — a materially simpler shape than the architecture's Invitation/Purpose/Practice Steps/What to Notice/Gentle Note/Anchor structure. There is no code coupling between PowerDrops and the proposed Somatic Card system (they'd be entirely separate Sanity types and Postgres tables), but there is a real product-conceptual overlap: two systems, same source content, different depth, potentially confusing to Caroline, editors, and members alike if not named and distinguished before implementation begins. This is flagged as an **architecture conflict** in §13, not resolved here.

---

## 10. Asset Strategy Audit

- **Finished card artwork**: maps directly onto the existing Sanity `image` type + hotspot pattern (`powerDrop.cardImage`, `article.coverImage`). No new asset infrastructure needed for this specific field.
- **Hero image**: same pattern, direct reuse of the existing `image` type convention.
- **Supporting images / movement sequence / sensory comparison**: no existing precedent for _ordered arrays_ of images with per-item captions/labels. Sanity supports `array of object` natively (confirmed by the `program→module→lesson` reference-array precedent, which is structurally the same shape), so this is new schema work, not a platform limitation.
- **Storage/CDN**: images resolve through `packages/cms/src/lib/image.ts`'s `urlForImage` (`@sanity/image-url`) — Sanity's own CDN, already the established path for every image-bearing document type in this codebase (`practice.mediaUrl`/`thumbnailUrl` are the one deliberate exception, using plain `url` type instead, per a documented "Mux decision deferred" rationale — not relevant to Cards, which are static images, not video/audio). No new vendor decision is implied or needed.

---

## 11. Accessibility Audit

**Structural requirement:** card artwork must not be the sole representation of content — structured text needs to exist independently for screen readers, responsive layouts, and future search/reuse.

**What already supports this:** the Practice model already separates `thumbnailUrl` (image) from `title`/`description` (text) at the database level — this is the right shape, and the proposed Card model (structured fields: Invitation, Purpose, Practice Steps, etc., stored separately from `cardArtwork`) follows the same principle, just with richer text structure.

**What's missing:** no existing component in web or mobile demonstrates "text-first, image-supplemental" rendering for a card-like UI — `PracticeThumbnail.tsx`'s pattern is image-with-text-overlay (a gradient + label on top of a photo), which is the opposite emphasis from what accessibility here requires (text as the primary, independently-navigable content; artwork as supplemental). This is a design/implementation gap to be deliberate about, not a technical blocker — nothing in the current stack (Next.js, Expo, Sanity) prevents structured-text-first rendering.

---

## 12. Data Integrity Risks

| Risk                                                | Severity | Note                                                                                                                                                                                                                                                                                                                                                                                                                    |
| --------------------------------------------------- | -------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Duplicate `cardNumber` within a series/collection   | MEDIUM   | No existing uniqueness-scoping precedent in Postgres to copy from directly (closest is `unique_practices_sanity_id`, a _global_ unique constraint, not a scoped one) — scoping design needs explicit attention when the schema is written                                                                                                                                                                               |
| Duplicate slugs                                     | LOW      | Sanity's `slug` type has built-in validation tooling; Postgres has no slug column anywhere today (Practice doesn't use slugs at all), so there's no existing global-uniqueness pattern to conflict with — a fresh decision, not a collision with existing data                                                                                                                                                          |
| Orphaned Cards (no Series)                          | MEDIUM   | No FK-required-at-write-time pattern currently enforced elsewhere beyond standard Postgres FK constraints — same tooling available, just needs to be used                                                                                                                                                                                                                                                               |
| Published Card referencing unpublished/draft Series | MEDIUM   | No existing cross-entity publication-consistency check exists anywhere in the current schema (Practice has no parent entity to be inconsistent with) — this would be new validation logic, not a reuse of anything                                                                                                                                                                                                      |
| Missing artwork on a published Card                 | LOW      | Practice already tolerates a null `thumbnailUrl` gracefully (confirmed fallback UI in `PracticeThumbnail.tsx`) — the precedent for graceful degradation exists, though Cards' explicit design intent ("artwork is a finished, essential asset") may want stricter enforcement than Practice does                                                                                                                        |
| Stale sync data (webhook delivery failure)          | LOW      | Existing webhook has retry/error-logging via standard Sanity webhook retry behavior + `console.error` logging (`route.ts`) — same infrastructure would apply to a parallel Card webhook, no new risk introduced                                                                                                                                                                                                         |
| Sync ambiguity between Series and Card documents    | MEDIUM   | The architecture wants Series and Card to "sync independently" (per the task's own framing) — the existing single-document-type-per-webhook-schema pattern (§4/§8) supports this naturally (two separate schemas/endpoints), but reference resolution (a Card's `seriesId` pointing to a Series that may not have synced yet) has no existing precedent to follow, since Practice has no parent-entity reference at all |

---

## 13. Architecture Conflicts

### Conflict 1: PowerDrops already models Caroline's card content, more simply

- **Evidence:** `packages/cms/src/schema/documents/powerDrop.ts:11-13`.
- **Why it matters:** Two live-or-planned systems (PowerDrops, shipped; Somatic Healing Cards, proposed) both claim to represent the same underlying card material, at different fidelity. Without explicit product framing, this risks confusing editors (which system do new cards go into?), members (why do two different "card" experiences exist?), and future engineers (is PowerDrop the "MVP" of this architecture, or a permanently separate thing?).
- **Possible future resolution (not decided here):** an explicit product decision on whether PowerDrops is superseded, kept as a distinct "quick-hit" experience alongside the fuller Card library, or eventually sources its `cardImage`/`instructions` from the new Card system via the architecture's optional `linkedPracticeId`-style relationship (applied to PowerDrops instead of Practice). This is a product decision, correctly out of this audit's scope to make.

### Conflict 2: Postgres publication state is boolean, architecture wants tri-state

- **Evidence:** `practices.isPublished: boolean` (`packages/db/src/schema/practices.ts:44`) is the only publication-state precedent in Postgres; no `draft/published/archived` enum exists anywhere in the database layer.
- **Why it matters:** A new tri-state enum is needed for Series/Card status — not reusable from Practice, and not a small variation of it either (boolean vs. enum is a structural difference, not a value-range difference).
- **Possible future resolution:** a new Postgres enum (mirroring `entitlementStatusEnum`'s existing multi-value-enum pattern structurally, not semantically) — a schema design decision, not made here.

### Conflict 3: No ordered-array-of-structured-objects precedent anywhere

- **Evidence:** confirmed absent in Postgres schemas, Sanity schemas, and Zod validation (`apps/web/src/lib/validation.ts` is entirely flat/scalar fields).
- **Why it matters:** Practice Steps, What to Notice, Demonstration Sequence are all variable-length arrays of structured (not plain-string) items — genuinely new modeling territory for this codebase, in all three layers (Sanity, Postgres/Drizzle, Zod).
- **Possible future resolution:** either normalize into child tables (new pattern) or follow `practices.sanityData jsonb`'s precedent of storing structured arrays inside a JSONB column with looser typing, validated at the API boundary via a new Zod array-of-objects schema. Both are viable given existing tooling; neither is decided here.

### Conflict 4: No 9:16/portrait UI treatment exists on either platform

- **Evidence:** confirmed absent via aspect-ratio grep across `apps/web/src` and `apps/mobile/src`/`app`.
- **Why it matters:** this is the single most-repeated visual requirement in the architecture (mobile-first, phone-first, 9:16, full-screen) and has zero existing code to build from on either platform.
- **Possible future resolution:** new shared aspect-ratio-locked components on both platforms — pure UI work, no data-model implications.

---

## 14. Open Product Decisions

Only decisions that genuinely cannot be resolved from the architecture as given:

- **Exact card navigation interaction** — the architecture explicitly says "the exact interaction model is NOT YET LOCKED." Confirmed no existing swipe/pager infrastructure to default to.
- **Card save behavior** — the architecture says `somatic_card_saves` is "NOT automatically approved for implementation." Whether Cards get a save feature at all, and on what timeline, is undecided.
- **Whether Cards are free or member-gated** — technically trivial either way (see §2, Entitlements row), but the actual choice is a commercial decision this audit correctly does not make.
- **PowerDrops' relationship to the new Card system** — see Conflict 1 above; this is the most consequential open question and isn't addressed anywhere in the inline architecture spec provided.
- **Exact CMS editorial workflow** for entering 102 planned cards (52 remaining) — batch import tooling vs. one-by-one Studio entry, and who owns that work, isn't specified in the architecture.

---

## 15. Recommended Implementation Order

(Sequence only — no step is being taken as part of this audit.)

1. **Product decision on PowerDrops relationship** (Conflict 1) — blocks nothing technically, but should be resolved before Sanity schema work begins, to avoid building a system whose relationship to an existing shipped feature is ambiguous.
2. **Sanity schema** (`somaticCollection`/`somaticSeries`/`somaticCard`) — additive, registers cleanly per §5.
3. **Database schema** (`somatic_series`, `somatic_cards`, optionally `somatic_card_saves` later) — additive, per §4.
4. **Parallel sync webhook** (`/api/webhooks/sanity-somatic` or equivalent) — isolated from Practice sync per §8.
5. **API routes** (`/api/v1/somatic-series`, `/api/v1/somatic-cards*`) — following the existing list/detail/nested-action convention, reusing `requireMemberAccess()` verbatim.
6. **Web UI** — new 9:16-capable components, new dashboard section, reusing nav/auth/loader patterns.
7. **Mobile UI** — new 9:16-capable components, new full-screen route (templated on `breathing/session.tsx`), reusing the generic API client.
8. **Import tooling** for the 50 existing finished cards, once the schema is stable — templated on `seed-sanity.mjs`'s `createOrReplace`/asset-upload pattern.
9. **QA** against the explicit exclusion list in §16.

---

## 16. Explicitly Out of Scope

Confirmed: nothing in this audit's findings requires, implies, or depends on any of the following, and none were touched or proposed:

AI clinical recommendations · clinical logic/diagnostic tags/trauma mapping · Practice recommendation-engine reuse (`packages/core/src/practices/recommendation.ts` confirmed self-contained and untouched) · Card→Practice conversion or auto-generation · Card completion records/streaks/percentages · Card reflections (Practice Reflection confirmed _not_ reused or proposed for reuse) · mandatory progression · clinical scoring · social features/sharing/comments · marketplace functionality · practitioner analytics.

---

## 17. Final Recommendation

**Technical Readiness:** READY WITH GAPS

**Blocking Issues:** None. Every gap identified (9:16 UI, tri-state publication status, ordered-array content modeling, full-screen viewer, swipe infrastructure) is additive new work with clear precedent to model it on — nothing requires modifying, breaking, or restructuring existing Practice functionality, authentication, entitlements, or the Sanity sync pipeline to proceed.

**Non-Blocking Issues (future work, not blockers):**

- 9:16 aspect-ratio components on both web and mobile (new, no precedent).
- Ordered-array-of-structured-objects schema pattern (new, first of its kind in this codebase, across all three layers).
- Tri-state publication enum for Postgres (new; boolean is the only existing precedent).
- Parallel Sanity webhook endpoint for Card sync (isolated from Practice, per the hardcoded-routing finding).
- Full-screen/swipeable viewer UI on both platforms (partial mobile precedent exists via `breathing/session.tsx`; web has none).
- Scoped `cardNumber` uniqueness and Series/Card publication-consistency validation (new logic, standard tooling).

**Recommended Next Milestone:** Resolve the PowerDrops relationship as a product decision (§13, Conflict 1; §14), then produce the Sanity + Database schema design for Series/Card as the first concrete implementation milestone — everything downstream (sync, API, web, mobile) depends on that shape being settled first, and it's the one step where getting the JSONB-vs-normalized-array decision (§4) right early avoids costly rework later.

---

## Appendix: Evidence Index

All findings above are backed by direct repository reads performed during this audit:

- `packages/db/src/schema/{practices,practice-saves,enums,practice-completions,practice-reflections}.ts`
- `packages/db/drizzle/*.sql` migration listing (0000–0008)
- `packages/cms/src/schema/documents/{practice,powerDrop,program,module,lesson}.ts`
- `packages/cms/src/schema/index.ts`
- `packages/cms/src/webhook/{schema,verify,sync-plan}.ts`
- `apps/web/src/app/api/webhooks/sanity/{route.ts,README.md}`
- `apps/web/src/lib/{auth-api,practices,validation}.ts`
- `apps/web/src/middleware.ts`
- `apps/web/src/components/dashboard/{dashboard-sidebar,practice-player}.tsx`
- `apps/web/src/components/utility/{responsive-image,editorial-image}.tsx`
- `apps/web/src/content/cms/loaders.ts`
- `apps/web/src/app/api/v1/practices/{route.ts,[id]/route.ts}`
- `apps/web/scripts/seed-sanity.mjs`
- `packages/auth/src/authorize/entitlements.ts`
- `apps/mobile/app/(tabs)/{_layout,practices/_layout,practices/breathing/session}.tsx`
- `apps/mobile/src/components/practices/{PracticeCard,PracticeThumbnail,VideoPlayer}.tsx`
- `apps/mobile/src/api/{client,types}.ts`
- `apps/mobile/src/hooks/{usePracticeDetail,usePractices}.ts`
- `apps/mobile/package.json`, `pnpm-lock.yaml` (dependency verification)
- Full-repository filename search for `somatic|card|series|collection`
- Full git history search (`git log --all -i --grep`) for the same terms
