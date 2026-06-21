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
deployment snapshots. Database export/PITR strategy for Postgres/Neon to
be defined alongside the entitlements schema (`ARCHITECTURE.md` open
items).

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
