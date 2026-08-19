# Sanity → Postgres practice sync webhook

Registering this webhook is a one-time action in the Sanity dashboard
(`https://sanity.io/manage` → project → API → Webhooks) — it can't be done
from this repository. This note documents the exact configuration this
endpoint expects. Verify field names against Sanity's current webhook docs
when setting it up; the shape below is this endpoint's contract, not
something read back from a live webhook.

## Configuration

- **URL**: `https://thenervoussysteminstitute.com/api/webhooks/sanity`
  (production domain — see `apps/web/src/lib/seo.ts` / `NEXT_PUBLIC_SITE_URL`)
- **Dataset**: `production`
- **Trigger on**: Create, Update, Delete
- **Filter**: `_type == "practice"`
- **HTTP method**: `POST`
- **API version**: match `NEXT_PUBLIC_SANITY_API_VERSION` (`2024-10-01`)
- **Secret**: the value of `SANITY_WEBHOOK_SECRET` (generate one, put it in
  both the Sanity dashboard and the Vercel env var — never commit it)

## Projection

Sanity's webhook envelope already includes `_id`, `_type`, and `operation`.
Set the webhook's **Projection** field to add the `document` field this
route expects:

```groq
{
  "document": {
    "title": title,
    "description": description,
    "contentType": contentType,
    "mediaUrl": mediaUrl,
    "thumbnailUrl": thumbnailUrl,
    "durationSeconds": durationSeconds,
    "category": category,
    "tags": tags,
    "difficulty": difficulty,
    "status": status
  }
}
```

## Draft exclusion

Sanity webhooks fire on draft edits too unless explicitly filtered out.
Add to the filter so only published-document events reach this endpoint:

```groq
_type == "practice" && !(_id in path("drafts.**"))
```

## Behaviour this endpoint implements

- **Create/update** (published, `status == "published"`): upserts the
  Postgres `practices` row, keyed on `sanityId` (atomic
  `INSERT ... ON CONFLICT DO UPDATE` — safe to receive the same event
  more than once).
- **Unpublish or delete**: sets `isPublished = false`. The row is **never**
  deleted — `practice_completions.practiceId` cascades on delete, so a hard
  delete would destroy member completion history. This also means a
  document that's never reached Postgres (e.g. deleted while still a draft)
  is a safe no-op.
- Defensive regardless of the filter above: if a payload's `document.status`
  is anything other than `"published"`, or `document` is missing, this
  endpoint deactivates rather than assuming the caller's filter is correct.

## Auth

Requests are verified via HMAC-SHA256 over `${timestamp}.${rawBody}`,
compared in constant time — see `packages/cms/src/webhook/verify.ts`. This
route is listed in `apps/web/src/middleware.ts`'s public/ignored routes
(alongside `/api/webhooks/clerk`) so Clerk doesn't intercept it; the Sanity
signature is the real authentication for this endpoint.

## Manual recovery

If a webhook delivery is missed, re-sync one document by id:

```bash
SANITY_WEBHOOK_SECRET=… node scripts/sync-practice.mjs <sanityId>
```

See `apps/web/scripts/sync-practice.mjs`.
