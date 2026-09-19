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

## Manual verification checklist

Nothing in this repo can confirm the webhook is actually registered and
working — that only exists in the Sanity dashboard and production logs.
Before relying on it for real content entry, the project owner should walk
through this once:

1. Open `https://sanity.io/manage` → the TNSI project → **API** → **Webhooks**.
2. Confirm a webhook exists for practice content (any name is fine — check
   its configuration, not its label).
3. Confirm its **Filter** targets `practice` documents (matches the
   `_type == "practice"` filter in [Configuration](#configuration) above,
   ideally with the draft exclusion from [Draft exclusion](#draft-exclusion)).
4. Confirm the **URL** points at the real production endpoint —
   `https://thenervoussysteminstitute.com/api/webhooks/sanity` (not a
   preview/staging URL, not left as a placeholder).
5. Confirm a **Secret** is set on the webhook, and that the same value is
   set as `SANITY_WEBHOOK_SECRET` in the production environment (Vercel
   project settings → Environment Variables). You're only confirming both
   sides have _a_ value and that whoever set them used the same one —
   never paste the actual secret into a ticket, chat, or this file.
6. Confirm **Trigger on** includes Create, Update, and Delete (all three —
   missing Delete means unpublishing in Sanity silently stops reaching
   Postgres).
7. When ready to actually test live (not as part of routine review): publish
   or edit one throwaway test practice in Sanity Studio.
8. Confirm the corresponding row appears/updates in the Postgres `practices`
   table (e.g. via Drizzle Studio, `pnpm --filter @tnsi/db db:studio`, or a
   direct read-only query) — matching title/category/etc.
9. Confirm the practice shows up correctly in the app (Practice Library,
   then its detail page) on web and/or mobile.
10. Unpublish or delete the throwaway test practice in Sanity, and confirm
    it disappears from the Practice Library again (its Postgres row should
    remain, with `is_published = false` — see
    [Behaviour this endpoint implements](#behaviour-this-endpoint-implements)).
