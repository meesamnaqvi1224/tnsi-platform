# TNSI Somatic Card Content Import Pilot v1

A small pilot to prove that REAL, Caroline-approved Somatic Card content
can travel through the intended pipeline (Sanity → sync → Postgres →
Read API → Web/Mobile). The pilot's Sanity-layer work is complete and
verified; the pipeline verification beyond Sanity is **blocked** by a
pre-existing condition unrelated to this milestone — see §8 onward.

## 1. Pilot Cards Selected

**Core Series 01 — Support, Pressure & Proprioception, Cards 1–3**
(contiguous, as preferred):

| Card # | Title                   | Slug                      |
| ------ | ----------------------- | ------------------------- |
| 1      | The Ground + Press Drop | `the-ground-press-drop`   |
| 2      | The Heel Press Reset    | `the-heel-press-reset`    |
| 3      | The Four-Point Foot Map | `the-four-point-foot-map` |

"The Ground + Press Drop" is the card explicitly named in this
milestone's own context as "the approved V1 visual/content baseline,"
confirming this selection.

## 2. Source Files Used

Per the user's explicit direction, sourced entirely from
`~/Downloads/Meesam Somatic Batch 1-5.zip`:

- `Woman_leaning_against_wall_20260921185046.jpeg` → Card 1 artwork
- `Bare_feet_standing_on_floor_20260921185046.jpeg` → Card 2 artwork
- `Bare_feet_standing_on_floor_20260921185047.jpeg` → Card 3 artwork

Each file is a single, finished, fully-designed 9:16 "Somatic Anatomy
System™" card image with all structured text baked into the design
(title, Purpose, The Practice steps, What to Notice, A Gentle Note,
Anchor) — not a plain photograph. This was discovered only after
visually inspecting the files individually; **the zip's filenames are
AI-export-style descriptive names (several literally `ChatGPT_Image_...`)
and are not reliable indicators of a file's actual card identity** — two
files did carry an informal `Core_series_XX_card_YY` naming pattern
(used to first suspect finished-card content existed in this batch), but
most of the 51 files, including all 3 used here, did not. Every file was
opened and read before any content was extracted from it, consistent
with the "asset filename is not authoritative content metadata"
principle in the approved architecture doc.

**`~/Downloads/Somatic healing/Somatic_Anatomy_System_Master.xlsx`**
(sheet "Core Series") was used to establish **card ordering/numbering**:
its "Primary Card List" column for Series 1 lists 10 titles in sequence;
position 1–3 in that list are exactly "The Ground + Press Drop," "The
Heel Press Reset," "The Four-Point Foot Map" — matching my 3 selected
cards and giving `cardNumber` 1, 2, 3. This is an **interpretation**
(list position treated as card sequence), not an explicit numbered
column in the source — flagged as a soft gap in §16.

**`~/Downloads/TNSI_Somatic_Card_Content_Architecture_v1.docx`** was used
for the Series-level `coreQuestion` and to confirm the Collection/Series/
Card numbering scheme (Series 01 = Cards 01–10) and every field
definition referenced throughout this document.

**Not used**: `~/Downloads/Somatic healing/TNSI_Somatic_Card_Prompts.docx`
— inspected and found to describe a _different, unrelated_ 26-card set
("CARD 01 THE WEIGHT SHIFT DROP," a distinct illustration-style AI-image-
generation brief with its own color palette and card titles that don't
match any card in the batch zip). Using it would have meant mixing two
different, non-corresponding card systems — explicitly avoided.
`~/Downloads/Somatic healing/Caroline Somatic healing cards.pdf` was
identified as a candidate earlier but not opened/used once the user
redirected to the batch zip specifically.

## 3. Series Created/Used

No Somatic Series or Card document existed in the Sanity dataset before
this pilot (confirmed via a read-only GROQ query returning `result: []`
for `*[_type in ["somaticSeries","somaticCard"]]` — see §14). One new
Series document was created:

```
_id: somaticSeries.core-series-01
seriesNumber: 1
title: "Support, Pressure & Proprioception"
slug: support-pressure-proprioception
collection: core-series
coreQuestion: "Where am I in my body, and what is supporting me?"
status: draft
sortOrder: 1
```

`description`, `visualTreatment`, and `defaultLayout` were left unset —
no distinct authored Series description or an explicit Series-01 visual-
treatment statement was found in any source (see §16).

**Note — a genuine discrepancy in the source material**: the
architecture docx's `coreQuestion` ("Where am I in my body, and what is
supporting me?") differs from the xlsx's "Question Answered" column for
the same series ("Where is my body, what is supporting me, and how much
force am I producing?"). The architecture docx's version was used (it
reads as the more curated, member-facing phrasing; the xlsx's column
reads more like internal design rationale), but this is a judgment call,
not an authoritative resolution — flagged in §16 for Caroline/product
owner to confirm.

## 4. Content-Field Mapping Result

All 8 architecture-approved Card content fields were mapped per card,
transcribed exactly from the artwork (no separate structured-text source
existed for these 3 cards — the artwork was the only content source, so
Step 4's manual-transcription-with-verification path was used, and every
line was re-read against the rendered image before being written).

| Field             | Source on the card                                                                                    | Notes                                                                                                                                                                                                                                                          |
| ----------------- | ----------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `invitation`      | The short subtitle line under the title (e.g. "Reconnect with support. Regulate from the ground up.") | Used only when the card has no explicit "Orientation:"-labeled line instead (none of these 3 did)                                                                                                                                                              |
| `purpose`         | The "PURPOSE" box's bold line + body sentence, concatenated                                           | Cards 1 and 2 share identical Purpose wording verbatim ("Grounding & bodily support. Feel where you are. Use what supports you.") — transcribed faithfully, not treated as an error (plausible intentional reuse across foundational cards in the same series) |
| `description`     | **Not present** — left unset                                                                          | No section on any of these 3 cards is separately labeled as a general/neutral summary distinct from Purpose                                                                                                                                                    |
| `orientation`     | **Not present** for these 3 cards — left unset                                                        | A different Series-01 card ("The Midline Press," not part of this pilot) does show an explicit "Orientation:" label, confirming the field is real and used elsewhere in the deck, just not on cards 1–3                                                        |
| `practiceSteps[]` | "THE PRACTICE" numbered list (6 steps each)                                                           | Explicit `order` (0-indexed) and `label` (the step's own bold word, e.g. "ARRIVE") preserved exactly                                                                                                                                                           |
| `whatToNotice[]`  | "WHAT TO NOTICE" 3-icon row                                                                           | Transcribed as `"{Heading} — {question}"` per item, exactly as printed                                                                                                                                                                                         |
| `gentleNote`      | "A GENTLE NOTE" box                                                                                   | Transcribed verbatim                                                                                                                                                                                                                                           |
| `anchor`          | "ANCHOR" quote box                                                                                    | Transcribed verbatim, quotation marks omitted (the field is the statement itself)                                                                                                                                                                              |

**Not mapped to any field, by design**: a third, decorative pull-quote
that appears in the artwork's right margin on every card (e.g. "A CALMER
NERVOUS SYSTEM STARTS WITH A MORE GROUNDED YOU."). No field in the
approved architecture corresponds to this text — it is part of the
artwork's design layer, not a distinct structured-content field, and
Step 3 explicitly forbids adding fields outside the approved
architecture. It remains visible only within the `cardArtwork` image
itself.

**A genuine title-rendering inconsistency, resolved conservatively**:
Card 3's artwork renders its title with irregular capitalization ("The
FOur-POINT FOOT Map"), while the xlsx's master card list uses clean
Title Case ("The Four-Point Foot Map") consistent with every other title
in the deck. This reads as an unintentional typographic/export glitch
(no other card exhibits mid-word capitalization), not a deliberate style
choice, so the xlsx's clean version was used for the `title` field —
documented here transparently rather than silently normalized.

## 5. Asset Fields Mapped

| Card | `cardArtwork`         | `heroImage`           | `supportingImages`    | `demonstrationSequence` |
| ---- | --------------------- | --------------------- | --------------------- | ----------------------- |
| 1–3  | ✅ uploaded, attached | Not present in source | Not present in source | Not present in source   |

Each of the 3 source images is a single, unified, finished 9:16 card
(photo + all text composited together by the original designer) — there
is no separate hero photograph, supporting-image set, or demonstration
sequence for these specific 3 cards in the source zip. Per the
architecture ("optional fields may remain empty"), these three fields
were left unset rather than fabricated or split out of the single
artwork. No image was cropped, regenerated, altered, or had anything
added to it — each file was uploaded to Sanity as-is, byte-for-byte.

## 6. Sanity Environment/Dataset

**Project `hookrbdv`, dataset `production`** — confirmed as the only
Sanity environment configured anywhere in this repository
(`apps/web/.env.local`'s `NEXT_PUBLIC_SANITY_PROJECT_ID`/
`NEXT_PUBLIC_SANITY_DATASET`, matching `.env.example`'s documented
default). No staging/dev Sanity dataset exists in this codebase to
choose between — the environment was unambiguous, not assumed.

## 7. Publication State

**`draft`** for both the Series and all 3 Cards. The architecture doc's
"Current Content Inventory" table marks "Core Series 01: Cards 01–10 —
Complete," but _content-completeness is not the same as publish-
approval_ (per this milestone's Step 7's explicit distinction). No
source material anywhere states these specific 3 cards are approved for
member-facing publication — so per the fallback rule, they were left in
`draft`. This is reported, not silently resolved.

## 8. Sync Verification — BLOCKED

**Status: blocked by a pre-existing condition, not caused by this
milestone.** The intended flow (Sanity → `/api/webhooks/sanity-somatic`
→ Postgres) could not be exercised because:

1. `SANITY_SOMATIC_WEBHOOK_SECRET` is not set anywhere in this repo's
   local environment config (confirmed: zero matches in
   `apps/web/.env.local`).
2. Attempting to read the project's registered Sanity webhooks via the
   API returned `401 Unauthorized — User must have grant
sanity.project.webhooks/read` — the available token has content
   read/write scope only, not project-management scope, so registration
   status can't be confirmed via API either. Combined with (1), and with
   the prior Sync v1 milestone's own explicit finding ("Not registered in
   production as of this milestone"), the webhook is very likely still
   unregistered.
3. **Root cause, confirmed directly**: `https://thenervoussysteminstitute.com/api/webhooks/sanity-somatic`
   and `https://thenervoussysteminstitute.com/api/v1/somatic-cards/series`
   both return **HTTP 404** on the live production site. The entire
   Somatic Card application layer (sync webhook, Read API, Web UI) has
   never been deployed to production. This is the expected, correct
   state: every one of the eight prior Somatic Card milestones was
   explicitly instructed not to commit, stage, or push, and `git status`
   confirms all 67 of those files remain uncommitted in this local
   working tree today. There is no deployed code anywhere for a webhook
   to call, or for a live API/Web UI to serve from.

Fixing this would require committing and deploying eight milestones'
worth of accumulated code to production — an action this milestone's own
final instructions explicitly forbid ("DO NOT COMMIT. DO NOT STAGE. DO
NOT PUSH.") and which is well outside "verification of existing sync."
Per Step 11's explicit prohibitions, no workaround was attempted: no
second sync mechanism was built, and no Postgres row was manually
inserted to fake a result.

## 9. Postgres Verification — Blocked (downstream of §8)

Not performed. With no deployed webhook to sync through, and an explicit
prohibition on manually inserting rows, there is nothing in Postgres to
verify. `somatic_series`/`somatic_cards` remain unchanged (confirmed
empty as of the prior Read API/Web UI/Mobile UI milestones; no write
path exists to have changed that).

## 10. API Verification — Blocked (downstream of §8)

Not performed against the live site (404, per §8). The Read API's own
code is unchanged since its approved milestone and remains covered by
its existing 24 passing integration tests (re-run in §16) — those tests
already exercise the exact query/filter/mapping logic that would serve
this pilot's content once it reaches Postgres; this pilot did not need
to re-prove that logic, only that real content could reach it, which is
where the pipeline is currently blocked.

## 11. Web Verification — Blocked (downstream of §8)

Not performed against the live site — nothing is deployed. The Web UI's
own rendering logic is unchanged and remains covered by its existing 43
passing tests (re-run in §16).

## 12. Mobile Verification — Deferred

Per this milestone's explicit instruction not to attempt to solve the
previously-identified simulator tap-input issue, and since the mobile
app would need the same undeployed production API to show real content
regardless, mobile runtime verification is deferred, consistent with
the prior Mobile QA milestone's own deferred status. No simulator/tooling
configuration was touched.

## 13. Accessibility / Alt-Text Status

**Known gap, reported rather than fabricated.** No `cardArtwork.alt` was
set for any of the 3 cards. No separately-authored, authoritative alt
text was supplied anywhere in the source material for these specific
images. Per Step 9, an elaborate description was not invented; the alt
text fields were left empty and are flagged here as outstanding —
Caroline/the product owner should supply real alt text (or confirm the
card's own `title`/`purpose` text is an acceptable substitute) before
these cards are ever published. The Sanity schema field
(`cardArtwork.fields: [{name: 'alt', ...}]`) is optional at the schema
level, so this did not block document creation.

## 14. Duplicate Checks

Performed before any write: `*[_type in ["somaticSeries","somaticCard"]]`
against the production dataset returned `result: []` — zero existing
documents of either type. No duplicates were possible. Deterministic,
human-readable `_id` values were used
(`somaticSeries.core-series-01`, `somaticCard.core-series-01.card-0{1,2,3}`)
so a re-run of this exact pilot would safely `createOrReplace` the same
documents rather than create duplicates.

## 15. Ordering Checks

- Series: `seriesNumber: 1`, `sortOrder: 1`.
- Cards: `cardNumber`/`sortOrder` set to 1, 2, 3 respectively, matching
  their position in the xlsx's Series-1 "Primary Card List" (see §2's
  caveat that this is a position-based interpretation, not an explicit
  numbered source field).
- Verified via a direct GROQ read-back (§ "Sanity verification" below)
  that all three cards resolve their `series` reference correctly and
  inherit `collection: "core-series"` through that reference — Card
  documents in this schema do not carry their own `collection` field;
  it is resolved from the referenced Series by the (unmodified) sync
  layer at sync time, exactly as designed. No mismatch exists to report.
- API-level ordering (§13 of docs/TNSI_Somatic_Card_Read_API_v1.md) could
  not be exercised end-to-end because nothing is deployed (§8); the
  underlying `ORDER BY sortOrder` query logic is unchanged and already
  covered by the Read API's existing tests.

### Sanity verification (performed, read-only after write)

```
somaticCard.core-series-01.card-01 → cardNumber 1, sortOrder 1, slug the-ground-press-drop, series→collection "core-series", series→status "draft"
somaticCard.core-series-01.card-02 → cardNumber 2, sortOrder 2, slug the-heel-press-reset,   series→collection "core-series", series→status "draft"
somaticCard.core-series-01.card-03 → cardNumber 3, sortOrder 3, slug the-four-point-foot-map, series→collection "core-series", series→status "draft"
```

All `practiceSteps`/`whatToNotice` arrays read back with correct
`order`, `label`/`text`, and `_key` values, matching what was written.
`cardArtwork.asset` resolves to a real uploaded Sanity image asset for
all 3 cards.

## 16. Tests

No application code was modified in this milestone (only Sanity content
was created, via a one-time scratch script run from `/tmp`, never added
to the repo). Per Step 20, the full monorepo was not re-run; the
Somatic-relevant suites were re-run as confirmatory evidence that the
code this content will eventually flow through remains correct:

- `@tnsi/cms test` (sync-plan-somatic + sync-plan + verify): **33/33 passed.**
- `apps/web` full vitest suite (Read API integration, sync integration,
  Web UI component/orchestration tests — isolated Neon test branch, never
  production): **158/158 passed.**
- `pnpm turbo run type-check`: **12/12 packages pass.**
- `pnpm turbo run lint`: **0 errors**, same pre-existing warnings as
  every prior milestone, none new.

## 17. Known Gaps

1. **Deployment gap (the primary blocker)** — the Somatic Card sync
   webhook, Read API, and Web UI have never been committed/pushed/
   deployed to production. This blocks live verification of sync,
   Postgres, API, and Web for real content, and is not something this
   milestone is authorized to fix.
2. **Webhook secret never provisioned** — `SANITY_SOMATIC_WEBHOOK_SECRET`
   does not exist in any environment this session could inspect.
3. **`cardNumber` ordering is an interpretation**, not an explicit
   numbered source field (§2, §15) — should be confirmed against
   Caroline/the product owner before treating 1/2/3 as final.
4. **Series `coreQuestion` has two differing source versions** (§3) —
   the architecture docx's phrasing was used; the xlsx's differs.
5. **No alt text** exists for any of the 3 card artworks (§13).
6. **Series `description`/`visualTreatment`/`defaultLayout`, and Card
   `description`/`orientation`/`visualTreatment` are unset** for all 3
   pilot cards — genuinely absent from source material, not omitted by
   oversight.
7. Mobile runtime verification remains deferred (unrelated pre-existing
   simulator tooling issue, per the prior milestone).

## 18. Recommendation for Bulk Import

**Do not proceed to bulk import (Series 02–09, cards 4–102) yet.** The
Sanity-layer content pipeline (source material → structured extraction →
Sanity documents → assets) is proven correct and safe by this pilot. The
blocking dependency for anything beyond Sanity is entirely the
deployment gap in §8/§17.1 — that must be resolved first (a deliberate,
explicit decision to commit and deploy the accumulated Sync v1/Read API
v1/Web UI v1 work, plus provisioning `SANITY_SOMATIC_WEBHOOK_SECRET` and
registering the actual Sanity webhook), and the _sync→Postgres→API→Web_
leg of this exact 3-card pilot should be re-verified live once that
happens, before any larger import is attempted. Separately, before
bulk-importing the remaining ~7 cards of Series 01 (which include the
two non-contiguous cards found in this same batch — "The Midline Press"
and "The Axial Alignment Reset" — plus 5 more not yet located in any
inspected source), the four content-ambiguity gaps in §17 (2–6) should
be resolved with Caroline/the product owner, and the full Series 01–05
card set should be confirmed to exist and be located (this pilot found
Series 01 cards, plus one card each from Series 02–05, inside the same
batch zip — not the full 50).
