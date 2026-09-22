# TNSI Somatic Card Sanity → Postgres Sync v1

Status: implemented, not yet registered in production. Scope: the
parallel Sanity→Postgres synchronization layer for `somaticSeries` and
`somaticCard` documents only — no API routes, UI, import tooling, or
production webhook registration are part of this milestone.

## 1. Architecture

A genuinely separate sync path from Practice's, not an extension of it:

- New endpoint: `POST /api/webhooks/sanity-somatic`
  ([route.ts](../apps/web/src/app/api/webhooks/sanity-somatic/route.ts)).
  Practice's route hardcodes its payload schema to `_type:
z.literal('practice')` with no internal type-routing, so Somatic gets
  its own endpoint rather than a modification of Practice's.
- New Zod schemas:
  [schema-somatic.ts](../packages/cms/src/webhook/schema-somatic.ts)
  (separate from Practice's `schema.ts`), importing shared array/enum
  schemas from `@tnsi/validation` rather than duplicating them.
- New pure decision logic:
  [sync-plan-somatic.ts](../packages/cms/src/webhook/sync-plan-somatic.ts)
  — `buildSomaticSeriesSyncPlan` (fully pure, mirrors Practice's
  `buildPracticeSyncPlan` shape) and `prepareSomaticCardSync` (pure
  extraction only; Card sync also needs a DB lookup to resolve its
  Series reference, so it can't be fully pure the way Series sync is).
- New impure execution layer:
  [sync-somatic.ts](../apps/web/src/lib/sync-somatic.ts) — `syncSomaticSeries`
  and `syncSomaticCard`, executing the plan against Postgres.

What is genuinely shared with Practice (content-agnostic infrastructure,
not Practice-specific logic):

- `@tnsi/db`'s `db` client.
- The HMAC-SHA256 webhook signature verification
  ([verify.ts](../packages/cms/src/webhook/verify.ts)) — not reinvented.

Nothing else is shared: no FK between `somatic_series`/`somatic_cards`
and `practices`/`power_drops`, no shared enum, no shared sync-plan type,
no shared table.

## 2. Endpoint

- **URL**: `POST /api/webhooks/sanity-somatic`
- **Secret**: `SANITY_SOMATIC_WEBHOOK_SECRET` — a distinct env var from
  Practice's `SANITY_WEBHOOK_SECRET`, so the two sync paths stay
  isolated from each other even if one secret is ever rotated or
  compromised. Placeholder added to `.env.example`; no real value
  committed.
- Listed in `apps/web/src/middleware.ts`'s `isPublicRoute` and
  `isIgnoredRoute` — same pattern as the Clerk/Sanity/Stripe webhooks.
  Clerk never intercepts it; the Sanity HMAC signature is the real auth.

See
[apps/web/src/app/api/webhooks/sanity-somatic/README.md](../apps/web/src/app/api/webhooks/sanity-somatic/README.md)
for the exact Sanity dashboard configuration (URL, filters, GROQ
projections) this endpoint expects once someone registers it.

## 3. Security

- Signature verification reuses `verifySanityWebhookSignature`/
  `SANITY_WEBHOOK_SIGNATURE_HEADER` unchanged — same HMAC-SHA256 over
  `${timestamp}.${rawBody}`, base64url, `timingSafeEqual`. No second
  cryptographic scheme introduced.
- The raw body is read once and passed to signature verification before
  JSON parsing — an invalid signature never reaches `JSON.parse` or any
  sync logic.
- Payload shape is validated via `sanitySomaticWebhookSchema`, a
  discriminated union on `_type` that rejects (400) anything that isn't
  literally `somaticSeries` or `somaticCard` — a Practice/PowerDrop/
  article payload delivered here by mistake never reaches sync logic.
- Logging is structured only: `documentType`, `sanityId`, `operation`,
  `outcome.status`. Never the raw payload, the webhook secret, or any
  credential.

## 4. Supported document types

`somaticSeries` and `somaticCard` only. Anything else is a 400 at the
schema-validation step.

## 5. Publication rules

Sanity's own draft/publish document identity (`drafts.<id>` prefix) and
this content's custom editorial `status` field (`draft`/`published`/
`archived`) are orthogonal signals, per the locked architecture:

| Sanity draft?          | Event has `document`?               | Editorial `status`                 | Result                                                                                                                                                      |
| ---------------------- | ----------------------------------- | ---------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Yes (`drafts.` prefix) | —                                   | —                                  | Skipped — never synced as the current read-model document, regardless of `status`.                                                                          |
| No                     | No (delete, or no document payload) | —                                  | Existing row archived (`status = 'archived'`). Never deleted.                                                                                               |
| No                     | Yes                                 | `draft` / `published` / `archived` | Upserted, with `status` written **verbatim** from Sanity. Sanity being published never implies editorial `status` is `published` — the two are independent. |

The Sanity-draft check is defensive and independent of the recommended
webhook filter (`!(_id in path("drafts.**"))`) — see
`normalizeSomaticSanityId`/the draft check in `sync-plan-somatic.ts`.

## 6. Series sync

`syncSomaticSeries` executes `buildSomaticSeriesSyncPlan`'s decision via
a single atomic `INSERT ... ON CONFLICT (sanity_id) DO UPDATE` (upsert)
or `UPDATE ... SET status = 'archived'` (archive) — same shape as
`syncPractice`, idempotent by construction, no select-then-branch race
window.

A Series is never deleted by this sync layer, under any event type
(including Sanity `delete`). This is what keeps
`somatic_cards.seriesId`'s `ON DELETE RESTRICT` foreign key safe — the
question of whether dependent Cards would block a Series delete never
arises, because this code never attempts one.

## 7. Card sync

`syncSomaticCard`:

1. Runs `prepareSomaticCardSync` (pure) to extract candidate values or
   determine archive/skip.
2. Resolves the Card's referenced Series by `sanityId` via a `SELECT`
   against `somatic_series`.
3. If no Series row exists yet: returns `{status: 'missing-series',
retryable: true}` — see §9.
4. If a Card row with this `sanityId` already exists: compares the
   **existing row's** `collection` against the **newly-resolved
   Series'** `collection` — see §8.
5. Runs the fully-assembled row through `somaticCardContentSchema`
   (final pre-persistence Zod gate — catches e.g. missing alt text on a
   present image, malformed ordered arrays) before any write.
6. Writes via a single atomic `INSERT ... ON CONFLICT (sanity_id) DO
UPDATE`, wrapped in try/catch to catch DB constraint violations as
   `{status: 'conflict'}` rather than throwing.

## 8. Collection integrity

`somatic_cards.collection` is denormalized from its Series specifically
so `(collection, card_number)` can be a real single-table Postgres
unique constraint. Postgres itself cannot enforce that the denormalized
value matches the referenced Series' `collection` (that would require a
cross-table constraint), so the sync layer is responsible for it.

The webhook payload's own `seriesCollection` field is **never trusted**
for this check — the sync layer always re-resolves the Series against
Postgres and uses that row's `collection` as authoritative, since the
Postgres row is the actual FK target and is guaranteed current relative
to whatever has already synced.

If a Card's newly-resolved Series `collection` disagrees with the
Card's existing Postgres row: **rejected** with `{status:
'collection-mismatch'}` → HTTP 409. Never silently repaired — this is a
CMS content authoring error (a Card was re-pointed at a Series in a
different collection) that needs correction at the source, not an
automatic overwrite that could mask a mistake.

## 9. Error handling

| Category                                     | Outcome status                        | HTTP | Retryable | Notes                                                                                                               |
| -------------------------------------------- | ------------------------------------- | ---- | --------- | ------------------------------------------------------------------------------------------------------------------- |
| Invalid/malformed payload                    | (schema rejects before reaching sync) | 400  | No        | Permanent until the payload is corrected.                                                                           |
| Invalid signature                            | —                                     | 400  | No        |                                                                                                                     |
| Assembled content fails final Zod validation | `invalid-content`                     | 400  | No        | Permanent until CMS content is corrected.                                                                           |
| Collection mismatch                          | `collection-mismatch`                 | 409  | No        | Permanent until CMS content is corrected.                                                                           |
| Referenced Series not yet synced             | `missing-series`                      | 503  | Yes       | Safe to retry — a later delivery of the same Card event resolves it once the Series has synced.                     |
| DB constraint violation at write time        | `conflict`                            | 409  | No        | A real data conflict (e.g. duplicate `(collection, card_number)`), not transient.                                   |
| Unexpected DB/runtime failure                | (thrown, caught at route level)       | 500  | Yes       | Genuinely unexpected only — validation and constraint failures are always returned as typed outcomes, never thrown. |

`sync-somatic.ts` functions never throw for expected failure modes —
they return a typed `SomaticSyncOutcome`. Throwing is reserved for
genuinely unexpected errors, caught at the route handler.

## 10. Idempotency

Every write is a single atomic `INSERT ... ON CONFLICT (sanity_id) DO
UPDATE` (Series) or the Card equivalent — receiving the same webhook
event more than once (Sanity's documented at-least-once delivery)
produces the same end state, not duplicate rows or duplicate side
effects.

## 11. Delete/unpublish behavior

A `delete` event, or any event with no `document` payload, archives the
existing row (`status = 'archived'`) rather than deleting it. Applies
to both Series and Cards. A document that never reached Postgres in the
first place is a safe no-op (nothing to archive).

## 12. Testing

### Unit tests (pure logic, no DB)

[sync-plan-somatic.test.ts](../packages/cms/src/webhook/sync-plan-somatic.test.ts)
— 15 tests covering `buildSomaticSeriesSyncPlan`/`prepareSomaticCardSync`
decision logic (draft skipping, archive-on-delete, upsert field mapping).
Run via `pnpm --filter @tnsi/cms test`.

### Integration tests (isolated Neon branch, real DB)

[sync-somatic.integration.test.ts](../apps/web/src/lib/sync-somatic.integration.test.ts)
— 29 tests against an isolated Neon test branch
(`ep-bold-sea-ay8wezwh...`, never production):

- **1–8, Series sync**: upsert, update-in-place, archive-on-delete,
  archive-on-no-document, Sanity-draft skip, invalid content rejected
  without a partial write, idempotent re-delivery, `sanityData` raw
  snapshot stored.
- **9–20, Card sync**: upsert with Series resolution, update-in-place,
  missing-Series → `missing-series`/retryable, collection-mismatch
  rejection, archive-on-delete, Sanity-draft skip, invalid content
  rejected without partial write, alt-text-missing rejection, duplicate
  `(collection, card_number)` → `conflict`, idempotent re-delivery,
  ordered-array (`practiceSteps`/`whatToNotice`) round-trip, image
  URL/alt round-trip.
- **21–24, Publication behavior matrix**: all four rows of the §5 table
  exercised directly.
- **25–27, Idempotency**: repeated identical events for Series, for
  Cards, and for an interleaved Series+Card sequence all converge to
  the same end state.
- **28–29, Isolation**: confirms Somatic sync never touches
  `practices`/`power_drop_usages` rows, and `assertNotProductionDatabase()`
  (a content-based check against the production host substring, run at
  module load before any test) proves the safety mechanism rejects a
  production-shaped connection string.

**Result**: `PASS (29) FAIL (0)`.

Run:

```
DATABASE_URL="<isolated Neon test branch URL>" pnpm --filter @tnsi/web exec vitest run src/lib/sync-somatic.integration.test.ts
```

Never run against `DATABASE_URL`/`DATABASE_URL_UNPOOLED` pointed at
production, per
[TNSI_Somatic_Card_Migration_Incident.md](./TNSI_Somatic_Card_Migration_Incident.md).

### Regression suites (unchanged code, confirmed still green)

- `@tnsi/cms test`: 33 passed (11 Practice sync-plan + 7 verify + 15 new
  Somatic sync-plan).
- `@tnsi/auth test`: 27 passed.
- `@tnsi/integrations test`: 30 passed.
- `@tnsi/db`, `@tnsi/validation`: no test script defined in either
  package (pre-existing state, not introduced by this milestone).
- `pnpm turbo run type-check`: 12/12 packages pass.
- `pnpm turbo run lint`: 0 errors; pre-existing warnings only, none in
  new Somatic sync files.

## 13. Production registration checklist

Not performed as part of this milestone. See
[apps/web/src/app/api/webhooks/sanity-somatic/README.md](../apps/web/src/app/api/webhooks/sanity-somatic/README.md)
§"Manual verification checklist" for the exact steps once someone
registers the webhook(s) in the Sanity dashboard and sets
`SANITY_SOMATIC_WEBHOOK_SECRET` in the production environment.
