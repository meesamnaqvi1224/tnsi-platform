# TNSI Somatic Card Bulk Import — Cards 1–50

All 50 completed Somatic Healing Cards across Core Series 01–05 have been
identified, structured, and imported into Sanity (project `hookrbdv`,
dataset `production`) as `draft` documents. This document supersedes the
3-card pilot (docs/TNSI_Somatic_Card_Content_Import_Pilot_v1.md) as the
authoritative record of the full import.

## 1. Source Discovery

Per the user's explicit direction, all 50 cards were located inside a
single source: `~/Downloads/Meesam Somatic Batch 1-5.zip` (51 image
files). Every one of the 51 files was individually opened and visually
inspected — filenames in this batch are AI-export-style descriptive
names (many literally following an "AI-generated image" naming
convention) and are **not reliable indicators of card identity**; two
files happened to carry an informal `Core_series_XX_card_YY` pattern,
which is what first confirmed finished-card content existed in this
batch, but the other 49 needed content-based identification (title,
series eyebrow/badge, Purpose/Anchor wording) against
`Somatic_Anatomy_System_Master.xlsx`'s "Core Series" sheet.

Two other candidate files were inspected and explicitly **not used**:
`TNSI_Somatic_Card_Prompts.docx` (a different, unrelated 26-card
image-generation brief with its own titles/visual style — using it would
have mixed two non-corresponding card systems) and
`Caroline Somatic healing cards.pdf` (not opened once the user redirected
to the batch zip specifically).

## 2. Mapping Methodology

Each of the 51 images is a single, finished, fully-designed 9:16
"Somatic Anatomy System™" card with all structured text (title, Purpose,
The Practice steps, What to Notice, A Gentle Note, Anchor) composited
into the artwork itself — there is no separate structured-text source
for this batch, so every field was manually transcribed directly off the
rendered image and cross-checked against `Somatic_Anatomy_System_Master.xlsx`'s
per-series "Primary Card List" (an ordered, semicolon-separated list of
10 titles per series), which supplied `cardNumber` (list position) since
no card carries its own printed card number — only a Series number badge.

**50 of the 51 images matched exactly one of the 50 titles named across
Series 01–05's master lists.** The 51st (`Hand_holding_smooth_stone_...jpeg`,
titled on its own artwork as "The Object-To-Palm Reset") does not appear
in the master list for any series and was excluded — see §14.

## 3. All Five Series

| #   | Title                                       | Core Question (source: architecture docx)                                             |
| --- | ------------------------------------------- | ------------------------------------------------------------------------------------- |
| 1   | Support, Pressure & Proprioception          | Where am I in my body, and what is supporting me?                                     |
| 2   | Breath & Cardiorespiratory Rhythm           | What is my breath doing, and can I notice its rhythm without forcing it?              |
| 3   | Orientation & Visual-Spatial Attention      | Where am I in the space around me?                                                    |
| 4   | Movement, Balance & Vestibular Organisation | Can I move, change position and still remain oriented?                                |
| 5   | Touch, Temperature & Sensory Discrimination | What am I feeling through the skin, and can I distinguish one sensation from another? |

All five created (Series 01 already existed from the pilot — reconciled,
not duplicated). `collection: "core-series"` for all five, `status:
"draft"` for all five (see §7). Note: the xlsx's own "Question Answered"
column phrases Series 01's question slightly differently ("Where is my
body, what is supporting me, and how much force am I producing?") than
the architecture docx used here — flagged in the pilot doc and still
unresolved; the architecture docx's phrasing was used for all five
series for consistency.

## 4. Cards 1–50

All 50 imported. Full per-card mapping (title, artwork source filename,
needsReview flag/reason) lives in the manifest:
`content/somatic-cards/core-series-01-05.json`. Summary by series:

| Series                                           | Cards | Status                                                   |
| ------------------------------------------------ | ----- | -------------------------------------------------------- |
| 01 — Support, Pressure & Proprioception          | 1–10  | 10/10 imported (1 flagged needsReview: Card 6)           |
| 02 — Breath & Cardiorespiratory Rhythm           | 11–20 | 10/10 imported (1 flagged needsReview: Card 19)          |
| 03 — Orientation & Visual-Spatial Attention      | 21–30 | 10/10 imported (3 flagged needsReview: Cards 23, 25, 30) |
| 04 — Movement, Balance & Vestibular Organisation | 31–40 | 10/10 imported (0 flagged)                               |
| 05 — Touch, Temperature & Sensory Discrimination | 41–50 | 10/10 imported (3 flagged needsReview: Cards 44, 45, 46) |

**50 / 50 expected cards were source-located and imported.** No card
number is missing.

## 5. Artwork Matching

All 50 cards' finished 9:16 artwork was matched to the correct card by
reading the artwork's own title/Purpose/Anchor content (never by
filename), uploaded to Sanity byte-for-byte via the importer's asset
upload call — no regeneration, redesign, recoloring, destructive
cropping, or AI enhancement. `cardArtwork.asset` is set on all 50
documents (verified via a post-import GROQ query:
`count(*[_type=="somaticCard" && defined(cardArtwork.asset)])` → 50).

No separate hero image, supporting images, or demonstration sequence
existed for any of these 50 cards as distinct source files — each card's
finished artwork is a single combined image. Per the architecture ("only
map into heroImage/supportingImages/demonstrationSequence where separate
source images genuinely exist... do not invent separate assets by
cutting them out of the finished artwork"), those three fields were left
empty on every card rather than fabricated by cropping the single
artwork. This mirrors the approved architecture doc's own definition of
`cardArtwork` as an independent presentation asset, not a container to
be sliced apart.

## 6. Structured Content Extraction

All 8 architecture-approved Card content fields (`invitation`, `purpose`,
`description`, `orientation`, `practiceSteps[]`, `whatToNotice[]`,
`gentleNote`, `anchor`) were populated where the artwork actually
contained that content; none were forced. Across all 50 cards:

- Every card has `purpose`, `practiceSteps` (variable length — observed
  6, 7, 8, or 9 steps per card across the batch, never assumed to be 3),
  `whatToNotice`, `gentleNote`, and `anchor`.
- `invitation` (the subtitle line beneath the title) is present on every
  card except Card 8 ("The Midline Press"), whose subtitle is instead
  explicitly labeled "Orientation:" on the artwork — transcribed into
  `orientation` for that card only, matching the architecture's own
  field distinction.
- `description` was not populated for any of the 50 cards — no card in
  this batch has a separately-labeled "Description" text block distinct
  from Purpose; inventing one by duplicating or rephrasing Purpose was
  avoided.
- `orientation` was populated only for Card 8, for the reason above.
- Practice step `label`s (e.g. "Arrive", "Press", "Feel") were preserved
  exactly as printed on each card; instruction text preserved verbatim,
  including original punctuation and em-dashes.

## 7. Publication State

**All 5 Series and all 50 Cards remain `draft`.** No source material
establishes that these specific 50 cards are approved for member-facing
publication — the architecture/master-list documents mark the content as
editorially "Complete," which is a content-completeness signal, not a
publish-approval signal (the same distinction the pilot milestone
established). Nothing was published; this import is not a claim that the
content is ready for members to see.

## 8. Sync Verification

**Unchanged from the pilot: still blocked, for the same pre-existing
reason.** `SANITY_SOMATIC_WEBHOOK_SECRET` remains unprovisioned in any
environment this session can reach, and the entire Somatic Card
application layer (this milestone's Track A work: see §15) had not yet
been deployed at the time this document was written — it has now been
committed locally (see §21 of the final report) but not pushed, per this
milestone's explicit "push is NOT authorized yet" instruction. The
webhook was not registered. No content was synced from Sanity to
Postgres, and none was directly inserted into Postgres — the importer
only ever writes to Sanity, never to the database, per the explicit
prohibition on bypassing the webhook.

## 9. Postgres Verification

`somatic_series`/`somatic_cards` remain empty in production (confirmed
via a read-only row count immediately before this import, and unchanged
since — nothing in this milestone writes to Postgres). Migration `0009`
was verified already applied (table structure exists; the most recent
row in `drizzle.__drizzle_migrations` has `created_at` timestamp
`1790053803669`, exactly matching the local migration journal's entry
for `0009_add_somatic_series_and_cards` — see §15/Part 15 of the final
report). It was **not** re-run.

## 10. API Verification

Not performed live (the Read API is not deployed to production — see
§15). Its query/filter/publication logic is unchanged from the approved
Read API v1 milestone and remains covered by its own 24 integration
tests (re-run in this milestone, still passing) — once deployed and
synced, the same, already-tested logic will correctly exclude all 50
`draft` cards from every member-facing endpoint until their status is
changed to `published`.

## 11. Web Verification

Not performed live, for the same reason — nothing is deployed. The Web
UI's rendering logic is unchanged and covered by its own 43 tests
(re-run, still passing).

## 12. Mobile Verification / Deferred Status

Deferred, per this milestone's explicit instruction not to attempt to
solve the previously-identified simulator tap-input tooling issue. No
simulator/tooling configuration was touched.

## 13. Accessibility / Alt-Text Status

No `cardArtwork.alt` was set for any of the 50 cards — no separately
authored, authoritative alt text exists anywhere in the source material
for this batch (the same finding as the pilot). Left empty rather than
fabricated; this is a required follow-up before any of these cards are
published, tracked here as a batch-wide (not per-card) gap.

## 14. Duplicate Checks

Performed before the batch write: a GROQ query for all existing
`somaticSeries`/`somaticCard` documents found exactly the pilot's 4
(Series 01 + Cards 1–3). The importer's stable, deterministic document
IDs (`somaticSeries.core-series-0N`, `somaticCard.core-series-0N.card-NN`)
meant those 4 were safely reconciled (`createOrReplace`, same content)
rather than duplicated — confirmed by re-running the importer in
`--dry-run` mode after the real import, which correctly reported all 55
documents (5 series + 50 cards) as "existing," not "new."

One file (`Hand_holding_smooth_stone_20260921185047.jpeg`, artwork title
"The Object-To-Palm Reset") was **excluded, not imported**: its title
does not appear anywhere in `Somatic_Anatomy_System_Master.xlsx`'s
50-title master list for any of the five series, so no card number could
be confidently assigned to it — importing it under a guessed number
would have been exactly the kind of invention this milestone's rules
prohibit. It is recorded in the manifest's `excludedSource` array for
future human review (it may be an 11th genuine Series 05 card, a
duplicate/renamed version of an existing card, or unfinished draft
material).

## 15. Ordering Checks

`cardNumber` 1–50, each unique, each exactly once — verified
programmatically. `sortOrder` set equal to `cardNumber` for every card
(no other explicit sortOrder source existed). Every card's `series`
reference resolves to a Series whose `seriesNumber` correctly matches
`ceil(cardNumber / 10)` — verified via a direct query joining each
card's `cardNumber` against its resolved `series->seriesNumber`, 0
mismatches across all 50. Every Series has `collection: "core-series"` —
0 mismatches.

## 16. Tests

- `packages/cms` (`sync-plan-somatic`, `sync-plan`, `verify`, and the new
  `somatic-import-lib` — manifest validation + stable-ID logic): **43/43
  passed.**
- `apps/web` full suite (Read API integration, sync integration, Web UI —
  isolated Neon test branch, never production): **158/158 passed.**
- `apps/mobile` full suite: **8/8 passed.**
- No code was changed in the Read API, Web UI, or mobile app this
  milestone beyond what was already committed from prior approved
  milestones — these numbers confirm no regression from the bulk-import
  work itself.

## 17. Known Gaps (Carried Forward + New)

1. **Deployment gap** — the application layer is now committed
   (`a57ab50`) but not pushed/deployed; sync/API/Web/Mobile verification
   against real infrastructure remains blocked until that happens.
2. **Webhook secret unprovisioned** — no automated path was available;
   see the final report's Secret Provisioning section for the exact
   manual step.
3. **8 cards flagged `needsReview`** (6, 19, 23, 25, 30, 44, 45, 46) —
   each has a specific, documented reason in the manifest (mismatched
   series badge on the artwork, an artwork's own step-numbering
   duplication, or an inconsistent eyebrow label) — see the manifest's
   `reviewNote` field per card for the exact issue.
4. **1 excluded source file** ("The Object-To-Palm Reset") — not part of
   the 50-card master list, not imported, needs a human decision.
5. **No alt text** for any of the 50 card artworks.
6. **`cardNumber`-to-artwork mapping used the xlsx's list position**, not
   an explicit numbered field — the same interpretation flagged in the
   pilot, now extended across all 50 cards. Recommend a single pass of
   human confirmation against Caroline's own records before publication.
7. Mobile runtime verification remains deferred (pre-existing, unrelated
   simulator tooling issue).

## 18. Bulk Import Complete

This milestone's content-import objective is complete: all 50 available
completed Core Series cards (per the source material actually located)
are in Sanity, correctly structured, correctly ordered, correctly
linked to their Series, in `draft` status, ready for the review items in
§17 and eventual publication once approved and once the deployment gap
(§8/§17.1) is resolved.
