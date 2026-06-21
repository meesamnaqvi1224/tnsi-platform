# Instructions for AI-assisted work in this repository

## Current phase

See `PROJECT.md` for the authoritative phase table — this section is a
pointer, not a duplicate, so it can't drift out of sync the way a copy would.
As of Phase 3 (design system) completing: the framework decision is made
(`ARCHITECTURE.md`), `apps/web` has Next.js/Tailwind/`@tnsi/ui` installed,
and `packages/ui` has real components. Phase 4 (first application
scaffold — actual pages/layouts) has not started. Do not build pages,
layouts, or app-specific feature code unless explicitly asked to in the
current request — earlier instructions to hold off don't expire on their
own, but also don't assume they still apply if the user later asks for a
build step.

## Repository conventions

- `apps/*` — one deployable application per directory. Do not create an app
  directory until a framework decision has been documented in `PROJECT.md`
  or `docs/07-technical-architecture.md`.
- `packages/*` — shared code consumed by `apps/*`. Should not depend on any
  app; apps depend on packages, never the reverse.
- `design/` — design tokens and assets. Source of truth for visual decisions;
  should be referenced by `docs/08-design-system.md`, not duplicated into it.
- `docs/*` — numbered for reading order. When adding net-new product or
  technical context, prefer extending the relevant existing numbered doc over
  creating new top-level docs.
- `scripts/*` — repository automation only (codegen, release, CI helpers).
  Not a dumping ground for one-off exploratory scripts.

## Working style expected in this repo

- Explain architectural decisions before making them — this project is being
  built to last 10+ years; reasoning should be visible, not just outcomes.
- Don't introduce a framework, dependency, or abstraction without it being
  tied to a documented need (a PRD requirement, an architecture decision in
  `docs/07-technical-architecture.md`, etc.).
- Update `PROJECT.md`'s phase table and decisions log when a phase completes
  or a significant decision is made.
- Code style: Prettier (`.prettierrc`) and ESLint (`.eslintrc.json`) are the
  baseline. The ESLint config is intentionally generic (no framework plugins)
  until `apps/` has a chosen stack — extend it then, don't pre-guess it now.

## Development rules

Source: founding engineering handbook (ingested into `docs/01`–`docs/08`;
this is the condensed, durable subset worth keeping front-and-center).

**Always:** Server Components by default, Client Components only when
interaction requires it; TypeScript everywhere; reusable/composable
components over one-offs; semantic HTML; accessibility as a requirement
(WCAG AA — see [08-design-system.md](./docs/08-design-system.md)), not an
enhancement.

**Never:** hardcode content that belongs in Sanity once `packages/cms` is
wired up; duplicate logic across packages/apps; create unnecessary
wrapper components; install a dependency without a documented need (see
above); ignore TypeScript warnings; commit secrets — use environment
variables, never hardcode keys.

## Definition of done

A feature is complete when it's: functional, responsive, accessible,
SEO-ready (every page needs `seoTitle`/`seoDescription`/canonical/OG
image/structured data — see
[07-technical-architecture.md](./docs/07-technical-architecture.md)),
CMS-integrated where required, type-safe, tested, documented, reviewed,
and production-ready.

## Git workflow

Conventional commit prefixes: `feat:`, `fix:`, `docs:`, `refactor:`,
`style:`, `test:`, `chore:` — scoped where useful, e.g.
`feat(design-system): create reusable design system foundation`. Every
pull request should be reviewed before merge once there's more than one
contributor.

## AI principles (binding once `packages/ai` is built)

AI exists to support education, not replace human expertise or the
founder. AI must never: diagnose, replace Caroline/professional support,
or provide unsupported clinical advice — it only uses approved Institute
content. See [07-technical-architecture.md](./docs/07-technical-architecture.md)
for the full risk callout (moderation, escalation path, eval-before-ship);
this needs product/legal review before `packages/ai` is built, which
hasn't happened yet.

## CRM rule

Every meaningful user interaction syncs to Flowi automatically (assessment
→ contact, newsletter → lead, webinar → pipeline, consultation →
opportunity, programme purchase → client, membership → member). See
[06-feature-specification.md](./docs/06-feature-specification.md) §CRM
integration. Don't build a conversion-flow feature that skips this sync.
