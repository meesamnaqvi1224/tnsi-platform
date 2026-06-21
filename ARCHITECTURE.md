# Architecture

This document records the engineering architecture for TNSI Platform and the
reasoning behind each decision. It is written to outlive any single
implementation detail — when a decision here is revisited, update this file
and explain why, rather than deleting the history of what we used to believe.

Status: Architecture agreed, Sprint 1. No application code has been written
against this architecture yet.

## Product shape this architecture serves

TNSI Platform is a single product with many surfaces, not several products
that happen to share a brand:

- Public marketing website (SEO-critical)
- Content publishing (blog, articles)
- Learning Management System (courses, lessons, progress)
- Membership platform (subscription-gated content)
- Practitioner Academy (certification track)
- Executive Advisory portal (org-aware, higher-touch)
- AI-powered guidance (OpenAI-backed)
- Capacity Assessments (scored, AI-interpreted)
- Webinar platform (registration + gating; broadcast is a third party)
- CRM sync (Flowi)
- Future mobile application

Audiences: high-achieving women, practitioners, executives, organizations.
Roles: Visitor, Member, Program Client, Practitioner, Executive, Admin.

## Foundational decision: roles are entitlements, not auth roles

A user's role here describes what they're entitled to (membership tier,
program purchase, practitioner certification, org seat), not who they are at
the identity layer. A user can hold multiple roles simultaneously (e.g.
Member + Practitioner). Modeling these directly as Clerk roles would break
the first time a user needs two roles at once, or a role needs to expire
when a subscription lapses.

**Decision:** Clerk owns identity and session only, plus `Organization`
membership for the corporate-buyer audience. A separate entitlements model,
stored in our own Postgres database and exposed through `packages/auth`,
owns "what can this user do." Entitlements are written by Stripe webhooks
(purchase → grant), admin actions (manual grant/revoke), and product events
(course completion → certification grant). Every route guard and server
component checks entitlements through one function, never Clerk roles
directly.

## Foundational decision: CMS scope is bounded

Sanity is the system of record for editorial content: marketing pages, blog,
practitioner bios, testimonials, lesson copy, and assessment question text.
Sanity is explicitly **not** the system of record for anything transactional
or per-user: enrollment state, lesson progress, quiz/assessment results,
webinar registrations, entitlements. That data lives in Postgres and
references Sanity document IDs where it needs to point at content.

**Why:** Sanity's document model and API are built for editorial workflows
(drafts, publishing, content relationships), not high-write relational data
with reporting/join requirements. Conflating the two would force either
awkward modeling in Sanity or a second source of truth fighting with it.

## Foundational decision: buy, don't build, for video infrastructure

Webinar broadcast and LMS course video are not differentiating engineering
work for TNSI. We integrate with a third-party webinar provider (e.g. Zoom
Webinars) for live broadcast and Mux for on-demand course video, and own
only what's product-specific: registration, entitlement-based gating, and
progress/completion tracking (which Mux's playback data feeds).

## Monorepo: Turborepo + pnpm

**Turborepo** because the platform has multiple deployables (web app, Sanity
Studio, internal admin, future mobile) that share design system, auth/
entitlement logic, CMS types, and validation schemas. Turborepo over Nx: far
shallower learning curve for a team writing primarily Next.js apps, and
first-class integration with Vercel (same vendor, native affected-app
detection and remote caching).

**pnpm** as the package manager: strict, content-addressable dependency
resolution prevents phantom-dependency bugs that monorepos are prone to,
mature workspace protocol support, and it's what Vercel's own Turborepo
tooling defaults to. Bun was considered and rejected for now — faster, but
SDK compatibility (Clerk, Sanity) still has rough edges; revisit as a script
runner later, not as the workspace package manager.

**Tradeoff acknowledged:** this structure has more upfront ceremony than a
single Next.js app. Mitigation: a package is only created once at least two
apps need it. `db`, `auth`, `cms`, and `validation` qualify immediately
because both `web` and `admin` need them on day one.

### Apps

```
apps/
  web/        Marketing, content, membership, academy, executive portal.
              ONE Next.js app, role-gated route groups — not separate
              domains or apps per audience.
  studio/     Sanity Studio, deployed independently of web so the content
              team's release cadence is decoupled from engineering's.
  admin/      Internal back office: entitlement overrides, CRM sync
              monitoring, support tooling. Not customer-facing.
  docs/       Internal engineering documentation site (ADRs, onboarding,
              package READMEs rendered as a browsable site). Distinct from
              the root-level `docs/` folder: root `docs/` is product/business
              markdown read directly on GitHub; `apps/docs` is for
              engineering-facing reference material that benefits from
              being a real site (search, navigation, versioning) as the
              number of packages and apps grows.
  mobile/     Placeholder for a future Expo app. Empty until needed.
```

**Why `web` is one app, not several:** SEO and auth both push the same
direction. Splitting marketing/LMS/academy/executive across separate apps
or subdomains fragments domain authority (harmful to SEO) and forces either
duplicated session handling across domains or awkward cross-domain SSO. One
app with role-gated route groups (`app/(marketing)`, `app/(membership)`,
`app/(academy)`, `app/(executive)`) gives one session, one design system
instance, and lets a visitor move from a public assessment into a gated
dashboard without re-authenticating.

### Packages

```
packages/
  core/          Framework-free domain layer: entities, domain-event
                 definitions, pure business logic (e.g. assessment
                 scoring). Depends on nothing infrastructure-specific;
                 everything else depends on it, not the reverse.
  ui/            Shared design system (Tailwind + shadcn/ui primitives).
  config/        Shared tsconfig, eslint, tailwind config.
  db/            Drizzle schema + client. Entitlements, progress,
                 assessment results, webinar registrations.
  auth/          Clerk helpers + the entitlements/authorization layer.
                 The single place that answers "can this user see X."
  cms/           Sanity client, generated types, GROQ query helpers.
  integrations/  Flowi adapter, Stripe webhook handlers, Mux — each third
                 party isolated behind its own adapter.
  email/         Transactional email (e.g. Resend): receipts, course
                 reminders, account notifications. Kept separate from
                 Flowi: Flowi is the marketing/CRM channel, this package
                 is the product's own transactional channel, and the two
                 should be swappable independently.
  analytics/     Tracking abstraction (page views, conversion events,
                 product engagement) behind one interface, so the
                 underlying analytics vendor can change without touching
                 app code, and so SEO/marketing and product engagement
                 events go through one consistent event shape.
  ai/            See "AI architecture" below — chat, knowledge base, RAG,
                 prompt templates, evaluation, agents.
  validation/    Zod schemas shared between client forms and server logic.
```

Business logic lives in packages, not in route handlers. Route
handlers/server actions stay thin and delegate. This matters specifically
because AI guidance and assessment scoring are the most likely candidates to
need to move out of a request/response cycle later (background processing,
longer-running analysis); keeping them as plain functions in packages now
means that move is an extraction, not a rewrite.

`packages/core` exists because the domain-event pattern referenced under
CRM/Flowi below needs one home for event definitions and pure scoring logic
that isn't tied to Postgres, Sanity, or any vendor SDK — without it, that
logic tends to leak into whichever package touches it first.

## Authentication: Clerk

Used for identity, session management, and `Organization` membership (the
mechanism for the corporate-buyer audience — a company purchasing seats for
its Executives). Not used to encode product roles directly — see the
entitlements decision above.

## CMS: Sanity

Used for editorial content as scoped above. On-publish webhooks trigger
on-demand ISR revalidation in `apps/web`, so content edits go live
immediately without a full rebuild — important both for SEO freshness and
so the content team doesn't depend on engineering to ship a page.

## Payments: Stripe

Source of truth for what was purchased. Stripe webhooks are the primary
writer of entitlements in Postgres. Supports both subscription billing
(membership tiers) and one-time purchases (program enrollment, Practitioner
Academy), plus Stripe Billing's customer portal for self-service plan
management.

## CRM: Flowi

Integrated as one adapter in `packages/integrations`, not called ad hoc from
scattered business logic. Domain events (user signed up, purchase completed,
course completed, assessment submitted), defined in `packages/core`, are the
trigger; the Flowi adapter is one of potentially several consumers of those
events — `packages/email` and `packages/analytics` are two others. This
decouples core product logic from any specific vendor — if Flowi is
replaced in year 3, the change is isolated to one adapter.

## AI architecture: OpenAI, designed for chat, RAG, and agents from day one

Today's requirement is AI-guided assessment interpretation and conversational
guidance. The architecture below is shaped so that knowledge-base-grounded
answers, retrieval, evaluation, and tool-using agents can be added later
without restructuring `packages/ai` — only the unbuilt subdirectories get
filled in.

```
packages/ai/
  clients/        OpenAI client wrapper, model config, retry/rate-limit
                   handling. The only place an OpenAI SDK call is made.
  prompts/         Versioned prompt templates. Versioning matters because
                   a prompt change is a behavior change — it should be
                   reviewable and revertible like code, not edited in
                   place in a string literal somewhere.
  chat/            Conversation orchestration: message history, turn
                   management, streaming. Used by the AI guidance feature
                   today.
  knowledge-base/  Ingestion and storage interface for the retrieval
                   corpus (program content, assessment frameworks,
                   practitioner guidance docs). Not built today; this is
                   the seam where it plugs in later.
  rag/             Retrieval: embeddings, vector search, context assembly
                   for grounding chat/agent responses in the knowledge
                   base. Depends on `knowledge-base/`.
  agents/          Multi-step, tool-using orchestration (e.g. an agent
                   that runs an assessment, queries the knowledge base,
                   and drafts a follow-up plan). Built last — chat and
                   RAG are the prerequisites.
  eval/            Evaluation harness: regression tests for prompt changes
                   (does this prompt edit make known-good answers worse?)
                   and quality scoring for new features before ship.
  moderation/      OpenAI moderation endpoint wrapper, applied to both
                   user input and model output.
```

**Vector storage:** use Postgres with the `pgvector` extension on the
existing Neon database rather than introducing a separate vector database.
There's no scale requirement yet that justifies a dedicated vector store,
and keeping embeddings next to the relational data they're grounded in
(assessment results, course content references) avoids a second system to
keep in sync. Revisit only if retrieval volume/latency actually demands it.

**Risk callout — given the nervous-system/mental-health-adjacent subject
matter, this carries real product and legal risk, not just engineering
integration risk:**

- Scope responses away from clinical/diagnostic claims.
- Run the OpenAI moderation endpoint on inputs and outputs (`moderation/`).
- Log conversations for audit/safety review, with appropriate data handling.
- Define a human-escalation path for concerning inputs.
- Evaluate prompt changes (`eval/`) before they ship, given the sensitivity
  of the subject matter — a regression here is not just a UX issue.

This belongs in product/legal review before the AI guidance feature ships,
not only in `packages/ai`.

## Database: Postgres via Neon, Drizzle ORM

Neon over Supabase: Supabase's bundled auth/storage are redundant here
(Clerk and Sanity/Mux already cover those), so adopting it would add
complexity for unused features. Drizzle over Prisma: RBAC checks run in
Vercel Edge middleware, and Drizzle has materially better edge-runtime
support without Prisma's Accelerate/Data Proxy workaround. Neon's
branch-per-PR model pairs naturally with Vercel preview deployments.

## State management

Server-first by default: React Server Components fetch directly from
Postgres (`packages/db`) or Sanity (`packages/cms`) — no client global store
for read-heavy content. For interactivity:

- **TanStack Query** for client-side caching/refetching of mutable data
  (dashboard widgets, progress) layered over server actions.
- **Zustand** for ephemeral local UI state (assessment wizard steps,
  modals) — not global app state.
- **React Hook Form + Zod**, with Zod schemas shared from
  `packages/validation` so client and server validate identically.

Redux is explicitly not used — no class of state here (deeply nested,
normalized, cross-cutting) justifies its overhead.

## Deployment: Vercel

Three Vercel projects — `web`, `studio`, `admin` — deployed independently
from the same monorepo using Turborepo's `--filter` plus Vercel's
ignored-build-step, so a change to one app doesn't trigger rebuilds of the
others.

Environments: production, staging (separate Clerk instance, Stripe test
mode, separate Sanity dataset), and per-PR preview deployments for `web`,
where the SEO/marketing surface benefits most from preview review.

SEO-critical routes use ISR with on-demand revalidation triggered by Sanity
publish webhooks. Authenticated dashboard routes render dynamically.
Sitemap, robots.txt, and JSON-LD structured data are generated from Sanity
content at build/revalidate time, not hand-maintained.

## Summary table

| Concern | Decision |
|---|---|
| Monorepo tooling | Turborepo |
| Package manager | pnpm |
| Apps | web, studio, admin, docs, mobile (future) |
| Identity/session | Clerk |
| Product roles/entitlements | Custom layer in Postgres, not Clerk roles |
| CMS | Sanity — editorial content only |
| Transactional/per-user data | Postgres via Neon + Drizzle |
| Domain logic/events | `packages/core` — framework-free, depended on by everything else |
| Payments | Stripe — source of truth for entitlements |
| CRM | Flowi, via an isolated adapter |
| Transactional email | `packages/email` (e.g. Resend), separate from Flowi |
| Analytics | `packages/analytics` — vendor abstracted behind one interface |
| AI | OpenAI — chat, RAG, prompt templates, eval, agents staged in `packages/ai`; pgvector on existing Postgres for retrieval |
| Video (LMS) | Mux, not self-hosted |
| Webinars | Third-party broadcast + in-house registration/gating |
| State management | RSC-first, TanStack Query, Zustand, React Hook Form + Zod |
| Deployment | Vercel, 4 projects, ISR for SEO routes |

## Open items for next sprint

- Choose specific webinar broadcast provider (Zoom Webinars vs Livestorm).
- Define the entitlements schema in `packages/db` in detail.
- Define the domain-event list and payload shapes in `packages/core`,
  consumed by `packages/integrations`, `packages/email`, `packages/analytics`.
- Choose transactional email provider for `packages/email` (e.g. Resend).
- Choose analytics vendor(s) behind `packages/analytics` (product + SEO/marketing
  analytics may be two different tools behind the same interface).
- Legal/product review of AI guidance scope before `packages/ai` is built.
- Decide initial `apps/docs` tooling (e.g. Nextra) once there's enough
  package surface area to document.
