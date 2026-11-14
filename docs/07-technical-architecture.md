# 07 — Technical Architecture

> Status: Stack decided — see [`ARCHITECTURE.md`](../ARCHITECTURE.md), the
> canonical record of architecture decisions with rationale. This document
> holds material from the founding Technical Architecture & System Design
> doc and CMS & Database Blueprint doc that `ARCHITECTURE.md` doesn't cover
> (performance/security/SEO targets, content/data model, deployment
> pipeline, scalability roadmap) plus a note on where the founding doc's
> recommendations were superseded.

## Guiding principles

- Fast, secure, SEO-first, mobile-first, API-driven, component-based,
  CMS-powered, AI-ready, scalable.
- Every architectural decision should make it easier — not harder — to add
  future products, AI capabilities, practitioner tools, corporate
  services, and mobile applications without a rebuild.
- Build reusable components; avoid duplicated logic; separate presentation
  from business logic; keep integrations modular; optimise for
  maintainability over speed of initial development.

## Stack decisions — see ARCHITECTURE.md

`ARCHITECTURE.md` is canonical. Where the founding technical-architecture
doc's recommendations matched what was ultimately decided (Next.js, React,
TypeScript, Tailwind, shadcn/ui-style components, Sanity, Clerk, Stripe,
Vercel, OpenAI, Flowi), no further action is needed. One difference worth
recording:

- The founding doc frames `packages/ui` as "shadcn/ui" directly; the
  decided implementation (Sprint 3) uses hand-written components following
  shadcn conventions with `@base-ui/react` primitives, not the shadcn CLI —
  see [08-design-system.md](./08-design-system.md) for why.
- Media/CDN (Cloudinary vs. Sanity's own asset CDN) is **not yet decided**
  — add to `ARCHITECTURE.md`'s open items when it comes up.
- Error monitoring (Sentry) and a second analytics tool (Microsoft Clarity,
  alongside whatever's chosen for `packages/analytics`) were recommended
  in the founding doc but aren't yet in `ARCHITECTURE.md`'s open items —
  worth folding in when the analytics vendor decision happens.

## Content & data model

From the founding CMS & Database Blueprint doc — the conceptual content
relationships referenced at a high level in
[04-information-architecture.md](./04-information-architecture.md),
detailed here as the basis for actual Sanity schema work in `packages/cms`.

**Core content types** (each needs `id`, and most need `seo`/timestamps —
see SEO model below): Author, Article, Program, Testimonial, Webinar,
Podcast, Assessment.

Representative fields (not exhaustive — finalize against `packages/cms`
schema work):

- **Author** — name, slug, photo, designation, bio, socialLinks, featured.
- **Article** — title, slug, excerpt, coverImage, body, category, author,
  tags, seo, featured, published, readingTime, relatedArticles,
  relatedPrograms.
- **Program** — title, slug, overview, heroImage, duration, modules,
  pricing, faq, cta, seo, status.
- **Testimonial** — name, photo, company, program, quote, video, rating,
  featured.
- **Webinar** — title, slug, description, speaker, date, time, duration,
  broadcast link, replay, resources, registrationUrl.
- **Podcast** — title, episode, platform links (Spotify/Apple/YouTube),
  transcript, show notes, resources.
- **Assessment** — title, questions, logic, results, recommendation,
  emailSequence, crmPipeline.

**Relationships are the point** — content is relational, not a flat page
tree:

```
Author → writes → Article → belongs to → Category
                              → references → Program → contains → Resources
```

**Taxonomies:**

- **Topics:** Capacity, Leadership, Burnout, Relationships, Performance,
  Trauma, Regulation, Stress.
- **Audience:** Women, Leaders, Therapists, Members, Executives.
- **Content type:** Article, Podcast, Video, Course, Assessment,
  Framework, Worksheet, Meditation.

**SEO model** — every document needs: `seoTitle`, `seoDescription`,
`canonical`, `ogImage`, `keywords`, `schema`, `robots`. No page ships
without this (see Engineering rules in `CLAUDE.md`).

**Media model** — Image, Video, PDF, Audio, plus `transcript`, `caption`,
`altText` per asset.

**Internal linking** — every article shows Related Articles, Related
Program, Related Podcast, Related Assessment, Related Webinar. This is
what creates SEO topical authority (see
[06-feature-specification.md](./06-feature-specification.md) §SEO
architecture) and is also what makes an eventual AI guide tractable: it
reads structured, related content rather than crawling rendered HTML.

### Interactive practices

Most practices are media (audio/video) or journal prompts. An
**interactive** practice is a client component the member uses directly —
the first is The Return Path, a labyrinth breathing practice (decision log
in `PROJECT.md`, 2026-10-12).

- **Content type.** `interactive` is a value of the `practice_content_type`
  enum, mirrored in the Sanity `practice.contentType` list and the webhook
  validation list. The practice row has no `mediaUrl`; `interactiveKey`
  (Sanity field + `practices.interactive_key` column) names the component
  to render. The member practice page switches on `interactiveKey`; an
  unknown key renders the existing "not available yet" notice.
- **Copy is separate from the practice row.** Each interactive practice
  keeps its on-screen copy in its own Sanity singleton (The Return Path:
  `returnPathContent`), read server-side with the code copy as fallback.
  Geometry, timings' structure and level access stay in code.
- **Two contexts, one component.** A `context` prop (`public` | `member`)
  changes only the wrapper, the levels allowed and the ending. Public
  completions are never stored; member completions use
  `POST /api/v1/practices/[id]/complete`, like any other practice.
- **Analytics** go to GA4 through `gtag`; **email capture** goes through a
  server route to Flowi (`upsertFlowiContact`), never from the browser.

### My Reflections (private journal)

A member's private writing lives in its own table, `journal_entries` (migration 0014), separate from
`practice_reflections` (the quick post-practice check-out, unchanged). Postgres stores the private text;
Sanity will later hold the editorial prompts. Routes: `GET/POST /api/v1/journal/entries`,
`GET/PATCH/DELETE /api/v1/journal/entries/:id`; account deletion `DELETE /api/v1/me/account`, which
permanently purges the journal. Every journal response is `private, no-store`; ownership is enforced in
the server's queries; journal text is never logged, never in a URL, never in analytics (GA4 excludes
`/dashboard/reflections`), and never sent to Flowi or any third party. Full schema, API contract,
ownership and privacy model, the account-deletion sequence and its failure recovery, and known
limitations: [my-reflections-backend.md](./my-reflections-backend.md).

## Performance requirements

Google Lighthouse: Performance, Accessibility, SEO, and Best Practices all
**>95**. Core Web Vitals: LCP < 2.5s, CLS < 0.1, INP < 200ms.

## Accessibility

WCAG AA minimum. Keyboard navigation, screen reader support, visible focus
states, colour contrast compliance, large tap targets, readable
typography. See [08-design-system.md](./08-design-system.md) for how
`packages/ui` operationalizes this today.

## Security

HTTPS everywhere, Content Security Policy, rate limiting, CSRF/XSS
protection, role-based permissions, encrypted authentication, environment
variables for all secrets, secure webhooks.

## Search architecture

**Phase 1:** keyword search, filters, categories, tags. **Phase 2:**
semantic AI search, natural-language queries, personalised results,
learning recommendations.

## Logging & monitoring

Vercel Analytics, an analytics tool (GA4 and/or Microsoft Clarity — vendor
not finalized, see `ARCHITECTURE.md` open items), Sentry for error
monitoring, uptime monitoring, webhook logs, CRM sync logs.

## Backup strategy

Sanity content backup, GitHub repository, environment backup, weekly
deployment snapshots.

**Postgres (Neon) — measured 14 Nov 2026, read from the Neon API (read-only):**

| Fact                                      | Value                                                                                                                       |
| ----------------------------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| Neon organisation plan                    | **Free** (as reported by `neonctl orgs list`)                                                                               |
| Point-in-time restore window (production) | **21,600 seconds = 6 hours** (`history_retention_seconds` on project `mute-cherry-69840088`)                                |
| Scheduled backups / snapshots             | None configured. The only recovery beyond the 6-hour window is a **manual branch**.                                         |
| Manual backup branch currently present    | `pre-migration-0013-backup-2026-11-11` (created 11 Nov, unprotected, still holding a copy of production data from that day) |
| Region of the production database         | `aws-us-east-2` (United States)                                                                                             |

Consequences that matter for privacy and deletion:

- Deleting rows removes them from the live database at once. They remain recoverable from Neon's restore
  history for up to **6 hours**, and **indefinitely in any manual backup branch until that branch is deleted**.
  A manual branch is therefore a second copy of member data that account deletion does not reach.
- Backup branches taken **before** migration 0014 contain **no** journal entries (the table does not exist
  yet). A branch taken **after** the journal launches would hold members' reflections, so every such branch
  needs an owner, an expiry date and a deletion step.
- The 6-hour window is short for disaster recovery. A longer window is a paid-plan decision for the owner.

Rule: every manual backup branch is recorded here with its purpose and a delete-by date.

## Production databases and what connects to them (14 Nov 2026)

Neon organisation: **The Nervous System Institute** (`org-mute-sunset-53867425`), three projects:

| Neon project (id)                                      | Region    | Purpose                                                                                                                                         |
| ------------------------------------------------------ | --------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| `mute-cherry-69840088`, named **"tnsi-development"**   | us-east-2 | **PRODUCTION.** Primary branch `production`, endpoint `ep-damp-flower-ayp7i2gc`. Misleadingly named.                                            |
| `purple-queen-31396386`, also named "tnsi-development" | eu-west-2 | Isolated test database (migration rehearsals, integration tests). **Never production.** Same name as the production project: always use the id. |
| `late-wildflower-26082707`, "tnsi-previews"            | us-east-2 | Empty database with all migrations, used by **Preview** deployments only.                                                                       |

Vercel (team `meesam1`):

| Vercel project               | Serves                        | Production `DATABASE_URL`                  | Preview `DATABASE_URL` | Git deploys                                         |
| ---------------------------- | ----------------------------- | ------------------------------------------ | ---------------------- | --------------------------------------------------- |
| `tnsi-platform`              | thenervoussysteminstitute.com | sensitive (value not readable) — see below | `tnsi-previews`        | Connected (`main` deploys to production)            |
| `tnsi-platform-somatic-prod` | earlier test deployment       | sensitive (value not readable) — see below | `tnsi-previews`        | **Disconnected 14 Nov 2026** (no automatic deploys) |

Also pointing at the production database: the local `apps/web/.env.local` and `packages/db/.env` on the
developer machine use `ep-damp-flower-ayp7i2gc`. Any local run, script or test started from those files
reads and writes **production**. Integration tests refuse that host by design.

**What is NOT proven.** Both production `DATABASE_URL` values are Vercel `sensitive` variables, which are
write-only, so their hosts cannot be read back by the API. By elimination (the organisation has only one
production-sized database) both most likely point at `ep-damp-flower-ayp7i2gc`, but that is an inference.
To confirm without exposing secrets: in the Neon console open the production project's monitoring and watch
connections while each site's signed-in pages load, or re-enter the value in Vercel from the Neon console.

Implication for migration 0014: apply it to `mute-cherry-69840088` (branch `production`). Because
`tnsi-platform-somatic-prod` no longer deploys on merge, it keeps its current code; if it does share the
production database, the additive-only migration cannot affect it.

## Deployment pipeline

```
GitHub → Pull Request → Preview Deployment → Code Review
  → Main Branch → Production Deployment → Monitoring
```

Matches `ARCHITECTURE.md`'s Vercel deployment model (per-PR previews,
ignored-build-step per app).

## AI architecture — risk callout

Restated from `ARCHITECTURE.md` because it's a cross-cutting product/legal
concern, not just an engineering one: given the nervous-system/mental-health-
adjacent subject matter, AI guidance carries real product and legal risk.
The AI must only use approved TNSI content; it must never generate
unsupported clinical advice, diagnose, or replace Caroline/professional
support. Concretely: scope responses away from clinical/diagnostic claims,
run OpenAI's moderation endpoint on inputs and outputs, log conversations
for audit/safety review, define a human-escalation path, and evaluate
prompt changes before they ship. This needs product/legal review before
`packages/ai` is built — it has not happened yet.

## Scalability roadmap

```
v1: Public Website, Programs, Insights, Assessment, Flowi Integration
v2: Member Portal, Dashboard, Community, Learning Platform
v3: Academy, Certification, Practitioner Portal
v4: Executive Advisory Dashboard, Corporate Portal
v5: AI Institute Guide, Personalised Learning, Mobile App, API Platform
```

This roughly mirrors `PROJECT.md`'s phase table at a coarser grain — v1-v2
correspond to Phase 4 (first application scaffold) and beyond.

## Non-functional requirements

99.9% uptime; support 100,000+ monthly visitors; component-based
architecture for maintainability; strict TypeScript; clear documentation.

## Data model (entitlements, programmes, progress)

The conceptual content model above is editorial (Sanity). Transactional
data (entitlements, programme enrollment, assessment results, webinar
registrations) lives in Postgres per `ARCHITECTURE.md`'s CMS-scope
decision — the detailed schema is tracked as an `ARCHITECTURE.md` open
item ("define the entitlements schema in `packages/db` in detail") and
should be written there, not duplicated here.

## Infrastructure and deployment

See `ARCHITECTURE.md` §Deployment: Vercel, three projects (web/studio/
admin), Turborepo `--filter` + ignored-build-step, environments
(production/staging/per-PR preview).

## Security and compliance

See Security section above plus `ARCHITECTURE.md`'s entitlements model
(Clerk for identity, custom Postgres entitlements for authorization).
Compliance requirements beyond general data-handling best practice haven't
been specified yet — flagged as open.
