# TNSI PowerDrops vs Somatic Cards

## Relationship Audit

**Type:** Read-only discovery audit. No implementation, no schema changes, no content changes, no commits.

---

## 1. Executive Summary

PowerDrops and Somatic Healing Cards are **not currently the same content** — but that's only because **neither contains any of Caroline's real card content yet**. This is the single fact that resolves most of the ambiguity: PowerDrops is a fully-built, fully-shipped technical pipeline (Sanity schema, authenticated API, native mobile UI, usage tracking) that has been sitting empty since it launched, and a live query against production Sanity confirms it holds exactly **3 documents today, all three explicitly labeled `[Placeholder]`** and created as temporary test data during this session's earlier work — not Caroline's authored material.

What _is_ established, from the schema and commit history alone (not from any actual content): PowerDrops was explicitly designed to hold content "entered... from the approved PowerDrop card deck (Caroline Somatic healing cards PDF)" — the same source material named in the Somatic Card Architecture v1. Its field set (title, category, description, card image, duration, focus/"Purpose", instructions/"How To" steps, anchor statement) maps closely — field-by-field — onto several of the Somatic Card architecture's structured fields (Purpose, Practice Steps, Anchor, cardArtwork), while omitting others entirely (Invitation, What to Notice, Gentle Note, Series hierarchy, supporting images, movement sequences).

So the honest classification is: **evidence supports "Related but distinct, with meaningful field-level overlap in intent" today** — not because any card has been compared and found to match or differ, but because _no card content exists yet to compare_. Whether PowerDrops and Somatic Cards will contain the _same_ authored cards once Caroline's material is actually entered is a **product decision**, not something this repository can currently prove either way. This audit documents the technical facts precisely so that decision can be made with full information.

---

## 2. Existing PowerDrop Architecture

**Database:** `power_drop_usages` (`packages/db/src/schema/power-drop-usages.ts`) is the **only** PowerDrop-related Postgres table, and it stores nothing but usage _events_ — `userId`, `powerDropId` (Sanity's raw `_id`, stored as plain text, not a foreign key), `powerDropSlug` (for debugging only), `usedAt`, `metadata` (jsonb, unused/empty by default). There is **no `power_drops` content table** in Postgres at all. The table's own comment states directly: _"PowerDrop content itself lives in Sanity, not Postgres."_

**Content source:** Sanity only, fetched live at request time. `apps/web/src/app/api/v1/powerdrops/route.ts:54` calls `sanityFetch(POWER_DROPS_LIST_API_QUERY, ...)` directly on every request — there is no Postgres-synced copy, and therefore **the Sanity→webhook→Postgres pipeline used by Practice does not apply to PowerDrops at all.** This is a structurally different technical pathway from Practice, not a variant of the same one.

**Sanity schema** (`packages/cms/src/schema/documents/powerDrop.ts`, full file read): `title`, `slug`, `category` (9-value controlled list: Regulation, Transition, Softening, Authenticity, Mental Unload, Grounding, Interoception, Self-Worth, Release), `description`, `cardImage` (Sanity `image` type with hotspot, explicit comment: _"Shown as-is in the app — this is a real content asset, not something the app recreates as native text"_), `duration` (free text), `focus` (comment: _"The card's own 'Purpose' label"_), `instructions` (array of plain strings, comment: _"The card's 'HOW TO' steps, in order"_), `anchorStatement` (comment: _"The quoted anchor line on the card"_), `featured` (boolean), `sortOrder` (number), `status` (published/draft radio).

**API:** three routes, all requiring authentication (`getAuthUser()`) but **no specific membership entitlement** — the list route's own header comment states this is deliberate: _"no PowerDrops programme/certification/feature identifier is established anywhere in the product yet — inventing one here would be a guess this phase is explicitly not allowed to make."_

- `GET /api/v1/powerdrops` — list, paginated, filterable by category/featured.
- `GET /api/v1/powerdrops/[slug]` — detail.
- `POST /api/v1/powerdrops/[slug]/usage` — records a usage event only. No completion, no reflection, no save. The route's own comment: _"No streaks, points, or 'percentage complete' — the same PowerDrop can be used again later, and each use is its own row."_

**Mobile UI:** fully built. List screen (`apps/mobile/app/(tabs)/practices/powerdrops/index.tsx`) — featured card + category filter chips + grid. Detail screen (`.../powerdrops/[slug].tsx`) — hero image, title, meta row, description, numbered "How to" steps, anchor statement styled as a quote, and a two-state "USE THIS DROP" → "DONE" button that just records the usage event. Explicit comment: _"The app never claims to have guided the practice — it only displayed the card."_ Reachable from three places on mobile Home/Practices (`ExploreTiles.tsx`, `QuickPracticeRow.tsx`'s Regulate/Ground/Reconnect tiles, `PowerDropsEntryCard.tsx`).

**Web UI:** **not built.** The only trace on web is a disabled "PowerDrops — Daily regulation tools — coming soon." callout in the dashboard sidebar (`apps/web/src/components/dashboard/dashboard-sidebar.tsx:98-113`), non-interactive, not a link. The web app does not call `/api/v1/powerdrops*` anywhere.

---

## 3. Evidence of Card Deck Relationship

Every reference to the card deck / source material in the entire repository:

| Reference                     | File                                                   | Exact text                                                                                                                                                                 | Status                                                        |
| ----------------------------- | ------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------- |
| Card deck sourcing note       | `packages/cms/src/schema/documents/powerDrop.ts:11-13` | _"Content is entered here by the product owner from the approved PowerDrop card deck (Caroline Somatic healing cards PDF) — this schema holds no seeded copy of its own."_ | Current production code comment (live, committed schema file) |
| Feature-launch commit message | `cd011be` (`git show cd011be`)                         | _"No content seeded (no Sanity write token available); schema is ready for manual entry through Sanity Studio."_                                                           | Historical commit message, confirms zero content at launch    |

No other reference to "card deck," "Caroline Somatic healing cards," or equivalent phrasing exists anywhere else in source code, tests, or documentation (the only other hits are the prior audit document itself, which quotes this same comment, and Next.js build-cache sourcemaps that are just compiled copies of item 1).

**This is unambiguous: the only place PowerDrops is connected to Caroline's card deck is a stated intent for a future manual-entry workflow, not a record of that workflow having happened.**

---

## 4. Existing Content Overlap

A live, read-only query against the production Sanity dataset (`project hookrbdv`, dataset `production`) was run as part of this audit to answer this section factually rather than leaving it unverified:

```
count(*[_type=="powerDrop"]) → 3
```

All three documents:

| `_id`                                 | title                                   | category      | status    |
| ------------------------------------- | --------------------------------------- | ------------- | --------- |
| `powerDrop.placeholder-grounding`     | `[Placeholder] Grounding PowerDrop`     | Grounding     | published |
| `powerDrop.placeholder-mental-unload` | `[Placeholder] Mental Unload PowerDrop` | Mental Unload | published |
| `powerDrop.placeholder-regulation`    | `[Placeholder] Regulation PowerDrop`    | Regulation    | published |

**These three documents were created during this same engineering session as explicit, labeled placeholder content** (to give the previously-empty PowerDrops screen something to render during testing), not Caroline's authored material. Their `anchorStatement` fields literally read `"[Placeholder anchor statement]"`.

**Conclusion: no repository or live-content evidence of any actual overlap exists, because no real card content exists in either system yet.** This is not "no evidence found because we didn't look" — it is "confirmed zero real content in the one place PowerDrop content could exist." The planned 50 finished Somatic Card artifacts are likewise absent from this repository entirely (§13 of the prior technical audit already established this for the Somatic Card side; this audit confirms the same is true for PowerDrops).

---

## 5. Content Model Comparison

Classification per field, using the audit's required categories (A. Same content / B. Derived content / C. Related but distinct / D. Unknown) — applied to **field intent**, since no actual card instance exists in either system to compare content-by-content:

| Capability        | PowerDrops                                                                      | Somatic Cards v1 (architecture)                                                                      | Same Concept?                                                               | Conflict?                                                  |
| ----------------- | ------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------- | ---------------------------------------------------------- |
| Identity          | Sanity `_id` + `slug`                                                           | `id` + `cardNumber` (editorial identity) + `slug`                                                    | C — related, PowerDrop has no separate editorial-number field               | No                                                         |
| Title             | `title` (string)                                                                | `title`                                                                                              | A — identical concept                                                       | No                                                         |
| Series            | None — flat `category` (9-value list) only                                      | First-class `Series` entity with `seriesNumber`, `coreQuestion` etc.                                 | C — PowerDrop's `category` is a flat tag, not a hierarchy                   | Potential naming/taxonomy conflict (see below)             |
| Card number       | None                                                                            | `cardNumber` (explicit editorial identity, distinct from `sortOrder`)                                | D — no PowerDrop equivalent exists                                          | No (absence, not conflict)                                 |
| Invitation        | None                                                                            | First-class field                                                                                    | D — not present in PowerDrop at all                                         | No                                                         |
| Purpose           | `focus` (comment: _"the card's own 'Purpose' label"_)                           | `Purpose` (first-class field)                                                                        | B — same concept, different field name                                      | No — same intent                                           |
| Practice steps    | `instructions` (array of plain strings, comment: _"the card's 'HOW TO' steps"_) | Practice Steps (ordered, variable-length, _structured_ objects)                                      | B — same concept, PowerDrop's version is unstructured strings not objects   | Minor — structural, not semantic                           |
| What to notice    | None                                                                            | First-class field                                                                                    | D — not present in PowerDrop                                                | No                                                         |
| Gentle Note       | None                                                                            | First-class field                                                                                    | D — not present in PowerDrop                                                | No                                                         |
| Anchor            | `anchorStatement` (comment: _"the quoted anchor line on the card"_)             | `Anchor` (first-class field, explicitly "not a marketing tagline")                                   | A — same concept, near-identical field name and description                 | No                                                         |
| Artwork           | `cardImage` (comment: _"shown as-is... a real content asset"_)                  | `cardArtwork`                                                                                        | A — same concept: the finished card image, shown as-is                      | No                                                         |
| Hero image        | Same field as artwork (`cardImage` doubles as both)                             | Separate `heroImage`, independent from `cardArtwork`                                                 | C — PowerDrop conflates what the architecture treats as two distinct assets | Potential conflict if both systems eventually share images |
| Supporting images | None                                                                            | `supportingImages[]` (ordered, captioned)                                                            | D — not present in PowerDrop                                                | No                                                         |
| Movement sequence | None                                                                            | `demonstrationSequence[]`                                                                            | D — not present in PowerDrop                                                | No                                                         |
| Publication       | `status` (published/draft, 2-state)                                             | `status` (draft/published/archived, 3-state)                                                         | C — same mechanism, different value range                                   | No conflict, but not identical                             |
| Ordering          | `sortOrder` (number, explicit)                                                  | `sortOrder` (Series-level and Card-level)                                                            | A — same mechanism                                                          | No                                                         |
| Completion        | None                                                                            | Explicitly excluded from v1 ("no completion system")                                                 | A — both correctly absent                                                   | No                                                         |
| Reflection        | None                                                                            | Explicitly excluded from v1                                                                          | A — both correctly absent                                                   | No                                                         |
| Saves             | None                                                                            | Optional future `somatic_card_saves`, not yet approved                                               | A — both correctly absent today                                             | No                                                         |
| Membership gating | Authenticated-only, no specific entitlement (deliberately deferred)             | Not yet decided (explicitly a product decision)                                                      | D — both genuinely undecided                                                | No                                                         |
| Media             | Single `cardImage`, no video/audio                                              | `cardArtwork` + `heroImage` + `supportingImages[]` + `demonstrationSequence[]` — richer, multi-asset | C — PowerDrop is a simpler subset                                           | No conflict, but scope mismatch                            |

---

## 6. User Experience Comparison

**Web:** PowerDrops has no functioning web experience — a disabled "coming soon" sidebar entry is the entirety of its web footprint. There is nothing to compare against a future Somatic Cards web experience because nothing exists yet on web for either.

**Mobile:** PowerDrops behaves as **a small content library with a single-action "use" flow** — closer to "a static resource with a light usage log" than a practice player, a daily-recommendation feed, or a card-deck-browsing experience. Specifically:

- Entry: three separate entry points (Explore tile, three category-prefiltered Quick Practice tiles, and a static entry card shown atop the Practices library) — all converge on the same list screen.
- List: featured item + optional category filter chips + a plain grid, no swipe/deck interaction.
- Detail: a single scrollable page (title, image, meta, steps, anchor quote, one button) — not a full-screen/immersive/9:16 presentation. No swipe-to-next-card.
- Action: exactly one — a two-state button that logs "I used this," nothing else.

This does **not** yet resemble the Somatic Card architecture's intended "mobile-first, 9:16, full-screen or near-full-screen, minimal chrome, eventual swipe/next-card" presentation (§18 of the prior technical audit already confirmed no 9:16 or full-screen viewer exists anywhere in the codebase) — PowerDrops today is a conventional scrolling list-and-detail screen, the same structural pattern used by Practice and Resources.

---

## 7. Content Source of Truth

**CONTENT SOURCE OF TRUTH — UNRESOLVED.**

Neither system currently holds any real authored card content. The schema comment names Sanity Studio (manually populated by "the product owner" from the PDF) as the _intended_ entry point for PowerDrop content specifically. Nothing in the repository states or implies where the Somatic Card system's content entry would happen, nor whether it would be the same Sanity project/dataset, a different one, or a different process entirely. Until Caroline's actual 50 cards are entered somewhere, there is no way to verify from repository evidence which system (if either) becomes canonical.

---

## 8. Existing Reusable Infrastructure

- **Not reusable as PowerDrops' content storage, because it doesn't have one**: PowerDrops has no Postgres content table to point to or extend — there is nothing to "migrate" a PowerDrop record from; the entity only exists as a live Sanity document plus a Postgres usage-event log.
- **Reusable as a UI/UX reference**: the mobile list/detail screens, the `PowerDropCard`/`PowerDropThumbnail` components, and the category-filter-bar pattern are working, shipped examples of "small structured content library on mobile" — a reasonable UI starting point, though not built to 9:16/full-screen spec.
- **Reusable as a usage-tracking pattern**: `power_drop_usages`' "usage event, no streaks/percentages" model is a clean precedent if Somatic Cards ever want a lightweight "viewed"/"used" signal without building a completion system (the architecture explicitly excludes completion for v1, so this may not be needed, but the pattern exists if it ever is).
- **Not reusable directly**: the Sanity schema itself (`powerDrop`) is missing Invitation/What to Notice/Gentle Note/Series hierarchy/supportingImages/demonstrationSequence — extending it in place rather than building a new schema would mean retrofitting a differently-scoped document type, not adopting a ready-made one.

---

## 9. Duplication / Drift Risks

| Risk                                                                                                                                                                                                               | Basis                                                                                                                                                                                                |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Two "PowerDrop" and "Somatic Card" experiences both claiming to represent the same physical card deck, confusing editors about where new cards should be entered                                                   | Direct evidence: the schema comment's sourcing language is near-identical to the Somatic Card architecture's stated purpose                                                                          |
| Two different image assets for what is meant to be the same finished card artwork, if both systems are populated independently                                                                                     | PowerDrop's `cardImage` and the architecture's `cardArtwork` are described in nearly identical language ("shown as-is," "a real content asset") — real risk of two uploads of the same physical card |
| Divergent category/taxonomy schemes (PowerDrop's 9-value emotional/functional list vs. the Somatic Card architecture's anatomically-framed Series names) being applied to the same underlying cards inconsistently | Direct comparison in §5 — the two taxonomies do not obviously map onto each other                                                                                                                    |
| Two different publication-state models (2-state vs. 3-state) for what could be the same content, if both systems are ever kept in sync manually                                                                    | §5, Publication row                                                                                                                                                                                  |
| Unclear source of truth leading to editorial double-entry effort (Caroline or a product owner manually entering the same card twice, once per system)                                                              | §7 — source of truth is unresolved, and both entry processes are currently manual with no cross-reference mechanism                                                                                  |

No risks around completion, reflection, or saves duplication were identified, since neither system has any of these today (§5).

---

## 10. Possible Technical Relationship Models

Presented as technically meaningful options given the actual evidence above — **no option is recommended or ranked**.

**Option A — Separate entities.** PowerDrop and SomaticCard remain fully independent Sanity types and (in Somatic Cards' case, future) Postgres tables, with no reference between them.

- _Preserves:_ PowerDrops' existing shipped pipeline untouched; zero migration risk.
- _Changes:_ nothing technically.
- _Content implication:_ if the same physical card is wanted in both experiences, it must be entered twice, in two schemas, by hand.
- _Risk:_ the duplication/drift risks in §9 apply at full strength.

**Option B — SomaticCard becomes the source entity; PowerDrop references it.** `powerDrop` gains an optional Sanity `reference` field pointing at a `somaticCard` document; PowerDrop's own content fields (`cardImage`, `focus`, `instructions`, `anchorStatement`) either stay as an override/cache or get deprecated in favor of pulling from the referenced Card.

- _Preserves:_ PowerDrops' existing API/UI shape, if the reference is resolved server-side into the same response shape.
- _Changes:_ PowerDrop schema gains a reference field; the `/api/v1/powerdrops*` routes' Sanity queries would need to resolve that reference (GROQ supports this natively — Sanity references are a first-class, well-supported feature; no evidence found that the current query layer (`packages/cms/src/lib/queries.ts`) does this today for any document type, so this would be new query logic, not a reuse of existing logic).
- _Content implication:_ Caroline's card content is entered once, in the richer Somatic Card schema; PowerDrop becomes a curated "quick access" subset/view onto it.
- _Migration implication:_ the 3 existing placeholder PowerDrop documents would need to be replaced (they're placeholders, so this is low-stakes) once real Somatic Cards exist to reference.
- _Risk:_ couples PowerDrop's availability to Somatic Cards' existence — if Somatic Cards ships later than expected, this could block PowerDrops from getting real content sooner.
- _Conflicts with the approved architecture?_ No — the architecture explicitly allows an optional `linkedPracticeId`-style relationship pattern; the same pattern applied to PowerDrops instead of Practice is structurally consistent with that allowance, though the architecture doesn't name PowerDrops specifically.

**Option C — Shared authored-content entity.** A new, more general Sanity document type holds the full authored card content (all Somatic Card architecture fields); both `powerDrop` and `somaticCard` become thin "presentation" documents that reference it, each adding only their own presentation-specific fields (e.g., PowerDrop's `featured`/`sortOrder`-in-a-quick-list vs. Somatic Card's `seriesId`/`cardNumber`).

- _Preserves:_ a genuinely single source of truth for authored content.
- _Changes:_ the most schema work of any option — three document types instead of one or two, plus reference-resolution logic in both API surfaces.
- _Content implication:_ content is entered exactly once, ever, regardless of how many "presentations" of it exist.
- _Migration implication:_ PowerDrops would need to migrate its 3 placeholder documents to the new shape; not costly given there's no real content yet, but would be non-trivial once real content exists in volume.
- _Risk:_ highest schema/engineering complexity of the three reference-based options; no existing precedent in this codebase for a 3-tier content-plus-two-presentations model.
- _Conflicts with the approved architecture?_ Not directly stated as disallowed, but the architecture describes Somatic Cards as its own first-class hierarchy (Collection→Series→Card), not as a generic reusable content primitive shared with unrelated features — this option goes further than what's written.

**Option D — PowerDrop becomes a presentation of a Card (SomaticCard owns content, PowerDrop is a delivery experience).** Structurally similar to Option B but framed the other direction: SomaticCard is unambiguously the canonical/owning entity; PowerDrop is explicitly documented as "the quick-access experience for a subset of Cards," with its own `featured`/category-for-home-tiles fields but zero independent content fields.

- _Preserves:_ Somatic Cards as the sole authoring surface going forward.
- _Changes:_ PowerDrop's schema would shed its content fields (`description`, `cardImage`, `focus`, `instructions`, `anchorStatement`) entirely in favor of a single `cardId` reference plus presentation-only fields.
- _Content implication:_ identical to Option B's, framed with SomaticCard as primary rather than PowerDrop.
- _Migration implication:_ identical to Option B's.
- _Risk:_ same coupling risk as Option B.
- _Conflicts with the approved architecture?_ This is the option that most directly matches the architecture's own framing of an optional `linkedPracticeId`-style relationship, generalized to PowerDrop instead of Practice — most architecturally consistent of the four, though again, not something the architecture document states explicitly since it doesn't mention PowerDrops.

---

## 11. Sanity / CMS Implications

- PowerDrops is authored entirely in Sanity — confirmed (§2).
- PowerDrops currently has **no reference fields at all** — every field is a scalar (string/text/number/boolean/image), confirmed by the full schema read in §2. It does not reference any other document type today.
- PowerDrops has one asset field (`cardImage`), using the standard Sanity `image` type with hotspot — the same pattern used by every other image field in the codebase (Practice, Article, Program).
- **Whether PowerDrop could reference a future SomaticCard**: technically yes — Sanity references are a native, first-class field type, and the `program→module→lesson` hierarchy (documented in the prior technical audit, §5) already demonstrates this codebase using multi-level Sanity references successfully, even though that particular hierarchy isn't yet consumed by any app.
- **Whether the current webhook supports references**: not applicable to PowerDrop directly, since PowerDrop doesn't go through the webhook/Postgres-sync pipeline at all (§2) — it's fetched live from Sanity on every request. If a future Somatic Card _did_ go through the webhook pipeline (as the architecture implies it should), and PowerDrop referenced a SomaticCard, resolving that reference would only matter for Somatic Cards' own sync, not for PowerDrops' live-fetch model. No complication to the existing Practice webhook is implied by any of this, since PowerDrops sits entirely outside that pipeline already.

---

## 12. Database Implications

No live conflict exists today, because PowerDrops has no content table to conflict with anything (§2, §8). The only Postgres artifact is `power_drop_usages`, which stores a Sanity `_id` as plain text specifically so it never needs a foreign-key relationship to any Postgres content table (the table's own comment explains this choice: the `_id` is immutable, unlike a slug). This design choice means **introducing a `somatic_cards` Postgres table later would not require any change to `power_drop_usages`** — it would remain a text-keyed usage log regardless of what content system PowerDrops ends up presenting.

If a future relationship model (Option B/C/D in §10) were chosen, the only database-layer question would be whether `power_drop_usages.powerDropId` should ever be re-keyed to a `somatic_cards.id` — nothing in the current design forces that; the loose text-key approach was deliberately chosen to avoid exactly this kind of coupling.

---

## 13. Import Implications

The planned pipeline (Sanity → sync → database → web/mobile) applies to the _Somatic Card_ system once it's built, per the prior technical audit. PowerDrops' existence has two concrete implications for that future import, both factual rather than product-judgment calls:

1. **PowerDrops is not a source of real content to import from** — it holds 3 placeholder documents, not Caroline's actual cards (§4). Any future Somatic Card import must source from the original PDF/deck material directly, not from PowerDrops' Sanity documents.
2. **If a reference-based relationship (Option B/C/D) is ever chosen**, the _order of operations_ for a future import matters: Somatic Cards would need to be imported/entered first, with PowerDrop's reference-updating (or schema migration away from its own content fields) happening afterward — importing in the reverse order would leave PowerDrop's 3 placeholder documents orphaned or require a separate cleanup pass.

No import, transformation, or OCR of any content was performed as part of this audit, and none is proposed.

---

## 14. Genuine Product Decisions Required

Phrased neutrally, per instructions — none of these are answered here:

1. **Are PowerDrops and Somatic Cards meant to be the same authored content, delivered two ways — or genuinely separate editorial efforts that happen to draw on the same source deck?**
2. **Should PowerDrops eventually reference/derive from Somatic Cards (Option B/D), share a common content entity with Somatic Cards (Option C), or remain fully independent (Option A)?**
3. **Is the physical/PDF "PowerDrop card deck" the same collection as the planned 102-card Core Series, a subset of it, or a separate curated selection?**
4. **If the content does overlap, which system should own the canonical authored copy — PowerDrops (already shipped) or Somatic Cards (architecturally richer)?**
5. **Should a member ever encounter the identical card through both the PowerDrops experience and the Somatic Cards library, and if so, should that be presented as "the same card, two views" or as two separate-feeling experiences?**
6. **Now that PowerDrops has been empty in production since launch (3 placeholders only), should content entry effort go toward populating PowerDrops as-is, or be redirected toward the richer Somatic Card schema once it exists — i.e., does PowerDrops still get Caroline's manual entry effort at all, or was it superseded by this new architecture before ever receiving real content?**

---

## 15. Technical Decisions Required

Separate from the product questions above — these are implementation-shape choices that follow _from_ whichever product decision is made, not prerequisites to it:

1. **Reference vs. duplication** — if content is meant to be shared, does PowerDrop reference SomaticCard (or vice versa), or does each system keep an independently-entered copy?
2. **Shared entity vs. separate entities** — Option A vs. B/D vs. C from §10.
3. **Sync direction and mechanism** — if a reference relationship is chosen, does PowerDrop's live Sanity-fetch model need to change to also resolve a `somaticCard` reference, and does that pull PowerDrops into the webhook/Postgres pipeline for the first time, or stay a live-fetch resolving a reference at query time?
4. **Asset ownership** — if `cardImage`/`cardArtwork` are meant to be the same file, which schema's image field is canonical, and does the other become a reference to it rather than its own upload?
5. **Publication-state synchronization** — if PowerDrop (2-state) and SomaticCard (3-state, per the architecture) are ever linked, how does an "archived" Card affect a PowerDrop that references it, given PowerDrop's schema has no "archived" concept today?
6. **API boundary** — would a linked PowerDrop be served by the existing `/api/v1/powerdrops*` routes (with resolved reference data merged in), by the future Somatic Card API, or by both, and does that change PowerDrops' current "authenticated-only, no entitlement" access model (§2) if it starts surfacing Somatic Card content that might carry its own, different gating?

---

## 16. Recommended Next Milestone

This audit's own scope ends at establishing facts, not choosing a direction — consistent with that, the recommended next step is an **information step, not a design step**: get a direct answer from Caroline/product ownership to the six questions in §14, specifically starting with #3 and #4 (whether the PowerDrop deck and the Core Series are the same collection, and if so, which system should be canonical), since every other open question — both product and technical — depends on that one being settled first. Only after that should the Series/Card Sanity and database schema design (the next milestone named in the prior technical audit) proceed, so it can be designed with the PowerDrop relationship already accounted for rather than retrofitted later.

---

## Appendix: Evidence Index

Direct repository reads performed for this audit:

- `packages/cms/src/schema/documents/powerDrop.ts` (full file)
- `packages/db/src/schema/power-drop-usages.ts` (full file)
- `apps/web/src/app/api/v1/powerdrops/route.ts` (full file)
- `apps/web/src/app/api/v1/powerdrops/[slug]/route.ts`, `.../usage/route.ts`
- `apps/web/src/components/dashboard/dashboard-sidebar.tsx` (PowerDrops callout)
- `apps/mobile/app/(tabs)/practices/powerdrops/index.tsx`, `.../[slug].tsx`
- `apps/mobile/src/components/powerdrops/*.tsx`
- `apps/mobile/src/components/home/{ExploreTiles,QuickPracticeRow}.tsx`
- `apps/mobile/src/api/types.ts` (PowerDrop type definitions)
- `apps/web/scripts/seed-sanity.mjs` (full file — confirmed no PowerDrop seeding)
- `git log --all --oneline -i --grep` for "powerdrop", "card deck", "somatic healing"
- `git show --stat cd011be` (PowerDrops feature-launch commit)
- Full-repository filename/content search for card-deck references and card image assets
- **Live, read-only Sanity GROQ query** against production dataset (`hookrbdv/production`) confirming exact PowerDrop document count and content — the only live-data check in this audit, performed because it directly and conclusively answered §4's evidence requirement rather than leaving it unverified.
