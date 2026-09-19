# @tnsi/cms

Sanity client, generated types, and GROQ query helpers for editorial content.

## Practice content — authoring guide

This section is for whoever enters real practices into Sanity Studio
(Caroline / the content team), not for engineering changes. See
`apps/web/src/app/api/webhooks/sanity/README.md` for how a published
practice actually reaches the app (sync mechanism, webhook config,
manual-recovery script).

### Required fields

A practice can't be saved as a valid Sanity document without these:

- **Title**
- **Content Type** (see the six valid values below)

### Strongly recommended before publishing

A practice with only the required fields will save and sync, but will look
and behave incompletely in the app:

- **Description** — shown on the Library card and detail page; without it,
  those sections simply render blank, not broken, but bare.
- **Category** — without one of the five valid values below, this practice
  can never be matched by the capacity-based recommendation ("For This
  Moment") — it'll still appear in the general Practice Library, just never
  get personally recommended.
- **Duration** (seconds) — shown as "N min" in the meta line; omitted
  entirely if not set (never a fabricated estimate).
- **Media URL**, for any content type except `journal` — see the Media
  Contract below for exactly what URL formats actually play. Without one,
  the practice still saves and displays, but its player area shows "This
  practice isn't available yet" instead of anything playable.
- **Thumbnail URL** — used by the mobile Library card and practice-detail
  hero image. The web Library card does not currently display a thumbnail
  at all, so this matters for mobile specifically, not web.
- **Tags** — shown as small badges on the Library card; purely descriptive,
  no effect on recommendation or search filtering logic.
- **Difficulty** (1–3) — shown as "Level N"; defaults to 1 if left unset.

### Valid categories

Exactly five values are recognized by the capacity-based recommendation
engine (`packages/core/src/practices/recommendation.ts`). Use exactly these
(the Sanity Studio category field is a dropdown of these five — don't type
a free-form value via any path that bypasses that dropdown):

- `GROUNDING`
- `REGULATION`
- `CENTERING`
- `EMBODIMENT`
- `EXPANSION`

A practice with a category outside this list (or no category) simply never
gets personally recommended — it isn't an error, just silently ineligible.

### Valid content types

Exactly six values, also Studio-dropdown-controlled:

- `audio`
- `video`
- `meditation`
- `breathwork`
- `movement`
- `journal` (the only type with no media requirement — see below)

### Media contract

The app supports exactly two ways to provide playable media today. Nothing
else is currently implemented — see
[Unsupported providers](#unsupported-unless-explicitly-implemented) below.

**Supported audio** (`audio`, `meditation`, `breathwork` content types): a
directly playable public audio file URL (e.g. a `.mp3` URL your media host
serves without authentication), or a Google Drive share link (the app
rewrites it to Drive's embeddable preview automatically on web; on mobile
it opens in the browser instead, since native players can't embed a Drive
viewer page).

**Supported video** (`video`, `movement` content types): the same two
options — a directly playable public video file URL (e.g. `.mp4`), or a
Google Drive share link.

**Google Drive behavior specifics:** only these three link shapes are
recognized: `drive.google.com/file/d/<id>/...`, `drive.google.com/open?id=<id>`,
`drive.google.com/uc?...id=<id>`. Any other Drive URL shape, or a Drive
link that isn't shared publicly ("Anyone with the link"), will not embed
correctly.

**Unsupported unless explicitly implemented:** do not assume any of these
work, even though they're technically playable media — none has dedicated
handling in the app today, and pasting one in will fail to load (the
player will show a "couldn't be loaded" retry state, not a clear
explanation of why):

- YouTube links
- Vimeo links
- Any other arbitrary webpage URL that isn't a direct media file or a
  recognized Google Drive share link
- Sanity's own uploaded image/file assets (`mediaUrl`/`thumbnailUrl` are
  plain URL fields, not Sanity asset references — a Sanity-hosted asset
  URL has not been tested against the player and isn't guaranteed to work)
- Any authenticated/private media URL (the player fetches media directly,
  with no auth headers — it can only ever play something publicly
  reachable by anyone with the URL)
- Provider-specific streaming URLs (HLS/DASH manifests, signed/expiring
  URLs, etc.)

If real practice media will live somewhere other than a directly-public
file URL or Google Drive, that needs a dedicated implementation decision
first — not something to work around by pasting in a URL and hoping.

### `journal` practices

No media is required or expected. The player area is empty by design; only
title, description, tags, and the Mark Complete control render.

### Placeholder content — must be resolved before real member-facing launch

Four development placeholder practices currently exist in production,
**published and eligible for recommendation** (each one is a real,
`is_published = true` row with a valid recommendation category, so the
recommendation engine treats it exactly like real content — see
`packages/core/src/practices/recommendation.ts`):

- `[Placeholder] Grounding Practice` — category `GROUNDING`
- `[Placeholder] Centering Practice` — category `CENTERING`
- `[Placeholder] Embodiment Practice` — category `EMBODIMENT`
- `[Placeholder] Expansion Practice` — category `EXPANSION`

Each is explicitly self-labeled (title prefix, and description text
starting "PLACEHOLDER — not real content") and has no media. **Before real
members can be recommended these**, each one must either be replaced by a
real, approved practice in that category (published under a new/updated
Sanity document, which syncs and takes over) or unpublished in Sanity
Studio (flip its `status` to Draft) so it stops being recommended and stops
appearing in the Library. This is a deliberate manual content decision —
nothing in the code does this automatically, and nothing here changes that.
