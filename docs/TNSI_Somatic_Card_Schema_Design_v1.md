# TNSI Somatic Card Schema Design v1

**Type:** Design proposal only. No schema, migration, API, or component files were created. No existing file was modified.

---

## 1. Design Summary

This document proposes a data model for the Somatic Card system — `Collection → Series → Card → Structured Card Content → Visual Assets` — as a genuinely separate content system from Practices and PowerDrops, sourced canonically from Sanity, following the naming/typing/constraint conventions already established in this repository rather than inventing new ones.

The core design choices, each justified against actual repository evidence in the sections below:

- **Collection is not a database/Sanity entity in v1** — it's representable as a controlled string on Series, avoiding an abstraction the current scope doesn't need.
- **Series and Card are both first-class Sanity documents and first-class Postgres tables**, following the `practices` table's exact shape/convention (flattened columns + a `sanityData jsonb` escape hatch), not a new pattern.
- **Structured content fields (Invitation, Purpose, Practice Steps, What to Notice, Gentle Note, Anchor) are plain strings/text and typed arrays of objects — not Portable Text.** The repository has a Portable Text precedent (`blockContent`, used only by Article's long-form body), but every short-form authored-line field elsewhere (PowerDrop's `focus`, `anchorStatement`, `description`) uses plain `string`/`text`, and the architecture's own language ("preserve Caroline's wording exactly," "not a marketing tagline") describes short authored lines, not rich long-form prose.
- **Practice Steps / What to Notice / Demonstration Sequence are Sanity `array of object`**, following the `program → module → lesson` reference-and-order precedent, synced into Postgres as `jsonb`, following the `practices.sanityData jsonb` precedent — normalized child tables are evaluated and rejected (§11) as unjustified complexity for content that Postgres never needs to query into.
- **Publication stays Sanity-native (draft/published/archived) and collapses to a Postgres boolean at sync time**, exactly matching how `practices.isPublished` already works — not forcing a new tri-state enum into Postgres where nothing needs to query "archived vs. published" separately from "not currently shown."
- **Sync is a new, parallel webhook endpoint**, never a modification of `/api/webhooks/sanity`, matching the boundary the prior technical audit already established.
- **No relationship to Practices or PowerDrops** is created anywhere in this design, per the locked product decision.

---

## 2. Existing Repository Conventions

All findings below are direct evidence, not inference, gathered by reading the actual files.

### Drizzle / Postgres (`packages/db/src/schema/`)

| Convention            | Evidence                                                                                                                                                       | Applied how                                                                                                     |
| --------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| Primary key           | `id: uuid('id').primaryKey().default(sql\`gen_random_uuid()\`)` — every table (`practices.ts:19-21`, `practice-saves.ts:23-25`, `power-drop-usages.ts:22-24`)  | Series/Card use the identical pattern                                                                           |
| Sanity sync key       | `sanityId: text('sanity_id').notNull()` with `unique(...)` (`practices.ts:23,52`)                                                                              | Series/Card get the same, each with their own unique constraint                                                 |
| Timestamps            | `createdAt`/`updatedAt`: `timestamp(..., { withTimezone: true }).notNull().defaultNow()` (`practices.ts:48-50`)                                                | Identical on Series/Card                                                                                        |
| Foreign keys          | `.references(() => x.id, { onDelete: 'cascade' })` (`practice-saves.ts:26-28`)                                                                                 | Card → Series FK uses the same pattern                                                                          |
| Enums                 | `pgEnum('snake_case_name', [...])`, defined once in `enums.ts`, imported by the table that uses it (`practices.ts:14`, `enums.ts:19-25`)                       | New enums (if any) follow this file/naming convention                                                           |
| Indexes               | Named `idx_<table>_<column(s)>`, composite indexes for common query patterns (`practice-saves.ts:38-41`, `power-drop-usages.ts:35-42`)                         | Series/Card indexes follow this naming                                                                          |
| Unique constraints    | Named `unique_<table>_<column(s)>` (`practices.ts:52`, `practice-saves.ts:35-37`)                                                                              | Series/Card uniqueness follows this naming                                                                      |
| Ordering columns      | **No `sortOrder`/`order` column exists in any current Postgres table** — confirmed absent from `practices`, `practice_saves`, `power_drop_usages`, `check_ins` | Series/Card introduce the first Postgres ordering columns in this codebase; no existing pattern to deviate from |
| Publication state     | `isPublished: boolean('is_published').notNull().default(true)` — one-way flag, never a tri-state enum (`practices.ts:44`)                                      | See §9 for how this is reconciled with the architecture's 3-state model                                         |
| Rich/variable content | `sanityData: jsonb('sanity_data').notNull()` stores the **entire raw Sanity document** alongside flattened queryable columns (`practices.ts:45`)               | This is the direct precedent for storing Practice Steps/What to Notice/Demonstration Sequence — see §7, §11     |
| Check constraints     | `check('practices_difficulty_range', sql\`...\`)` (`practices.ts:57`)                                                                                          | Used where a numeric range needs enforcement (not needed here)                                                  |
| Migration naming      | Auto-generated by `drizzle-kit` (`0000`–`0008`, names like `0006_redundant_thing.sql`) — not hand-named                                                        | No migration is created in this design step                                                                     |

### Sanity (`packages/cms/src/schema/`)

| Convention                  | Evidence                                                                                                                                                                                                                                         | Applied how                                                                                                                                                         |
| --------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Document registration       | Additive: define in `documents/<name>.ts`, import + array entry in `schema/index.ts:14-27`                                                                                                                                                       | Series/Card register the same way                                                                                                                                   |
| Slug                        | `type: 'slug', options: { source: 'title', maxLength: 96 }` (`powerDrop.ts:26-29`)                                                                                                                                                               | Card uses the same; Series evaluated separately (§6)                                                                                                                |
| Reference                   | `type: 'reference', to: [{ type: 'x' }], validation: (r) => r.required()` (`module.ts`'s `program` field, `lesson.ts`'s `module` field)                                                                                                          | Card → Series reference uses the same shape                                                                                                                         |
| Image                       | `type: 'image', options: { hotspot: true }, fields: [{ name: 'alt', type: 'string' }]` (`powerDrop.ts:57-65`, `article.ts` coverImage)                                                                                                           | Every Card image field (artwork, hero, supporting, frames) uses this shape                                                                                          |
| Array of plain strings      | `type: 'array', of: [{ type: 'string' }]` (`powerDrop.ts:79-85`, `instructions`)                                                                                                                                                                 | Reused where content is genuinely just an ordered list of short strings (see §7 for where this vs. array-of-object is chosen)                                       |
| Array of objects with order | `program → module → lesson`'s reference-plus-`order` pattern (`module.ts:32-38`, `lesson.ts:29-35`) — the only existing precedent for structured, explicitly-ordered content in this codebase                                                    | Practice Steps, What to Notice, Supporting Images, Demonstration Sequence all follow this shape                                                                     |
| Explicit display order      | `sortOrder: type: 'number', description: 'Manual display order...Lower first.'` (`powerDrop.ts:97-101`) and `order` in `module.ts`/`lesson.ts`                                                                                                   | Series and Card both get an explicit `sortOrder`                                                                                                                    |
| Ordering config             | `orderings: [{ title: 'Display order', name: 'orderAsc', by: [{ field: 'order', direction: 'asc' }] }]` (`module.ts:53-55`)                                                                                                                      | Series and Card schemas both declare this                                                                                                                           |
| Publication                 | `status: { type: 'string', options: { list: [{ published }, { draft }], layout: 'radio' }, initialValue: 'published' }` — **2-state, string-based, not Sanity's native draft/publish system** (`powerDrop.ts:102-113`, `module.ts`, `lesson.ts`) | This repo has already chosen a manual string-field publication model over Sanity's built-in draft system everywhere — Series/Card follow suit, extended to 3 values |
| Rich text                   | `blockContent` object (`objects/blockContent.ts`) — Portable Text with headings/quotes/lists/figures/callouts — used **only** by `article.body`                                                                                                  | Not used for Card structured content (§7 justifies this)                                                                                                            |
| Controlled vocabulary       | `options: { list: [...] }` string field (`powerDrop.ts` category, 9 fixed values)                                                                                                                                                                | Used for Orientation if a controlled list is warranted (§7)                                                                                                         |
| Preview config              | `preview: { select: { title, subtitle, media } }` on every document type                                                                                                                                                                         | Series/Card both get one                                                                                                                                            |

### Shared Validation (`apps/web/src/lib/validation.ts`)

- Every schema is `camelCase` + `Schema` suffix, paired with `export type X = z.infer<typeof xSchema>` immediately below (confirmed pattern across `checkInSchema`, `practiceReflectionSchema`).
- List/pagination schemas share a fixed shape: `limit: z.coerce.number().int().min(1).max(50).default(20), offset: z.coerce.number().int().min(0).default(0)` (explicitly documented as reused across 4+ existing list schemas).
- Enum fields pull from Drizzle-generated enums rather than re-declaring string unions (`z.enum(postPracticeResponseEnum.enumValues)`).
- **No existing schema in this repo validates an array of structured objects** — confirmed absent in the prior audit. This design introduces the first one.

### CMS Sync — How Sanity IDs Are Represented Today

- `practices.sanityId: text().notNull().unique()` stores Sanity's `_id` verbatim as the join key between Sanity and Postgres (`practices.ts:23`).
- `power_drop_usages.powerDropId: text().notNull()` stores Sanity's `_id` too, but with **no foreign key** — deliberately, per its own comment, because PowerDrop content isn't synced to Postgres at all (§ of the prior relationship audit).
- The webhook (`apps/web/src/app/api/webhooks/sanity/route.ts`) validates against a Zod schema hardcoded to `z.literal('practice')` (`packages/cms/src/webhook/schema.ts:44-49`) — there is no `_type` branch/switch to extend; routing happens via a Sanity-side webhook filter, not in-code. **Confirmed: adding Card sync requires a new, parallel endpoint, not a modification of this one.**

---

## 3. Domain Model

```
Collection (conceptual grouping — see §4 for why this is NOT a table)
  └─ Series (first-class: Sanity document + Postgres table)
       └─ Card (first-class: Sanity document + Postgres table)
            ├─ Structured Content (fields directly on the Card document/row + jsonb for ordered arrays)
            └─ Visual Assets (fields directly on the Card document, synced into the Card row's jsonb / flattened where queried)
```

No entity in this model references, extends, or is referenced by `practices`, `practice_saves`, `practice_completions`, `practice_reflections`, or `powerDrop`/`power_drop_usages`. This is a deliberate, explicit design constraint carried through every section below.

---

## 4. Collection Model

**Decision: Collection is NOT a database or Sanity document entity in v1.**

Reasoning: the only current requirement is "Core Series" as a single named grouping, with a stated need to support "future separate Somatic Card collections" later. Introducing a full `Collection` document/table now — for exactly one value ("Core Series") — is the unnecessary abstraction the task explicitly warns against (§16, "prefer the smallest clean domain model").

**Recommended representation:** a plain **string field** on `Series` (Sanity: `collection: { type: 'string' }`; Postgres: `collection: text().notNull()`), analogous to how `practices.category` is a plain `text` column rather than a reference to a `categories` table (`practices.ts:34`). If/when a second collection is ever approved, this can be upgraded to a real `collection` document + reference — a mechanical, low-risk migration precisely because nothing else in the schema depends on Collection being anything more than a label today.

This satisfies all three stated requirements: Core Series works (`collection: "Core Series"`), a future second collection works (a new string value, or a later upgrade to a real entity), and PowerDrops remains untouched (no shared table, no shared field).

---

## 5. Series Model

### Sanity: `somaticSeries` document

| Field             | Type                                                                     | Notes / evidence                                                                                                                                                                 |
| ----------------- | ------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `title`           | `string`, required                                                       | Matches `powerDrop.title`, `module.title`                                                                                                                                        |
| `slug`            | `slug`, `source: 'title'`, required                                      | Matches `powerDrop.slug` exactly                                                                                                                                                 |
| `seriesNumber`    | `number`, required                                                       | New — no existing "business number distinct from display order" precedent; kept a plain number, not a string, since it's used for arithmetic-free identity/display ("Series 01") |
| `collection`      | `string`, required                                                       | Per §4                                                                                                                                                                           |
| `description`     | `text`                                                                   | Matches `powerDrop.description`, `text` type, no row limit needed at Series scope                                                                                                |
| `coreQuestion`    | `string`                                                                 | Short authored line ("Where am I in my body...") — `string`, not `text`, matching the length/intent of `powerDrop.anchorStatement`                                               |
| `visualTreatment` | `string`, controlled list                                                | See §7 for the enum/string discussion — same mechanism as Card-level `visualTreatment`                                                                                           |
| `defaultLayout`   | `string`, optional                                                       | A fallback layout hint for Cards in this Series that don't set their own — plain string, not required                                                                            |
| `status`          | `string`, radio, `published`/`draft`/`archived`                          | See §9 — 3-state, extending the existing 2-state pattern                                                                                                                         |
| `sortOrder`       | `number`                                                                 | Matches `powerDrop.sortOrder`                                                                                                                                                    |
| `orderings`       | `[{ name: 'orderAsc', by: [{ field: 'sortOrder', direction: 'asc' }] }]` | Matches `module.ts`/`lesson.ts`                                                                                                                                                  |

No `image`/artwork field on Series — the architecture doesn't call for series-level artwork, and none is invented here.

### Postgres: `somatic_series` table

| Column                   | Type                                                                   | Evidence / reasoning                                                                                                                                               |
| ------------------------ | ---------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `id`                     | `uuid primaryKey default gen_random_uuid()`                            | Standard, `practices.ts:19-21`                                                                                                                                     |
| `sanityId`               | `text notNull`, `unique('unique_somatic_series_sanity_id')`            | Matches `practices.sanityId` exactly                                                                                                                               |
| `seriesNumber`           | `integer notNull`                                                      | See uniqueness discussion below                                                                                                                                    |
| `title`                  | `text notNull`                                                         | Standard                                                                                                                                                           |
| `slug`                   | `text notNull`                                                         | See uniqueness discussion below — **this is the first `slug` column in Postgres in this codebase**; Practice has none (confirmed in the prior technical audit, §4) |
| `collection`             | `text notNull`                                                         | Per §4                                                                                                                                                             |
| `description`            | `text` (nullable)                                                      | Standard                                                                                                                                                           |
| `coreQuestion`           | `text` (nullable)                                                      | Standard                                                                                                                                                           |
| `visualTreatment`        | `text` (nullable)                                                      | Plain string, per §7's recommendation against a hard Postgres enum here                                                                                            |
| `defaultLayout`          | `text` (nullable)                                                      | Standard                                                                                                                                                           |
| `status`                 | new enum `somatic_publication_status` (`draft`/`published`/`archived`) | See §9                                                                                                                                                             |
| `sortOrder`              | `integer notNull default 0`                                            | First ordering column in this codebase — plain integer, matching Sanity's `number` type                                                                            |
| `sanityData`             | `jsonb notNull`                                                        | Mirrors `practices.sanityData` — full raw Sanity doc, escape hatch for anything not flattened                                                                      |
| `createdAt`, `updatedAt` | `timestamp withTimezone notNull defaultNow()`                          | Standard                                                                                                                                                           |

**Uniqueness reasoning:**

- `sanityId`: globally unique — this is the sync join key, same as Practice; no reason to scope it.
- `seriesNumber`: unique **within `collection`**, not globally. Reasoning: the architecture explicitly anticipates future collections beyond Core Series; a second collection's Series numbering restarting at 01 is a completely normal editorial pattern (e.g., a hypothetical future "Advanced Series 01" alongside "Core Series 01"), and there is no stated requirement that series numbers be globally unique across all collections that might ever exist. A composite unique constraint on `(collection, seriesNumber)` is the correct scope.
- `slug`: unique **globally**, not scoped to collection. Reasoning: slugs form URLs (`/somatic-cards/series/<slug>`), and two different collections having a series at the same URL path would be a real routing conflict, unlike `seriesNumber` which is just a display label. This mirrors how Sanity's own `slug` type validation works globally per-document-type by default, and matches this codebase's existing (admittedly Practice-absent, but Article/Program-present) convention of slug uniqueness per document type, not further scoped.

---

## 6. Card Model

### Sanity: `somaticCard` document

| Field                         | Type                                                                     | Notes                                                            |
| ----------------------------- | ------------------------------------------------------------------------ | ---------------------------------------------------------------- |
| `title`                       | `string`, required                                                       | Standard                                                         |
| `slug`                        | `slug`, `source: 'title'`, required                                      | Standard                                                         |
| `cardNumber`                  | `number`, required                                                       | Editorial identity — see uniqueness reasoning below              |
| `series`                      | `reference`, `to: [{ type: 'somaticSeries' }]`, required                 | Matches `module.program`/`lesson.module` reference shape exactly |
| `status`                      | `string`, radio, `published`/`draft`/`archived`                          | Same as Series                                                   |
| `sortOrder`                   | `number`                                                                 | Same as Series/PowerDrop precedent                               |
| `orderings`                   | `[{ name: 'orderAsc', by: [{ field: 'sortOrder', direction: 'asc' }] }]` | Same as Series                                                   |
| _(structured content fields)_ | —                                                                        | See §7                                                           |
| _(visual asset fields)_       | —                                                                        | See §8                                                           |

### Postgres: `somatic_cards` table

| Column                          | Type                                                                              | Reasoning                                                      |
| ------------------------------- | --------------------------------------------------------------------------------- | -------------------------------------------------------------- |
| `id`                            | `uuid primaryKey default gen_random_uuid()`                                       | Standard                                                       |
| `sanityId`                      | `text notNull unique('unique_somatic_cards_sanity_id')`                           | Standard, matches Practice's sync-key pattern                  |
| `cardNumber`                    | `integer notNull`                                                                 | See uniqueness reasoning below                                 |
| `title`                         | `text notNull`                                                                    | Standard                                                       |
| `slug`                          | `text notNull`                                                                    | See uniqueness reasoning below                                 |
| `seriesId`                      | `uuid notNull references(() => somaticSeries.id, { onDelete: 'restrict' })`       | See FK behavior note below                                     |
| `status`                        | `somatic_publication_status enum`                                                 | Same as Series                                                 |
| `sortOrder`                     | `integer notNull default 0`                                                       | Same as Series                                                 |
| _(structured content — see §7)_ | mix of flattened `text` columns + `jsonb`                                         |                                                                |
| _(visual assets — see §8)_      | flattened `text` URL columns for singular images, `jsonb` for ordered collections |                                                                |
| `sanityData`                    | `jsonb notNull`                                                                   | Full raw doc, same escape-hatch role as `practices.sanityData` |
| `createdAt`, `updatedAt`        | `timestamp withTimezone notNull defaultNow()`                                     | Standard                                                       |

**`onDelete: 'restrict'` instead of `'cascade'` for `seriesId`, unlike `practice_saves`' `cascade`**: reasoning — `practice_saves`→`practices` cascading on delete makes sense because a save is meaningless once its target is gone. A Card losing its Series should not silently delete the Card; Postgres should refuse the Series delete instead, forcing an explicit re-parent or Card-archival decision first. This is a genuine design choice, not a copy of an existing pattern (no existing FK in this codebase uses `restrict`) — flagged as an open question in §20 in case the team prefers `cascade` or `set null` instead.

**Uniqueness reasoning:**

- `sanityId`: globally unique, same reasoning as Series.
- `cardNumber`: unique **within `seriesId`**, not globally and not within `collection`. Reasoning: the architecture states "Card number is editorial identity" but never states card numbers are unique across the whole 102-card Core Series in a way that would break if a future collection also had a "Card 1." The task's own inventory (`Series 01: Cards 1–10`, `Series 02: Cards 11–20`, etc.) shows the _current_ Core Series numbering happens to be collection-wide sequential (1–102) — but that is an editorial choice about _this_ collection's numbering scheme, not a database-level guarantee the schema should hard-code. Scoping uniqueness to `seriesId` is the more conservative, less presumptuous constraint: it doesn't prevent the current Core Series's 1–102 global sequence from continuing to be used as a matter of editorial convention, but it also doesn't accidentally block a hypothetical future collection's Series from independently numbering its own cards 1–10. This is explicitly flagged as a judgment call in §20, since reasonable people could argue for collection-wide uniqueness instead, given the stated inventory.
- `slug`: unique **globally**, same URL-routing reasoning as Series.

---

## 7. Structured Content Model

| Field              | Sanity type                                                                                  | Postgres representation           | Reasoning                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| ------------------ | -------------------------------------------------------------------------------------------- | --------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Invitation**     | `text` (multi-row plain text, not Portable Text)                                             | flattened `text` column           | Short authored opening line, same register as `powerDrop.description` ("the short line under the card title"). Portable Text (`blockContent`) is reserved in this codebase for long-form article bodies with headings/lists/figures — using it here would let editors add structure (headings, embedded images) the architecture never asks for and the app would then need to handle rendering for. Plain text keeps the field exactly as rich as the architecture requires, no more.                                                                                                                                                                                         |
| **Purpose**        | `text`                                                                                       | flattened `text` column           | Same reasoning as Invitation. Distinct field from Description (see below) — the architecture lists them separately and defines Purpose as "why the practice/card exists," which is a different authorial intent from a general description.                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| **Description**    | `text`, optional                                                                             | flattened `text` column, nullable | The architecture's §4 field list includes both `Description` and `Purpose` as separate items. This design keeps them distinct rather than collapsing them (per the task's own "do not duplicate fields unnecessarily" instruction, they were checked against each other: Purpose is explicitly "why," Description is the more general/neutral summary a listing or accessibility context might use — e.g., an alt-text-adjacent summary vs. an authored rationale). If in practice Caroline never fills both differently, that's an editorial observation to make after real content exists, not a reason to remove the field now.                                             |
| **Practice Steps** | `array of object`, each `{ stepOrder: number, label: string (optional), instruction: text }` | `jsonb` column (`practiceSteps`)  | Variable length, explicitly no min/max per the architecture. Modeled as Sanity `array of object` (the `program→module→lesson` precedent for structured, ordered content), synced as `jsonb` rather than a normalized child table — see §11 for the full reasoning on this choice. `label` is optional because not every step needs a short title distinct from its instruction text.                                                                                                                                                                                                                                                                                           |
| **What to Notice** | `array of object`, each `{ sortOrder: number, text: string }`                                | `jsonb` column (`whatToNotice`)   | Ordered collection per the architecture; kept as simple `{sortOrder, text}` objects — not `array of string` like PowerDrop's `instructions`, because the architecture explicitly frames this as "an ordered collection of observations/prompts," and giving each item its own object (rather than relying on array-index-as-order) matches the explicit-ordering principle stated repeatedly in the architecture, consistent with how Practice Steps and Supporting Images are also modeled as objects with an order field rather than bare arrays.                                                                                                                            |
| **Gentle Note**    | `text`, optional                                                                             | flattened `text` column, nullable | First-class field per the architecture; plain text, "preserve Caroline's wording exactly" language strongly implies no restructuring/formatting is wanted.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| **Anchor**         | `string`, required                                                                           | flattened `text` column           | Matches `powerDrop.anchorStatement`'s exact type and required-ness — both are short, quoted authored lines.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| **Orientation**    | `string`, optional, free text (not a controlled list)                                        | flattened `text` column, nullable | The architecture only mentions "image direction / metadata where applicable" for Orientation and explicitly warns against inventing a clinical taxonomy. A controlled list (like PowerDrop's 9-value `category`) would require someone to define and approve that vocabulary now — which the task doesn't authorize. Free text lets Caroline/editors describe orientation (e.g., "seated," "standing," "lying down," or a specific image-direction note) without this design pre-deciding the vocabulary. If a controlled list is wanted later, it's a small, additive schema change (Sanity's `options.list` is easy to add to an existing string field without a migration). |

**Why not Portable Text for any of these fields:** confirmed via `blockContent.ts` and `article.ts` that Portable Text exists in this codebase exactly once, for exactly one purpose (long-form article bodies with headings, quotes, lists, and embedded figures). None of the Card's structured fields need embedded images, headings, or mixed formatting within the field itself — they're short, single-register authored lines or ordered lists of short lines. Using plain `string`/`text` and `array of object` is the minimal type that satisfies every stated requirement, consistent with §16's instruction to avoid unjustified abstraction.

---

## 8. Visual Asset Model

| Asset                            | Sanity type                                                                                                    | Postgres representation                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| -------------------------------- | -------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Card artwork** (finished 9:16) | `image`, `options: { hotspot: true }`, `fields: [{ name: 'alt', type: 'string', validation: required }]`       | flattened `text` URL column (`cardArtworkUrl`) + `text` (`cardArtworkAlt`) — mirrors `practices.thumbnailUrl` being a plain URL column, and matches `powerDrop.cardImage`'s exact field shape. `alt` is made **required** here (unlike PowerDrop's optional `alt`), because §13/§16 of the architecture explicitly requires artwork to never be the sole representation of content — a required alt text is the smallest enforceable guarantee of that at the schema level. |
| **Hero image**                   | `image`, same shape as artwork, separate field                                                                 | flattened `text` URL + alt columns (`heroImageUrl`, `heroImageAlt`)                                                                                                                                                                                                                                                                                                                                                                                                         | Kept as a genuinely separate field from artwork (unlike PowerDrop, which conflates the two into one `cardImage` — see the PowerDrops relationship audit, §5, "Conflict" row on this exact point). The architecture is explicit that "the finished 9:16 card artwork is a presentation asset. It must NOT be treated as the only source of accessible content" — treating hero and artwork as one field would reintroduce the ambiguity PowerDrops already has. |
| **Supporting images**            | `array of object`, each `{ image, caption: string (optional), sortOrder: number }`                             | `jsonb` column (`supportingImages`)                                                                                                                                                                                                                                                                                                                                                                                                                                         | Ordered, per the architecture. Same object-with-order pattern as Practice Steps.                                                                                                                                                                                                                                                                                                                                                                               |
| **Demonstration sequence**       | `array of object`, each `{ image, label: string (optional), instruction: text (optional), sortOrder: number }` | `jsonb` column (`demonstrationSequence`)                                                                                                                                                                                                                                                                                                                                                                                                                                    | Architecture explicitly allows zero, one, or many frames — an empty/absent array naturally represents zero frames, no special-casing needed.                                                                                                                                                                                                                                                                                                                   |
| **Other media**                  | Not included                                                                                                   | —                                                                                                                                                                                                                                                                                                                                                                                                                                                                           | No justification found in the architecture or existing codebase for a generic "other media" field; §16 explicitly warns against unnecessary media abstraction. If a genuinely new media need arises (e.g., audio), it should be a new named field with its own clear purpose, not a generic bucket.                                                                                                                                                            |

**Why `jsonb`, not a normalized child table, for ordered image/frame collections:** see §11 — same reasoning as Practice Steps/What to Notice.

---

## 9. Publication Model

**The existing Postgres convention is a boolean (`practices.isPublished`), and the architecture wants a 3-state model (draft/published/archived). This design does not force a 3-state Postgres enum to imitate Sanity's model, nor does it flatten the architecture's 3 states down to a boolean — it keeps each layer doing what it's already good at:**

- **Sanity**: `status` is a plain `string` field (not Sanity's built-in draft/publish document versioning — confirmed this codebase already avoids Sanity's native draft system everywhere, using a manual string field instead, per `powerDrop.ts`/`module.ts`/`lesson.ts`) with 3 values: `draft`, `published`, `archived`. This is the authoring-time state, fully expressive, no compromise.
- **Database**: introduces a **new** Postgres enum `somatic_publication_status` with the same 3 values (`draft`/`published`/`archived`), rather than reusing `practices.isPublished`'s boolean shape. Reasoning: the architecture's "archived" state is semantically different from Practice's "unpublished" — Practice's boolean only ever needed to answer "show this or not," and `sync-plan.ts`'s own comment (from the prior technical audit) explains _why_ it never hard-deletes: FK cascade risk to `practice_completions`. A Card has no completions to cascade-protect, so there's no structural reason to collapse to a boolean here — and a 3-state enum in Postgres directly and honestly represents what Sanity says, rather than lossily compressing it. This is a genuine, evidence-based _deviation_ from the Practice pattern, justified because the constraint that produced Practice's boolean (cascade-delete safety) doesn't apply to Cards.
- **API**: only ever surfaces `published` Cards/Series to members (mirrors `powerdrops/[slug]/route.ts`'s existing behavior: "returns `notFound()` for missing/unpublished/draft content (never leaks drafts)" — same rule applies here for both `draft` and `archived`).

This is the "cleanest separation" the task asks for: Sanity and Postgres each store the real 3-state value (no information loss at either layer), while the API layer is where the "is this visible to a member right now" business rule actually lives — exactly one place, not duplicated logic in two schemas.

---

## 10. Sanity Schema Proposal

(Field-by-field detail already given in §5–§8; this section summarizes registration mechanics only, per the existing convention — not implemented.)

Two new document types would be added to `packages/cms/src/schema/documents/`: `somaticSeries.ts` and `somaticCard.ts`, each following the exact structure of `powerDrop.ts`/`module.ts` shown throughout this document. Registration is additive in `packages/cms/src/schema/index.ts` (import + array entry) — confirmed in the prior audit that this file requires no other changes to add a type. No existing schema file is touched.

---

## 11. Database Schema Proposal

(Column-by-column detail already given in §5–§8.) Two new tables: `somatic_series`, `somatic_cards`. One new enum: `somatic_publication_status`.

**Why `jsonb` for Practice Steps / What to Notice / Supporting Images / Demonstration Sequence, instead of normalized child tables (`somatic_card_steps`, `somatic_card_notices`, etc.):**

This was evaluated explicitly, not defaulted to. Arguments for normalized child tables: standard relational modeling, queryable at the row level, enforceable per-row constraints. Arguments against, specific to this codebase and this content:

1. **No existing precedent for it.** The only existing "ordered structured content" pattern (`program→module→lesson`) uses Sanity references between _separate documents_, not an array-of-objects-as-child-rows pattern in Postgres — and that hierarchy isn't yet consumed by any app, so it's a design precedent, not a proven-in-production one either way.
2. **Direct precedent for the alternative already exists and is proven in production**: `practices.sanityData jsonb NOT NULL` already stores an entire raw Sanity document, and the app is already built to read structured data out of a jsonb blob for Practice.
3. **Nothing in the stated requirements needs Postgres to query _into_ these arrays.** The architecture's search requirement (§14 of the architecture) explicitly says future search "may eventually cover... practice steps, what to notice" — but that's phrased as a future, unbuilt capability, and even if built, Postgres `jsonb` supports GIN-indexed containment/text search natively; a normalized table isn't required to make that possible later.
4. **Child tables would need their own ordering, uniqueness, and orphan-prevention rules** — multiplying the "first ordering columns in this codebase" concern (§2) across 4 new tables instead of 2, for content that is always fetched and rendered as a complete unit (a Card's steps are never queried independently of the Card itself anywhere the architecture describes).

Given this codebase's own established comfort with `jsonb` for exactly this kind of variable-length, always-fetched-as-a-unit content (Practice's precedent), and the absence of any stated requirement to query into these arrays at the database level, `jsonb` is the smaller, more consistent choice. **This is flagged as a real design decision, not a foregone conclusion — §20 notes it as worth confirming before implementation, since it's the single highest-leverage schema choice in this design.**

---

## 12. Sanity → Database Sync Design

**A new, parallel endpoint** — not a modification of `/api/webhooks/sanity` — per the prior technical audit's finding that the existing route's Zod schema is hardcoded to `z.literal('practice')` with no internal type-routing to extend.

Proposed shape (naming only, not implemented):

- New route, e.g. `/api/webhooks/sanity-somatic` (or a query-string/path discriminator on a differently-structured shared route — either way, a new code path, not a branch inside the existing one).
- New Zod schemas in `packages/cms/src/webhook/schema.ts` (or a new sibling file) for `somaticSeries` and `somaticCard` payloads, following the existing `sanityPracticeWebhookSchema` shape exactly.
- **Document types**: two, synced independently — `somaticSeries` and `somaticCard` each get their own Sanity webhook filter/subscription (mirroring the existing `_type == "practice"` filter convention documented in the webhook README), so a Series edit doesn't require re-syncing every Card and vice versa.
- **Sync identifiers**: `sanityId` (Sanity's `_id`), exactly as Practice does — this is the join key for idempotent `INSERT ... ON CONFLICT (sanity_id) DO UPDATE`.
- **Series/Card references**: a Card's Sanity document holds a `reference` to its Series (`series._ref`, Sanity's native reference format). The sync handler resolves this to the Series' Postgres `id` by looking up `somatic_series.sanityId = <the referenced Sanity _id>` before writing the Card row — this requires the referenced Series to have synced _first_. See "upsert order" below.
- **Upsert order**: Series webhook events must be safe to process independently of Card events, but a Card referencing a not-yet-synced Series is a real possible race (Sanity webhooks don't guarantee delivery order across documents). Two honest options, neither implemented here: (a) reject/retry the Card sync if its Series isn't found yet (matches "fail loudly rather than silently" spirit of existing error handling), or (b) allow a Card to sync with a temporarily-null `seriesId` and backfill once the Series arrives. Recommended: (a), for simplicity and consistency with this codebase's existing "no silent partial state" posture (e.g., `getOrCreateUser`'s explicit race-handling comment in `auth-api.ts`) — but this is flagged as an open question in §20, since it does mean Series must always be entered/published in Sanity before or alongside their first Card, an editorial-workflow implication worth confirming with whoever manages content entry.
- **Deletion/deactivation**: matches Practice's existing pattern exactly — never hard-delete; a Sanity delete/unpublish event sets Postgres `status = 'archived'` (the Card/Series equivalent of `isPublished = false`), for the same reason Practice avoids hard deletes (avoiding orphaned references — though Cards have no completions to protect, keeping historical Sanity `_id`s stable is still valuable for debugging and potential future features).
- **Idempotency**: same atomic `INSERT ... ON CONFLICT (sanity_id) DO UPDATE` pattern as `sync-practice.ts`.
- **Unpublished content handling**: a `status: 'draft'` document should sync into Postgres with `status = 'draft'` (not be skipped entirely) — this matches how the architecture describes draft as a real, trackable state, not an absence of a row. The API layer (§14) is what filters drafts from member-facing responses, not the sync layer.
- **Reference integrity**: enforced at the Postgres level via the `seriesId` foreign key (`restrict`, per §6) — a Card sync that can't resolve its Series reference should fail the sync (§ above), not write an invalid row.
- **Asset references**: Sanity image fields resolve to CDN URLs via the existing `urlForImage` helper (`packages/cms/src/lib/image.ts`) — same mechanism as every other image field in this codebase, no new asset-handling code implied.

---

## 13. Validation Design

New Zod schemas, in `apps/web/src/lib/validation.ts` (or a new sibling file, consistent with existing file organization), following the established conventions exactly:

- `somaticSeriesSchema` / `somaticCardSchema` — `camelCase` + `Schema` suffix, paired `z.infer` type export, per the established pattern.
- List/pagination query schemas (`somaticSeriesListQuerySchema`, `somaticCardsListQuerySchema`) reuse the exact `limit`/`offset` shape already established across 4+ existing list schemas — no new pagination convention invented.
- **This design introduces the first Zod schema in the codebase for an array of structured objects** — e.g. `practiceStepsSchema = z.array(z.object({ stepOrder: z.number().int(), label: z.string().optional(), instruction: z.string() }))`. No existing precedent to follow here (confirmed absent in the prior audits), so this is new pattern-setting, not pattern-copying — flagged for review since it's the first of its kind.

---

## 14. API Contract Proposal

Not implemented. Endpoints justified strictly by what the architecture and consumption model actually require — no speculative endpoints added:

- `GET /api/v1/somatic-series` — list, published-only, paginated (mirrors `/api/v1/practices` and `/api/v1/powerdrops` list-route shape exactly, including `requireMemberAccess()` as the first line — see §10 of this document for the access-control reasoning).
- `GET /api/v1/somatic-series/[slug]` — detail (mirrors `/api/v1/powerdrops/[slug]`'s "404 for draft/archived, never leak" behavior).
- `GET /api/v1/somatic-cards` — list, filterable by `series` (slug or id — TBD, not decided here), paginated.
- `GET /api/v1/somatic-cards/[slug]` — detail, returns the full structured content + all visual asset references in one response (no separate "ordered content" or "assets" endpoint — the architecture never describes Card content and its assets as independently fetchable, and splitting them would only add round-trips for no stated benefit, violating §16's "don't over-design").

**Not included, and why:** a "related cards" endpoint (nothing in the architecture describes card-to-card relationships), a "saves" endpoint (§9 of the architecture defers this explicitly, not approved for this milestone), a dedicated "collections" endpoint (§4 — Collection isn't an entity in this design).

---

## 15. Web/Mobile Consumption Model

Both clients consume the **same canonical JSON shape** from `GET /api/v1/somatic-cards/[slug]` (and the list endpoint) — this is a hard requirement carried directly from the task's "IMPORTANT DISTINCTIONS" section, and nothing in this design introduces a web-specific or mobile-specific response shape. This mirrors how `/api/v1/practices` and `/api/v1/powerdrops` already serve one canonical shape consumed differently by web's server components and mobile's `src/api/client.ts` (confirmed in the prior technical audit — mobile's fetch client is fully generic, not Practice-specific).

**Web** would render the canonical model into a responsive layout — structured content (Invitation/Purpose/Steps/etc.) as real, accessible DOM text, artwork/hero/supporting images via the existing `ResponsiveImage` wrapper (confirmed generic and reusable in the prior audit), with a new aspect-ratio treatment for the 9:16 artwork (confirmed no such preset exists yet — new UI work, not new data-model work).

**Mobile** would render the same canonical model into a full-screen, 9:16-oriented layout, following the `breathing/session.tsx` immersive-route precedent (confirmed reusable in the prior audit) for the no-header/safe-area/gesture handling, with structured content available for a future swipe/pager interaction the architecture explicitly says is "not yet locked" — this design doesn't presume or preclude any particular interaction model, since the API/data shape is identical regardless of how it's eventually paginated/swiped through on-device.

Neither client receiving a different canonical model is enforced simply by there being **one** API contract (§14) — there's no mechanism in this design for a web-only or mobile-only field.

---

## 16. Accessibility

Every structural requirement from the architecture's own accessibility section is satisfied by field choices already made above, not by new accessibility-specific fields:

- **Text alternatives**: `cardArtworkAlt` is **required** (§8) — stronger than PowerDrop's optional `alt`, directly enforcing "artwork must not be the sole representation of content" at the schema level.
- **Meaningful image metadata**: every image field (artwork, hero, supporting images, demonstration frames) carries its own `alt`/`caption`/`label`, per §8.
- **Structured, ordered steps**: Practice Steps and What to Notice are real, independently-readable arrays (§7) — never require parsing text out of an image.
- **Screen-reader-friendly content**: because structured content lives in real Postgres/API fields (not embedded in the artwork), both web and mobile can render it as real text nodes/native text components — no dependency on OCR, image-alt-text-as-content-substitute, or any workaround.
- **Artwork as supplemental, not sole, content**: enforced structurally — `cardArtworkUrl`/`heroImageUrl` are separate fields from every structured content field, and nothing in this design makes any UI's ability to render meaningfully dependent on the image loading.

No new accessibility-specific schema fields were invented beyond what the content-modeling choices above already provide — consistent with §16's anti-over-engineering instruction.

---

## 17. Data Integrity Constraints

| Risk                                                                                    | Database-enforceable?                    | Mechanism                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| --------------------------------------------------------------------------------------- | ---------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Duplicate `cardNumber` within a Series                                                  | **Yes**                                  | `unique('unique_somatic_cards_series_card_number').on(seriesId, cardNumber)`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| Duplicate `slug` (Series or Card)                                                       | **Yes**                                  | `unique(...)` on the `slug` column, global per table                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| Duplicate Sanity IDs                                                                    | **Yes**                                  | `unique(...)` on `sanityId`, per table                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| Orphan Card (no valid Series)                                                           | **Yes**                                  | `seriesId uuid notNull references(...)` — cannot insert without a valid, existing Series row                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| Orphan Series (theoretical — no parent concept exists for Series in this design)        | N/A                                      | Not applicable; Collection isn't a referenced entity (§4)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| Published Card referencing an archived/draft Series                                     | **No — application/CMS validation only** | Postgres FK integrity only guarantees the Series _row exists_, not that its `status` is compatible with the Card's `status`. This needs a sync-time or API-time check (e.g., the sync handler could warn/reject a `published` Card whose Series is `draft`) — no existing precedent in this codebase for cross-entity publication-consistency checks (Practice has no parent to be inconsistent with), so this would be new validation logic, not a constraint the database itself can express cleanly without a trigger (triggers are absent from every existing migration — not this codebase's convention). |
| Ordering collisions (two Cards in the same Series with the same `sortOrder`)            | **Partially**                            | A unique constraint on `(seriesId, sortOrder)` is _possible_ but not recommended as a hard constraint — `powerDrop.sortOrder`'s own schema description ("lower first") implies ties are tolerated/broken by a secondary sort (likely `cardNumber` or `title`) rather than being an error state. Recommended: leave `sortOrder` un-uniqued at the database level, treat collisions as a CMS-editorial concern (Sanity Studio could warn, not enforce).                                                                                                                                                          |
| Invalid asset references (a Sanity image reference pointing at a deleted/missing asset) | **No — Sanity/CMS-side only**            | This is inherent to how Sanity assets work; Postgres only ever stores the resolved CDN URL at sync time, so a broken Sanity asset reference would surface at sync time (the URL resolution would fail or return null), not as a Postgres-level integrity violation.                                                                                                                                                                                                                                                                                                                                            |

---

## 18. Import Readiness

Verification (not execution) that the proposed schema can represent the existing 50 completed cards, per the task's explicit "verify, don't import" instruction:

- **Series 01–05**: each maps to one `somatic_series` row (`collection: "Core Series"`, `seriesNumber: 1..5`, `title`, `coreQuestion` all directly represented per §5).
- **Cards 1–50**: each maps to one `somatic_cards` row, `cardNumber: 1..50`, `seriesId` pointing at its Series — the "cardNumber unique within Series" constraint (§6) accommodates the stated numbering (Cards 1–10 in Series 01, 11–20 in Series 02, etc.) without any conflict, since each Series' card numbers are also unique within that series under this scoping (a stricter global-uniqueness reading of the current inventory would also pass, since the numbers 1–50 don't currently repeat — so this schema is compatible with the data either way the stricter question in §6 is eventually resolved).
- **Variable practice steps**: the `jsonb` Practice Steps field (§7) imposes no min/max length — a 1-step card and a 6-step card are both representable without any schema change between them.
- **Visual assets**: artwork, hero image, supporting images, and demonstration sequences (§8) all have dedicated fields; Series 04 (Movement) and Series 05 (Touch/Sensory) — the two series explicitly described in the architecture as needing sequence/comparison imagery — are representable via `demonstrationSequence`/`supportingImages` without any series-specific schema branching.
- **Movement sequences**: Series 04's "hero photograph, movement arrows, sequence/frames, written instructions" maps to `heroImage` + `demonstrationSequence` (each frame's `instruction` field covers "written instructions" per-frame) — no gap identified.
- **Sensory comparison imagery**: Series 05's "large hero photograph, horizontal 3-image sensory demonstration" maps to `heroImage` + 3 entries in `supportingImages` (or `demonstrationSequence`, if the "comparison" framing is closer to sequence than to captioned supporting images — this is a content-entry judgment call, not a schema gap; the schema supports either interpretation).
- **Authored safety/gentle-note language**: `Gentle Note` (§7) is a dedicated field with explicit "preserve wording exactly" framing carried into its type choice (plain text, no Portable Text restructuring).
- **Anchors**: dedicated required field (§7).
- **Explicit ordering**: `sortOrder` at both Series and Card level (§5, §6), plus per-item `sortOrder` on every ordered array (§7, §8).

**No gap was found that would require a schema change to represent the 50 existing cards as described in the architecture.** This is a structural verification only — it does not confirm the schema matches the _actual_ unseen content of those 50 finished cards, since (per the prior relationship audit) no digitized copy of that content exists anywhere in this repository to check against directly.

---

## 19. Future Extensions (explicitly out of scope for this design)

- `somatic_card_saves` — structurally, this would be a direct twin of `practice_saves` (§9 of the task): `id`, `userId` (FK, cascade), `cardId` (FK to `somatic_cards.id`, cascade), `createdAt`, unique on `(userId, cardId)`. Not created now; documented here only because the task requires noting where it conceptually belongs.
- Collection as a real entity (§4) — a mechanical upgrade path from a string field to a document/table + reference, if a second collection is ever approved.
- Card search (architecture §14) — `jsonb` fields support Postgres full-text/GIN indexing without a schema change if this is built later.
- Card completion/reflection — explicitly out of scope per the architecture; no field or table hook for either exists in this design, intentionally.
- A `linkedPracticeId`-style optional relationship (architecture §10) — no such field is included in this design; the architecture describes it as optional and future, and no current requirement calls for it.
- Any relationship to PowerDrops — explicitly excluded per this milestone's locked product decisions; not modeled, not hinted at, no shared field of any kind.

---

## 20. Open Technical Questions

Only questions that genuinely cannot be resolved from the architecture or existing repository conventions as given:

1. **`cardNumber` uniqueness scope** (§6): scoped to `seriesId` in this design, but the current Core Series' own numbering (1–102 continuous across all 9 series) could reasonably argue for collection-wide uniqueness instead. Both are schema-compatible with the existing 50-card inventory (§18); the choice affects only how strictly future editorial numbering is constrained.
2. **`seriesId` FK delete behavior** (§6): `restrict` proposed, with no existing precedent in this codebase to confirm or contradict that choice — `cascade` or `set null` are both technically viable alternatives with different editorial implications (a Series delete either being blocked, silently deleting its Cards, or silently orphaning them into an invalid state that the `notNull` constraint would then have to reject anyway — meaning `set null` is actually incompatible with `seriesId` being `notNull`, and would require making it nullable, which has its own downstream implications for the "orphan Card" integrity check in §17).
3. **Sync race between Series and Card webhook events** (§12): reject-and-retry vs. allow-temporary-null-then-backfill — this is as much an editorial-workflow question (must Series always be published before their first Card?) as a technical one.
4. **`jsonb` vs. normalized child tables for ordered arrays** (§11): the single highest-leverage schema decision in this design; strongly justified by existing codebase precedent, but worth explicit confirmation before implementation given it's a foundational choice that's costlier to reverse later than most others here.
5. **Whether Series-level `visualTreatment`/`defaultLayout` should constrain or merely default Card-level values** — the architecture lists `visualTreatment` at both Series and Card scope implicitly (Series has `defaultLayout`, Cards have their own treatment per §9 of the architecture document) but doesn't fully specify the inheritance/override relationship between them. Not resolved here.

---

## 21. Recommended Next Implementation Milestone

**Confirm the two highest-leverage open questions (§20, items 1 and 4) with whoever owns the content/engineering decision, then produce the actual Drizzle migration + Sanity schema files as the first real implementation milestone** — everything else in this design (API, sync, web/mobile UI) is straightforward pattern-following once the Series/Card table shape and the ordered-content storage strategy are locked, and both of those are cheaper to get right before any code exists than after.

---

## Important Distinctions (restated per task requirement)

- **Somatic Cards ≠ Practices** — no shared table, no shared Sanity document type, no shared enum, no reused API route.
- **Somatic Cards ≠ PowerDrops** — no reference, no shared field, no migration path assumed or implied anywhere in this design.
- **PowerDrops ≠ Core Series** — reaffirmed per the locked product decision; this design creates no relationship between them.
- **Sanity = canonical content source** — every structured content field and every visual asset field originates in Sanity; Postgres is a synced read-optimized copy (`sanityId` + `sanityData jsonb` on every row, matching Practice's existing pattern).
- **Artwork ≠ structured content** — enforced structurally throughout (§7, §8, §16): every piece of structured content has its own field, independent of whether `cardArtworkUrl` is even populated.
- **Web/mobile = consumers of the canonical model** — one API contract (§14), one response shape (§15), no client-specific data model anywhere in this design.

---

## Appendix: Evidence Index

- `packages/db/src/schema/{practices,practice-saves,power-drop-usages,enums}.ts` (full reads)
- `packages/cms/src/schema/documents/{powerDrop,module,lesson,article}.ts` (full reads)
- `packages/cms/src/schema/objects/blockContent.ts` (full read)
- `packages/cms/src/schema/index.ts` (registration mechanics)
- `packages/cms/src/webhook/schema.ts`, `apps/web/src/app/api/webhooks/sanity/route.ts` (from the prior technical audit's direct evidence)
- `apps/web/src/lib/validation.ts` (schema conventions)
- `apps/web/src/lib/auth-api.ts` (`requireMemberAccess` — from prior audits)
- `packages/cms/src/lib/queries.ts` (GROQ query naming/projection conventions)
- `apps/web/src/app/api/v1/powerdrops/route.ts`, `.../[slug]/route.ts` (API contract shape reference)
- Prior audit documents in this repo: `docs/TNSI_Somatic_Card_Architecture_v1_Technical_Audit.md`, `docs/TNSI_PowerDrops_Somatic_Cards_Relationship_Audit.md` — findings from both carried forward and cited throughout rather than re-derived.
