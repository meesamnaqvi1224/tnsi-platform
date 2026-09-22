# TNSI Somatic Card Pre-Sync Readiness

## 1. Executive Summary

**Status: READY WITH GAPS.**

The production incident is fully documented and contained (zero content, zero side effects on any other table, migration byte-identical to the repository — see `docs/TNSI_Somatic_Card_Migration_Incident.md`). The database-targeting safety mechanism that caused it has been fixed and verified end-to-end against a genuinely isolated database, with production access now gated behind an explicit, per-command acknowledgment. Alt text is now required wherever a meaningful image is present, verified with runtime tests. The publication-state ambiguity flagged in the implementation audit has been resolved at the design level (not the schema level — see §6) by separating "does this sync at all" (Sanity's native state) from "what state does it land in" (the editorial `status` field), mirroring a pattern this codebase already uses for Practice sync.

The gaps keeping this from "READY FOR SYNC" outright are genuine but small: the alt-text requirement was only implementable at the Zod validation layer this milestone (the file-change limit didn't permit touching Sanity/Postgres schema), so Sanity Studio itself still won't _require_ alt text at authoring time yet, and there's no `isDecorative` escape hatch anywhere (not needed today — no image field in this architecture is decorative — but worth naming if that changes). Both are named, scoped, non-blocking follow-ups, not blockers.

## 2. Production Migration Incident

Full detail in `docs/TNSI_Somatic_Card_Migration_Incident.md`. Summary: migration 0009 was unintentionally applied to production instead of an isolated test branch, due to `packages/db/.env` setting `DATABASE_URL_UNPOOLED` to production and `drizzle.config.ts` checking that variable before the isolated-branch override that was actually intended. Re-verified as part of this milestone (read-only): production has `somatic_series`/`somatic_cards`, both with zero rows; the applied migration's recorded hash matches the repository's migration file byte-for-byte (`shasum -a 256` recomputed independently and compared); every pre-existing table's column count matches exactly what was expected before this migration, confirming nothing else was touched. No cleanup was performed or is recommended — the tables are empty, harmless, and correctly shaped for the eventual sync layer.

## 3. Database Targeting Safety

**Previous failure mode:** `drizzle.config.ts` resolved its connection as `DATABASE_URL_UNPOOLED || DATABASE_URL || <localhost>`. This precedence is intentional and correct on its own (unpooled connections are the documented right choice for DDL — see `.env.example`'s pre-existing "Optional: Unpooled connection for migrations" comment) — the actual problem was that `packages/db/.env` (gitignored, local-only) always sets `DATABASE_URL_UNPOOLED` to production, so any attempt to redirect migrations elsewhere by setting only `DATABASE_URL` was silently overridden.

**Root cause:** see `docs/TNSI_Somatic_Card_Migration_Incident.md` §2.

**Implemented safety improvement** (`packages/db/drizzle.config.ts`):

1. A new variable, `TNSI_TEST_DATABASE_URL`, is checked **before everything else**, including `DATABASE_URL_UNPOOLED`. Nothing in any gitignored `.env` file in this repository sets it, so an inline shell override always wins, unambiguously, every time — this is the one thing the previous mechanism couldn't guarantee.
2. If no explicit test URL is given and the resolved URL's host matches a known production-host fragment, `drizzle-kit` now refuses to run at all — it throws before ever attempting a connection — unless `ALLOW_PRODUCTION_DB_OPERATIONS=yes` is also explicitly set for that specific command.
3. Existing behavior is otherwise unchanged: `DATABASE_URL_UNPOOLED`/`DATABASE_URL` precedence, the localhost fallback, and every existing `db:generate`/`db:migrate`/`db:push`/`db:studio` script all work exactly as before when a developer isn't trying to target something other than the default.

**How to safely target an isolated database now:**

```
TNSI_TEST_DATABASE_URL="<isolated branch connection string>" pnpm --filter @tnsi/db db:migrate
```

No other variable needs to be set, and there is no way for a local `.env` file to silently interfere with this. `.env.example` was updated with the same guidance. No credentials appear in this report or were printed to the terminal in a way that exposed them — connection strings used during testing were passed directly as command arguments, never echoed back.

## 4. Migration Verification

Tested end-to-end against a genuinely fresh, isolated Neon branch (reset to a completely empty schema first), using **only** the new `TNSI_TEST_DATABASE_URL` mechanism — no manual `DATABASE_URL_UNPOOLED` workaround needed this time, unlike the implementation-audit turn:

- The intended (isolated) database was selected — confirmed by the resulting schema appearing there, not on production.
- Production was not touched — confirmed by a read-only production check immediately before and after this test, row/table counts identical (§9).
- Migration status was inspected safely via direct, read-only SQL queries against the isolated branch.
- The full migration sequence (0000 → 0009) ran successfully from an empty database with zero manual intervention.
- Migration 0009 applied successfully — `somatic_series`/`somatic_cards` present, `somatic_publication_status` enum present.
- Resulting schema matched the expected shape exactly: 11 tables, 27 columns on `somatic_cards`, 10 recorded migrations.

Migration 0009 was **not** run against production again at any point in this milestone.

## 5. Alt Text Model

**Locked direction:** meaningful visual assets require alt text; decorative imagery should be explicitly marked as such rather than silently missing alt text.

**Meaningful assets in this architecture:** card artwork, hero image, every supporting image, every demonstration frame — all four are described by the architecture as real content, never decoration. There is currently no decorative image type anywhere in the Somatic Card model.

**What was implemented, and why not more:** this milestone's file-change limit permits modifying "the existing validation schema" but not the Sanity or Postgres schema. Within that boundary, `packages/validation/src/somatic-cards.ts` now requires alt text wherever an image is genuinely required to exist:

- `somaticSupportingImageSchema`/`somaticDemonstrationFrameSchema`: `imageAlt` changed from optional to **required** — every item in these arrays already requires its `imageUrl`, so there is no case where one exists without the other now.
- `somaticCardContentSchema`: a new `.superRefine` requires `cardArtworkAlt` whenever `cardArtworkUrl` is present, and `heroImageAlt` whenever `heroImageUrl` is present — expressed this way because the requirement depends on a sibling field, which a flat per-field rule can't capture. A Card with no artwork/hero image at all still validates fine with no alt text required, correctly.

All of this was runtime-verified (not just type-checked): 6 cases covering "no image → no alt required," "image without alt → rejected," and "image with alt → accepted," across all three image locations, all passed.

**Remaining gap:** Sanity Studio itself doesn't yet enforce this at authoring time (its `alt` fields are still plain optional strings), and Postgres doesn't enforce it at the column level either (both `cardArtworkAlt`/`heroImageAlt` remain nullable `text`, matching the original implementation). The Zod layer is the one place this rule is actually enforced right now — which is exactly the layer a future sync handler would run content through before writing to Postgres, so it's a real, working guarantee for anything that goes through that path, just not yet a guarantee for someone editing directly in Sanity Studio with nothing downstream checking it. Closing that requires a Sanity + Postgres schema change, out of this milestone's scope (see §11).

**No `isDecorative` field was added anywhere** — there's no decorative image type in the current architecture to exempt, so inventing that field now (in only one layer) would have created a new three-layer inconsistency rather than resolving one. If a genuinely decorative image need ever arises, that field should be added to Sanity, Postgres, and Zod together, not incrementally.

## 6. Publication Model

**Design (not implemented — no schema was changed for this section):**

Sanity's native document publication state (whether a document exists as a real, non-draft document — i.e., has ever been Published in Studio) and the custom `status` field (`draft`/`published`/`archived`, the editorial lifecycle) are **not the same axis**, and this milestone resolves the ambiguity the implementation audit flagged by giving them distinct jobs rather than trying to unify them into one signal:

- **Sanity's native state answers: should this document sync at all?** This mirrors the existing Practice webhook's own convention exactly — its Sanity-side subscription filter is `_type == "practice" && !(_id in path("drafts.**"))`, meaning a document still sitting as an unpublished Sanity draft never even reaches the webhook handler, regardless of any field value inside it. The recommended design for the future Somatic Series/Card sync is the identical filter pattern. This makes the top half of the matrix below structurally unreachable by design, not just a documented preference.
- **The editorial `status` field answers: once admitted, what state does it land in?** `draft`/`published`/`archived` map directly to the three Postgres `somatic_publication_status` values, with the same visibility rule already established for the rest of this codebase's member-facing content: only `published` rows are ever returned to a member-facing API/page.

| Sanity document | Editorial status | Postgres state                 | Reachable via the recommended webhook filter?                                                                                                                                                                               |
| --------------- | ---------------- | ------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Draft           | draft            | Not synced                     | No                                                                                                                                                                                                                          |
| Draft           | published        | Not synced                     | No — Sanity's own draft state overrides the field value; a document that's never been Published in Studio doesn't exist as a real document yet, so there's nothing valid to sync regardless of what its `status` field says |
| Draft           | archived         | Not synced                     | No                                                                                                                                                                                                                          |
| Published       | draft            | Synced, `status = 'draft'`     | Yes                                                                                                                                                                                                                         |
| Published       | published        | Synced, `status = 'published'` | Yes                                                                                                                                                                                                                         |
| Published       | archived         | Synced, `status = 'archived'`  | Yes                                                                                                                                                                                                                         |

This directly answers Part 5's example: an editorially archived Card never requires deleting or unpublishing its Sanity document — archiving is purely a `status` field change on a document that stays fully Published in Sanity's own sense, syncing to Postgres `status = 'archived'` (never visible to members, never deleted, consistent with how Practice sync already avoids hard deletes for its own reasons).

**Defensive note for the future sync implementation:** even with the recommended webhook filter in place, a manual backfill script or a misconfigured webhook could theoretically still deliver a Sanity-draft payload. The sync handler should treat Sanity's draft state as an absolute admission gate regardless of the filter — if a payload's document is a draft, skip it, independent of whatever its `status` field claims. This is a recommendation for the sync milestone to implement, not something built now.

## 7. Collection Integrity

No schema change was made for this section, per instruction. The future sync invariant to document:

**`somatic_cards.collection` must always equal the `collection` of the `somatic_series` row referenced by its `seriesId`.** Nothing in the current schema enforces this automatically (Postgres has no cross-table constraint mechanism available here without a trigger, which no table in this codebase uses) — it is entirely the future sync layer's responsibility.

- **What happens if a Series' collection changes after Cards already exist:** nothing automatic. Existing Cards' `collection` values become stale relative to their Series until something re-syncs them — confirmed as a real, structural gap by the implementation audit, not resolved here.
- **Should Cards be updated when their Series' collection changes:** this is exactly the kind of question the future sync handler needs to answer procedurally (e.g., cascade-update every Card referencing that Series when the Series' `collection` changes) — a design decision for the sync milestone, not decided here.
- **Should Series `collection` become immutable after Cards exist:** a genuine open product/technical decision, not resolved here — either answer is schema-compatible with what exists today.
- **How should mismatches be reported:** not decided here. A future sync handler could reject a Card write whose derived `collection` doesn't match its Series (fail loudly), or could always overwrite `collection` from the Series at write time (making mismatches structurally impossible rather than merely detected) — the second option is the simpler, safer default and is what the schema design doc originally anticipated ("kept in sync by whatever future process upserts a Card row"), but this remains an implementation choice for the sync milestone.

## 8. Ordered Content

**Conclusion: `order` is presentation metadata, not an identity-bearing or uniqueness-required field. No constraint is being added, because none was found to be necessary.**

Reasoning: nothing in the schema, the API surface (not yet built), or any described rendering behavior treats a `practiceSteps`/`whatToNotice`/`supportingImages`/`demonstrationSequence` item's `order` value as a lookup key, a foreign key, or anything other than a sort hint. A duplicate `order` value within one array has exactly one consequence: an ambiguous tie when sorting for display, resolvable the same way this codebase already tolerates `sortOrder` ties at the Series/Card level (a stable secondary sort, e.g. by array position) — not a functional break, not a data-integrity violation, not a security concern. This is a genuine, consistent extension of a design choice already made and accepted earlier in this project (see the schema design doc's own reasoning on `sortOrder` ties), not a new judgment invented for this milestone.

If duplicate ordering ever becomes a real editorial pain point once content entry begins, a lightweight Sanity Studio custom validation warning (not a hard block) would be the appropriate, minimal future addition — not a Postgres constraint, since jsonb has no structural way to enforce uniqueness within an array short of a Postgres function-based check constraint, which would be a disproportionate amount of new complexity for a display-ordering nicety.

## 9. Production Safety Verification

Verified read-only, immediately before writing this report:

| Check                                     | Result                                                                                                                                                                                                                                                                                           |
| ----------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `somatic_series` row count                | 0 (unchanged since the incident report's check)                                                                                                                                                                                                                                                  |
| `somatic_cards` row count                 | 0 (unchanged)                                                                                                                                                                                                                                                                                    |
| `drizzle.__drizzle_migrations` row count  | 10 (unchanged — no new migration was run against production)                                                                                                                                                                                                                                     |
| `users` row count                         | 13 (unchanged)                                                                                                                                                                                                                                                                                   |
| `practices` row count                     | 5 (unchanged)                                                                                                                                                                                                                                                                                    |
| `power_drop_usages` row count             | 0 (unchanged)                                                                                                                                                                                                                                                                                    |
| Practice/PowerDrop schema or code changes | None — confirmed via `git status`; no file under `packages/cms/src/schema/documents/{practice,powerDrop}.ts` or any Practice/PowerDrop API/UI file appears as modified                                                                                                                           |
| Secrets added to the repository           | None — no `.env` file was created or modified; the only committed-file changes reference a database host _fragment_ (not a credential) for the safety check's own detection logic, and documentation explicitly instructing developers to pass connection strings inline, never to hardcode them |
| Unrelated files modified                  | None — `git status` shows only the files listed in §"Exact files changed" below, plus the pre-existing unrelated changes from earlier sessions (mobile Google sign-in work, prior audit docs), which were left untouched per instruction                                                         |

## 10. Remaining Blockers

None. The production incident is contained and documented, the targeting mechanism that caused it is fixed and verified, and nothing about the current schema or data state prevents building the sync layer safely.

## 11. Remaining Non-Blocking Gaps

- Alt-text requirement exists only at the Zod validation layer, not yet in Sanity Studio's own field validation or as a Postgres constraint — real for anything going through the future sync handler, not yet real for direct Sanity editing.
- No `isDecorative` escape hatch exists anywhere — not needed today (no decorative image type in this architecture), but should be added to Sanity + Postgres + Zod together, not incrementally, if that ever changes.
- `somatic_cards.collection` has no automatic consistency guarantee with its Series' `collection` — a sync-layer responsibility, not yet built.
- No duplicate-`order` safeguard exists — concluded not to be necessary (§8), but worth a lightweight Studio warning later if it becomes a real editorial issue.
- The publication-state design in §6 is a specification for the sync layer to follow, not yet enforced by any running code — it needs to actually be implemented correctly when that milestone happens.

## 12. Recommended Next Milestone

**Design and implement the parallel Sanity → Somatic Card/Series sync layer**, following the publication-state model in §6 (draft-state webhook filter as the admission gate, editorial `status` as the resulting Postgres state) and the collection-consistency approach named in §7 (deriving `collection` from the Series at write time, not trusting a value carried in the Card payload) as its starting design, both already reasoned through here rather than left for that milestone to rediscover from scratch.

---

## Exact Files Changed (this milestone only)

**New:**

- `docs/TNSI_Somatic_Card_Migration_Incident.md`
- `docs/TNSI_Somatic_Card_Pre_Sync_Readiness.md`

**Modified:**

- `packages/db/drizzle.config.ts` — added the `TNSI_TEST_DATABASE_URL` override and the production-targeting safety check.
- `.env.example` — documented the new variables and the safe way to target a test database.
- `packages/validation/src/somatic-cards.ts` — alt text required wherever a meaningful image is present (§5).

No other file was touched. No migration was created or run against production. No `.env` file was created, modified, or committed. No secret or credential value appears anywhere in this report or `docs/TNSI_Somatic_Card_Migration_Incident.md` — every connection string shown is either fully redacted or refers only to a non-production isolated test branch.
