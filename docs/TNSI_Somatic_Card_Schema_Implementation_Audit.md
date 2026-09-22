# TNSI Somatic Card Schema Implementation Audit

**Type:** Read-only verification. No file was modified as part of this audit. All commands were read-only queries or ran against isolated Neon test branches created and controlled entirely within this audit — see §11 for the one exception, which is itself the audit's most important finding.

---

## 1. Executive Summary

**Status: APPROVED WITH GAPS** — but read this alongside a separate, critical operational finding before treating that as a green light.

**Critical, non-schema finding (full detail in §11):** while investigating the previously-reported "drizzle-kit migrate didn't apply on the test branch" issue, I discovered that migration `0009` was, in fact, silently applied to the **real production database** during the implementation milestone — not the isolated test branch it was believed to be running against. Root cause: `packages/db/.env` (gitignored, pre-existing, not created by this milestone) sets `DATABASE_URL_UNPOOLED` to production's direct-connection host, and `drizzle.config.ts` checks `DATABASE_URL_UNPOOLED` **before** `DATABASE_URL`. The implementation's migration-validation commands only ever set `DATABASE_URL`, so drizzle-kit silently ignored that override and connected to production instead every time. I have confirmed directly against production (read-only) that `somatic_series` and `somatic_cards` now exist there, with a `__drizzle_migrations` row timestamped to match. **This was not requested, not approved, and not something the previous implementation turn's report identified** — it believed it was testing in isolation.

The consequence is narrower than it sounds: the migration itself is purely additive (confirmed by re-deriving it from a genuinely fresh database — §11), no existing table or data was touched, and zero content exists in the new tables. But production schema has now drifted from what anyone explicitly approved, outside the normal change process, and that needs to be consciously acknowledged before this milestone is considered closed — not "fixed" by me, per this audit's own rules.

**On the schema/implementation itself**, independent of the above: the domain separation from Practices and PowerDrops is clean and verified with no exceptions found. The `(collection, card_number)` uniqueness and `ON DELETE RESTRICT` behavior both work exactly as specified, verified with real inserts/deletes on an isolated branch. The three real gaps are: (1) alt text is optional everywhere, contradicting the locked design doc's stated intent that it be required; (2) nothing at any layer (Sanity, Zod, Postgres) prevents duplicate `order` values within an ordered array; (3) the Sanity-native draft/publish mechanism vs. the custom `status` field creates a real ambiguity — inherited from this codebase's existing convention, not newly introduced, but real.

---

## 2. Architecture Conformance

| Requirement                                                | Status  | Evidence                                                                                                                                                                                                                                                           |
| ---------------------------------------------------------- | ------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| No FK to Practices                                         | ✅ Pass | `somatic-cards.ts`: only FK is `seriesId → somaticSeries.id`. `grep -n "practices" packages/db/src/schema/somatic-*.ts` — no match.                                                                                                                                |
| No FK to PowerDrops                                        | ✅ Pass | No `power_drop_usages` reference anywhere in either new table.                                                                                                                                                                                                     |
| No shared domain enum                                      | ✅ Pass | `somaticPublicationStatusEnum` is new and distinct from `practiceContentTypeEnum`/`postPracticeResponseEnum`/`entitlementStatusEnum` — confirmed by direct read of `enums.ts`.                                                                                     |
| No accidental content inheritance                          | ✅ Pass | Structured content fields (`invitation`, `purpose`, etc.) are new columns unique to `somatic_cards`; no reuse of `practices.description`/`practices.category` etc.                                                                                                 |
| Shared infrastructure reused appropriately                 | ✅ Pass | `sanityId`/`sanityData` pattern, `unique(...)`/`index(...)` naming convention, `text`/`jsonb`/`timestamp` column conventions — all copied from `practices.ts`'s existing pattern, not a new one invented. This is infrastructure-level reuse, not domain coupling. |
| Sanity documents registered without touching existing ones | ✅ Pass | `git diff packages/cms/src/schema/index.ts` shows only additive import + array-entry lines; `practice`, `powerDrop`, `article`, `module`, `lesson` entries untouched.                                                                                              |

No exceptions found in this section.

---

## 3. Collection Denormalization Audit

**A. Is the denormalization technically valid?** Yes. `somatic_cards.collection` is a plain `text NOT NULL` column, and `UNIQUE(collection, card_number)` is a standard single-table Postgres constraint — confirmed present in both the generated migration SQL and, functionally, by a real duplicate-insert rejection test on an isolated branch (§9).

**B. Does it create any immediate integrity risk?** Not to existing data (nothing references these tables yet). The risk is entirely about _future_ consistency: nothing prevents a row where `somatic_cards.collection` disagrees with `somatic_cards.seriesId`'s actual `somatic_series.collection` value. Verified by direct schema read: no `CHECK` constraint, no trigger, no generated column ties the two together.

**C. Can the future sync layer reliably maintain `card.collection === series.collection`?** Yes, _if_ the sync handler is written to always derive `collection` from the resolved Series row at write time rather than trusting whatever value arrives from Sanity's Card document directly. This is a code-discipline requirement, not something the schema can enforce — confirmed there is no schema-level backstop.

**D. What happens if a Series changes collection after Cards already exist?** Nothing automatic. Existing Cards' `collection` values would become stale (silently wrong) until something re-syncs them. Postgres would not reject the Series update, and would not reject continued reads/writes of the now-inconsistent Card rows — this is a real, confirmed gap, not a hypothetical.

**E. Should Series collection be immutable after publication?** This is explicitly a product/technical policy question, not something I'm resolving — flagged in §16 as a genuine open decision, not answered here.

**F. Can the future sync safely reject a Card whose collection does not match its Series?** Yes, technically — the sync handler can look up the Series' `collection` before writing the Card and compare/overwrite. This is straightforward application logic; nothing in the current schema blocks it.

**G. Is there a cleaner alternative that fits the current repository without triggers?** One real alternative exists and is worth naming, without recommending it: drop `collection` from `somatic_cards` entirely and enforce `card_number` uniqueness scoped to `seriesId` instead (`UNIQUE(seriesId, card_number)` — a single-table constraint requiring no denormalization). This would be a _stricter_ invariant than what was locked ("unique within Series" implies "unique within Collection" only if every Series in a Collection has disjoint card numbers, which is true today but not structurally guaranteed) — it does not satisfy the literal locked requirement ("unique within Collection," which the current design does), but it removes the sync-consistency risk in C/D entirely. This is a genuine tradeoff between the two, not a clear win either way, and is not a decision this audit is making.

---

## 4. Publication State Audit

**1. Does Sanity actually support the custom `status` field as implemented?** Yes — it's a plain `string` field with a `radio` list layout (`draft`/`published`/`archived`), functionally identical in mechanism to `powerDrop.status`/`module.status`/`lesson.status`, already proven to work in this codebase.

**2. Does Sanity also have its own native draft/publish mechanism?** Yes — every Sanity document type has this by default (a `drafts.<id>` shadow document exists while unpublished; the real document only exists once an editor clicks Sanity Studio's own "Publish" action). This is completely independent of the custom `status` field and was not disabled or connected to it anywhere in `somaticSeries.ts`/`somaticCard.ts` — confirmed by direct read; no `liveEdit` or draft-disabling config is present.

**3. Could a document be Sanity-draft + status:published, or Sanity-published + status:draft?** Yes to both, and nothing in this implementation prevents either combination. This is a direct, confirmed consequence of #1 and #2 being two entirely separate, unlinked mechanisms.

**4. Which is intended to be authoritative?** Not stated anywhere in the architecture, design doc, or this implementation. Genuinely undetermined.

**5. Would the future sync layer know whether a document should exist in Postgres?** Only if it's explicitly written to check one specific signal and ignore the other. The webhook payload conventionally includes the custom `status` field value directly (confirmed: `practice`'s existing webhook schema reads `document.status`, not Sanity's draft/published identity) — so the established codebase convention is "trust the custom field, ignore Sanity's native draft state." This is inherited precedent, not something this milestone invented, but it means a document sitting in Sanity-draft (never formally Published in Studio) with `status: 'published'` set would, by that existing convention, sync into Postgres as visible — which may not be the editorial intent.

**6. Is there ambiguity between CMS draft state, editorial status, and DB publication state?** Yes, precisely as described above. This is a real, confirmed three-way ambiguity. It is **not new to this milestone** — `powerDrop`/`module`/`lesson` already have the identical structure and the identical ambiguity — but it is real, and this milestone extends the same pattern rather than resolving it.

---

## 5. Structured Content Audit

`invitation`, `purpose`, `description`, `orientation`, `gentleNote`, `anchor` — all confirmed as plain `text`/`string` fields in Sanity and plain nullable `text` columns in Postgres (direct read of both schema files). None carry any clinical vocabulary, diagnostic code, taxonomy list, or nervous-system-state mapping — `orientation` in particular is genuinely free text with no `options.list`, confirmed by direct read (unlike `category` on `powerDrop`, which _is_ a controlled list — a deliberate, correct distinction). No field name, comment, or validation rule in either file references any clinical concept.

---

## 6. JSONB Audit

All four arrays (`practiceSteps`, `whatToNotice`, `supportingImages`, `demonstrationSequence`) follow the `practices.sanityData jsonb` precedent, confirmed as genuine existing precedent (not invented for this milestone) by direct comparison against `practices.ts`. Zod schemas exist for all four and were runtime-tested (not just type-checked) during the implementation turn per its own report; I independently re-read `somatic-cards.ts` in full this turn and confirm the schemas match the DB/Sanity shapes field-for-field. The model is explicit, not an untyped blob: every array item has a named, typed shape (`order`, `instruction`, `label`, etc.), not a bare `jsonb` column with no accompanying validator.

**Sufficiency for future layers:** API serialization and web/mobile rendering are both straightforwardly supported by a well-typed JSON array — no gap identified. Future Sanity sync is addressed in §3/§4 above; the JSONB shape itself imposes no obstacle to it.

---

## 7. Asset Model Audit

`cardArtworkUrl`/`cardArtworkAlt` and `heroImageUrl`/`heroImageAlt` are confirmed as fully independent column pairs (not one field doing double duty, unlike PowerDrop's single `cardImage`) — direct read of `somatic-cards.ts` confirms this. Artwork is not the sole content representation: every structured content field exists independently of whether any image field is populated, confirmed by all of them being independently nullable with no cross-field dependency.

**Accessibility gap identified:** alt text (`cardArtworkAlt`, `heroImageAlt`, and the `alt` subfield on every `supportingImage`/`demonstrationFrame` array item) is **optional at every layer** — Sanity (no `.required()` on any `alt` field, confirmed by direct read), Zod (`.optional()` on every `*Alt` field, confirmed by direct read), and Postgres (nullable `text`, confirmed by direct read). This is internally _consistent_ across all three layers, but it **contradicts the previous implementation turn's own stated design intent** — the schema design document explicitly said artwork alt text should be required "as the smallest enforceable guarantee" of the architecture's accessibility principle. As implemented, that guarantee does not exist. See §15, MEDIUM.

---

## 8. Validation Consistency

| Field/Rule                                    | Sanity                                              | Zod                                                                                             | Postgres                                          | Consistent?                                                                                                                                       |
| --------------------------------------------- | --------------------------------------------------- | ----------------------------------------------------------------------------------------------- | ------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| `title` required                              | ✅ `r.required()`                                   | ✅ `.min(1)`                                                                                    | ✅ `NOT NULL`                                     | ✅ Yes                                                                                                                                            |
| `slug` format                                 | Sanity `slug` type (no regex enforced)              | ✅ regex `^[a-z0-9]+(-[a-z0-9]+)*$`                                                             | Plain `text`, no format check                     | ⚠️ Partial — Postgres accepts any string; only Zod enforces the lowercase-hyphen shape                                                            |
| `seriesNumber`/`cardNumber` positive integer  | ✅ `.integer().positive()`                          | ✅ `.int().positive()`                                                                          | Plain `integer`, no `CHECK`                       | ⚠️ Partial — Postgres would accept 0 or a negative number if written outside the Zod-validated path                                               |
| `status` enum values                          | ✅ fixed 3-item `options.list`                      | ✅ `z.enum([...])`, literal-duplicated                                                          | ✅ Postgres `ENUM` type                           | ✅ Yes (values match exactly across all three, confirmed by direct comparison)                                                                    |
| `visualTreatment` enum values                 | ✅ fixed 5-item `options.list`                      | ✅ `z.enum([...])`, literal-duplicated                                                          | Plain `text`, no constraint                       | ⚠️ Partial — Postgres accepts any string; deliberate per the design doc (§7 rejected a DB enum), so this is a documented choice, not an oversight |
| Card `series` reference required              | ✅ `r.required()`                                   | ✅ `z.string().uuid()` (no `.optional()`)                                                       | ✅ `NOT NULL` FK                                  | ✅ Yes                                                                                                                                            |
| Ordered-array item `order` required           | ✅ `r.required().integer().min(0)`                  | ✅ `.int().min(0)` (no `.optional()`)                                                           | N/A — inside `jsonb`, no column-level enforcement | ⚠️ Partial — jsonb has zero structural enforcement; correctness depends entirely on the writer using the Zod schema                               |
| Duplicate `order` values within one array     | Not prevented (no array-level uniqueness validator) | Not prevented (no `.refine()` for uniqueness)                                                   | Not prevented (jsonb)                             | ⚠️ **Consistent gap** — all three layers equally permit it; see §9                                                                                |
| Alt text required                             | Optional                                            | Optional                                                                                        | Nullable                                          | ✅ Internally consistent, but see §7/§15 for why this consistency itself is the finding                                                           |
| `collection` matches its Series' `collection` | Not checked (no reference-aware validation)         | Not checked (`somaticCollectionSchema` validates shape only, not cross-referential correctness) | Not checked (no FK-aware constraint)              | ⚠️ **Consistent gap** — see §3                                                                                                                    |

No case was found where one layer is _stricter_ than another in a way that would cause a valid-per-one-layer, rejected-by-another conflict (e.g., nothing Zod permits that Postgres would reject, or vice versa) — the disagreements found are all "some layers enforce a rule the others don't," not contradictions.

---

## 9. Database Constraint Audit

Verified directly against an isolated Neon branch with real inserts (not just static SQL reading):

- **`(collection, card_number)` UNIQUE**: confirmed present in migration SQL, confirmed present in live schema (`pg_constraint` query), confirmed functionally — a duplicate insert was rejected with the exact expected constraint name (`unique_somatic_cards_collection_card_number`).
- **NULL behavior**: `collection` and `card_number` are both `NOT NULL`, so Postgres's usual "NULLs don't conflict in a unique constraint" caveat never applies here — every row has a real value in both columns, confirmed by the `NOT NULL` markers in the migration SQL.
- **`series_id → somatic_series.id`, `ON DELETE RESTRICT`**: confirmed present in the generated SQL (`ALTER TABLE "somatic_cards" ADD CONSTRAINT ... FOREIGN KEY ("series_id") REFERENCES "public"."somatic_series"("id") ON DELETE restrict`), confirmed present in live database metadata, confirmed functionally — a Series delete while a referencing Card existed was rejected with the exact expected error.
- **Appropriateness for editorial lifecycle**: `RESTRICT` forces an explicit decision (re-parent or archive the Cards first) rather than silently cascading or silently orphaning — consistent with the locked instruction that deletion isn't the normal editorial lifecycle. No issue found.

---

## 10. Migration Audit

Direct read of `0009_add_somatic_series_and_cards.sql` confirms:

- Purely additive: `CREATE TYPE`, two `CREATE TABLE IF NOT EXISTS`, one `ALTER TABLE ... ADD CONSTRAINT`, four `CREATE INDEX IF NOT EXISTS`. **No `ALTER`/`DROP` touching any existing table** — confirmed by full-file read, no `practices`/`users`/`power_drop_usages`/etc. table name appears anywhere in this migration file.
- Enum creation uses the same `DO $$ BEGIN ... EXCEPTION WHEN duplicate_object THEN null; END $$;` guard as every prior enum-creating migration (compared directly against `0005`/`0008`).
- Table creation order is correct: `somatic_series` before `somatic_cards`, so the FK target exists before the FK is added.
- FK creation is deferred to its own guarded statement after both tables exist — matches `0008`'s exact pattern for `practice_saves`' two FKs.
- Indexes and unique constraints match what's declared in the Drizzle schema files, confirmed by direct line-by-line comparison.
- `jsonb` defaults (`'[]'::jsonb`, cast syntax) are valid Postgres syntax — confirmed by successful application against a real database in §11's test.
- Nullable fields match the intended design: only fields explicitly marked optional in the design doc/Sanity schema are nullable in Postgres (confirmed field-by-field against `somatic-cards.ts`).

---

## 11. Drizzle-Kit Migration Investigation

**Concrete conclusion: the migration file is correct and fully reproducible. The original failure was caused by an environment-variable precedence bug in the invocation, which — critically — also caused that invocation to silently apply the migration to production instead of the intended isolated branch.**

**Root cause, precisely:**

1. `packages/db/.env` (pre-existing, gitignored, not created by this or any prior milestone in this session) sets `DATABASE_URL_UNPOOLED` to production's direct-connection Neon host.
2. `drizzle.config.ts` resolves its connection as `process.env.DATABASE_URL_UNPOOLED || process.env.DATABASE_URL || <localhost fallback>` — `DATABASE_URL_UNPOOLED` takes precedence.
3. `drizzle-kit` auto-loads `.env` from the package directory before evaluating the config (confirmed by the file's own header comment: "Read automatically by drizzle-kit").
4. The implementation turn's migration commands set `DATABASE_URL=<isolated test branch>` inline but never set `DATABASE_URL_UNPOOLED`. Since that variable was never set by the shell, dotenv's default "don't override an existing value" behavior had nothing to preserve — it filled `DATABASE_URL_UNPOOLED` from the file, which pointed at production, and that value won.

**Direct evidence this actually happened:** a read-only query against production's real `DATABASE_URL` (from `apps/web/.env.local`) confirms `somatic_series` and `somatic_cards` exist there right now, and production's `drizzle.__drizzle_migrations` table has a row (`id: 10`, timestamp `1790053803669`) matching migration 0009's journal timestamp exactly.

**Is the issue journal/hash/snapshot/CLI-related?** No — I re-tested by creating a brand-new, genuinely empty Neon branch and running `drizzle-kit migrate` with **both** `DATABASE_URL` and `DATABASE_URL_UNPOOLED` explicitly set to that branch. Result: all 10 migrations (0000–0009) applied cleanly in sequence, producing the exact expected 11-table schema with no errors. This proves the migration file, the journal, and the snapshot metadata are all correct — the defect was entirely in how the isolated-branch override was attempted, not in anything committed to the repository.

**Can the normal repository workflow apply 0009 cleanly from a fresh database?** Yes, confirmed directly, per the test above.

**Does the migration metadata correctly correspond to the SQL?** Yes — the fresh-branch test is definitive proof: metadata and SQL together produced the correct final schema with no manual intervention.

**Is there risk to a future real migration run?** The migration file itself: no. The workflow: **yes, materially** — anyone running `drizzle-kit migrate`/`db:migrate` from `packages/db` without an explicit awareness of `DATABASE_URL_UNPOOLED`'s precedence will hit production by default, every time, silently, regardless of what `DATABASE_URL` they think they've set. This is a standing footgun independent of this specific milestone, now confirmed to have already caused one unintended production write.

---

## 12. Sanity Schema Audit

- Both `somaticSeries` and `somaticCard` are registered in `packages/cms/src/schema/index.ts` — confirmed by direct read, additive only.
- No existing document schema file (`practice.ts`, `powerDrop.ts`, `article.ts`, `module.ts`, `lesson.ts`, `author.ts`, `category.ts`) shows any diff — confirmed via `git status`/`git diff`, none of these files appear as modified.
- `packages/cms/src/structure.ts` correctly references `somaticSeries`/`somaticCard` by their exact registered `name` values — confirmed by direct string comparison against the `defineType({ name: ... })` calls in both schema files.
- Schema names (`somaticSeries`, `somaticCard`) are unique within the registry — confirmed, no collision with any existing document or object type name.
- No circular imports: `somaticCard.ts` does not import `somaticSeries.ts` (it references it only by the string type name `'somaticSeries'` inside `to: [{ type: 'somaticSeries' }]`, Sanity's normal reference mechanism, not a TypeScript import) — confirmed by direct read of the file's import statements.
- `pnpm --filter @tnsi/cms exec tsc --noEmit` — re-run during this audit, clean, no errors.

---

## 13. Practice / PowerDrop Isolation

Confirmed by direct `grep` across both new Postgres schema files and both new Sanity schema files for the strings `practice`, `Practice`, `powerDrop`, `PowerDrop`, `power_drop` — the only matches are inside doc comments explicitly _describing the separation_ (e.g., "distinct from `practices`' `isPublished` boolean," "no field here references either"), never in actual field definitions, imports, or FK targets. No accidental reuse of `practiceContentTypeEnum` or `postPracticeResponseEnum` — `somatic_cards`/`somatic_series` reference only the new `somaticPublicationStatusEnum`. No accidental reuse of PowerDrop's content model — PowerDrop's `cardImage`-does-double-duty pattern was explicitly _not_ replicated (§7).

---

## 14. Content Integrity

Confirmed via the same production/test-branch queries used for §11: zero real Card content, zero invented Card content, zero Core Series seed records exist anywhere. The only rows ever written to either table were the implementation turn's own temporary validation inserts (one test Series, one test Card, both explicitly deleted immediately after — confirmed by their absence in every subsequent count query in this audit) and, per §11, the schema itself now silently exists on production with **zero rows in either table** — confirmed directly.

---

## 15. Issues Found

| Severity          | Issue                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| ----------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **BLOCKER**       | Migration 0009 was silently applied to the real production database during the implementation milestone, due to an environment-variable precedence footgun (`DATABASE_URL_UNPOOLED` in `packages/db/.env` overriding an intended isolated-branch `DATABASE_URL` override). Production schema now differs from what was explicitly approved, outside the normal change process. The DDL itself is harmless (additive, empty tables, no data touched) but this must be consciously acknowledged, not silently left as-is, before the milestone is considered closed. |
| **MEDIUM**        | Alt text (`cardArtworkAlt`, `heroImageAlt`, and per-item `alt` on supporting images/demonstration frames) is optional at every layer, contradicting the previous milestone's own stated design intent that it be required as an accessibility guarantee.                                                                                                                                                                                                                                                                                                           |
| **MEDIUM**        | The Sanity-native draft/publish state and the custom `status` field are two independent, unlinked mechanisms with no defined precedence — a document could be Sanity-draft with `status: published` (or vice versa) and nothing prevents or flags it. Inherited from existing `powerDrop`/`module`/`lesson` convention, not newly introduced, but real and unresolved.                                                                                                                                                                                             |
| **LOW**           | Nothing prevents duplicate `order` values within a single `practiceSteps`/`whatToNotice`/`supportingImages`/`demonstrationSequence` array, at the Sanity, Zod, or Postgres layer. Consistent with this codebase's existing tolerance for `sortOrder` ties elsewhere (treated as a CMS-editorial concern, not a hard error), so likely acceptable, but worth an explicit decision rather than a silent default.                                                                                                                                                     |
| **LOW**           | `somatic_cards.collection` can drift from its `seriesId`'s actual `collection` value with no schema-level safeguard; correctness depends entirely on sync-layer discipline (§3).                                                                                                                                                                                                                                                                                                                                                                                   |
| **LOW**           | Card number/series number positivity and slug format are enforced by Zod but not by a Postgres `CHECK` constraint, so a write path that bypasses Zod (e.g., a manual SQL fix, or a future code path that forgets to validate) could insert a zero/negative number or a malformed slug.                                                                                                                                                                                                                                                                             |
| **INFORMATIONAL** | `visualTreatment` is intentionally unconstrained at the Postgres level (plain `text`, no enum/check) — this is a documented, deliberate design choice from the prior milestone, not an oversight, and is only listed here for completeness in the validation-consistency comparison.                                                                                                                                                                                                                                                                               |

---

## 16. Required Changes Before Sync

Only genuine prerequisites — not a general to-do list:

1. **The production incident (§11/§15 BLOCKER) needs an explicit decision**, not a silent pass: whether to keep the now-existing production tables (they're empty and harmless) as the de facto record of this migration having shipped, or handle it some other way. This is a decision for whoever owns production changes, not something to resolve automatically.
2. **A safe, correct way to target an isolated database for future migration testing** needs to exist before the sync layer is built and needs its own testing cycle — the current `packages/db/.env` + `drizzle.config.ts` precedence means "isolated testing" silently doesn't work today unless both `DATABASE_URL` and `DATABASE_URL_UNPOOLED` are explicitly overridden every time.
3. **A decision on alt-text enforcement** (§7/§15 MEDIUM) — if required alt text is still wanted, the schema needs a follow-up change (not made here) to actually enforce it.
4. **A decision on the Sanity-draft-vs-status ambiguity** (§4/§15 MEDIUM) — the sync layer's design needs to explicitly state which signal it trusts, since both are currently possible and unlinked.

---

## 17. Recommended Next Milestone

**Resolve the production-incident decision and the isolated-testing-workflow gap (§16, items 1–2) before starting the Sanity → Database sync milestone** — building and testing a sync layer against a workflow that's already been proven to silently default to production is a materially higher-risk next step than it would otherwise be, and both items are fast to close once someone with the right authority makes the call.

---

## Appendix: Evidence Index

Every file listed as "changed" by the implementation was re-read in full during this audit (not assumed from the prior report): `packages/db/src/schema/{somatic-series,somatic-cards,enums,index}.ts`, `packages/cms/src/schema/documents/{somaticSeries,somaticCard}.ts`, `packages/cms/src/schema/index.ts`, `packages/cms/src/structure.ts`, `packages/validation/src/{somatic-cards,index}.ts`, `packages/db/drizzle/0009_add_somatic_series_and_cards.sql`, `packages/db/drizzle/meta/{_journal.json,0009_snapshot.json}`, compared directly against `0005_chemical_groot.sql`/`0008_gigantic_deathstrike.sql` for convention consistency. `git diff`/`git status` run against every modified file, not inferred from filenames. Live, read-only queries run against: production (`apps/web/.env.local`'s `DATABASE_URL`, read-only table/migration-row checks only), the pre-existing `preview-testing` isolated branch (unused this turn), and a newly created, fully isolated `audit-fresh-test` Neon branch (reset to empty, then used for the full 0000→0009 reproducibility test) — no write ever touched production beyond the read-only confirmation queries in this audit.
