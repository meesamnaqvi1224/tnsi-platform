# Sanity → Postgres Somatic Series/Card sync webhook

**Not registered in production as of this milestone.** This document
specifies the configuration this endpoint expects, for whoever registers
it later — nothing in this repository can register a Sanity dashboard
webhook itself.

A parallel, separate endpoint from `/api/webhooks/sanity` (Practice) —
that route's payload schema is hardcoded to Practice's shape with no
internal type-routing to extend, so Somatic Series/Card sync gets its own
endpoint rather than a modification of it. See
`docs/TNSI_Somatic_Card_Sync_v1.md` for the full design.

## Configuration

Two Sanity webhooks are needed — one per document type, so a Series edit
doesn't require re-processing every Card and vice versa — **or** one
webhook with a combined filter, delivering both event types to this same
endpoint (it discriminates by `_type` either way). Either is valid; two
separate webhooks give cleaner per-type delivery logs in the Sanity
dashboard.

- **URL**: `https://thenervoussysteminstitute.com/api/webhooks/sanity-somatic`
- **Dataset**: `production`
- **Trigger on**: Create, Update, Delete
- **Filter (Series)**: `_type == "somaticSeries" && !(_id in path("drafts.**"))`
- **Filter (Card)**: `_type == "somaticCard" && !(_id in path("drafts.**"))`
- **HTTP method**: `POST`
- **API version**: match `NEXT_PUBLIC_SANITY_API_VERSION`
- **Secret**: the value of `SANITY_SOMATIC_WEBHOOK_SECRET` — a
  **distinct** secret from `SANITY_WEBHOOK_SECRET` (Practice's), so the
  two sync paths stay isolated from each other. Generate one, put it in
  both the Sanity dashboard and the Vercel env var — never commit it.

## Projections

### Series

```groq
{
  "document": {
    seriesNumber,
    title,
    "slug": slug.current,
    collection,
    description,
    coreQuestion,
    visualTreatment,
    defaultLayout,
    status,
    sortOrder
  }
}
```

### Card

```groq
{
  "document": {
    cardNumber,
    title,
    "slug": slug.current,
    "seriesId": series->_id,
    "seriesCollection": series->collection,
    status,
    sortOrder,
    invitation,
    purpose,
    description,
    orientation,
    gentleNote,
    anchor,
    visualTreatment,
    "cardArtworkUrl": cardArtwork.asset->url,
    "cardArtworkAlt": cardArtwork.alt,
    "heroImageUrl": heroImage.asset->url,
    "heroImageAlt": heroImage.alt,
    "practiceSteps": practiceSteps[]{order, label, instruction},
    "whatToNotice": whatToNotice[]{order, text},
    "supportingImages": supportingImages[]{
      order,
      "imageUrl": image.asset->url,
      "imageAlt": image.alt,
      caption
    },
    "demonstrationSequence": demonstrationSequence[]{
      order,
      "imageUrl": image.asset->url,
      "imageAlt": image.alt,
      label,
      instruction
    }
  }
}
```

Image URL resolution (`asset->url`) matches the existing convention used
everywhere else images are queried in this codebase (see
`packages/cms/src/lib/queries.ts`'s `imageProjection` helper) — no new
asset/CDN mechanism.

`seriesCollection` is included in the projection for payload
completeness and future diagnostic use, but the sync layer does **not**
trust it for the collection-integrity check — it always re-resolves the
Series against Postgres and uses that row's `collection` as
authoritative, since the Postgres row is the actual FK target and is
guaranteed current relative to whatever has already synced (see
`docs/TNSI_Somatic_Card_Sync_v1.md` §8).

## Draft exclusion

Same reasoning as the Practice webhook: Sanity fires on draft edits too
unless explicitly filtered. The filters above exclude drafts at the
source. Defensively, the sync logic itself also checks `_id`'s own
`drafts.` prefix regardless of the filter (see `buildSomaticSeriesSyncPlan`/
`prepareSomaticCardSync` in `packages/cms/src/webhook/sync-plan-somatic.ts`)
— a Sanity-draft document is never synced as the current read-model
document, independent of what its own `status` field says.

## Behaviour this endpoint implements

See `docs/TNSI_Somatic_Card_Sync_v1.md` for the complete specification —
publication rules, collection integrity, idempotency, error categories.
Summary:

- **Published Sanity document**: syncs with its editorial `status`
  (`draft`/`published`/`archived`) written verbatim to Postgres — Sanity
  being published never implies editorial status is `published`.
- **Delete, or any event with no `document` payload**: sets the existing
  row's `status = 'archived'`. Never deletes — `somatic_cards.seriesId`
  is `ON DELETE RESTRICT`, and this endpoint never even attempts a
  Series delete for exactly that reason. A document that never reached
  Postgres is a safe no-op.
- **Card referencing a not-yet-synced Series**: rejected with HTTP 503,
  logged, safe to retry later (e.g. a subsequent webhook delivery of the
  same Card event) — never creates an orphan Card.
- **Card whose newly-resolved Series collection disagrees with its
  existing Postgres row**: rejected with HTTP 409 — never silently
  repaired.
- Every upsert is a single atomic `INSERT ... ON CONFLICT (sanity_id) DO
UPDATE` — safe to receive the same event more than once.

## Auth

Requests are verified via the same HMAC-SHA256 mechanism as the Practice
webhook (`packages/cms/src/webhook/verify.ts`) — proven, not reinvented.
This route is listed in `apps/web/src/middleware.ts`'s ignored routes so
Clerk doesn't intercept it; the Sanity signature is the real
authentication.

## Manual verification checklist (once registered)

1. Confirm the webhook(s) exist in Sanity Dashboard → API → Webhooks,
   targeting `somaticSeries`/`somaticCard`.
2. Confirm the URL points at the real production endpoint.
3. Confirm a Secret is set, matching `SANITY_SOMATIC_WEBHOOK_SECRET` in
   the production environment — confirm both sides have _a_ value, never
   paste the actual secret anywhere.
4. Confirm Trigger on includes Create, Update, and Delete.
5. Publish one throwaway test Series, then one throwaway test Card
   referencing it, in Sanity Studio.
6. Confirm the corresponding rows appear in Postgres (`somatic_series`/
   `somatic_cards`), correctly linked by `seriesId`.
7. Archive the test Card (`status: archived`) and confirm the Postgres
   row updates to `status = 'archived'` without being deleted.
8. Delete both throwaway Sanity documents, confirm both Postgres rows
   become `status = 'archived'` (not removed).
