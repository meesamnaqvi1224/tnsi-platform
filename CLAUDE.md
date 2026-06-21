# Instructions for AI-assisted work in this repository

## Current phase

This repository is in **Phase 0 — Engineering Foundation**. There is no
application code, no chosen framework, and no installed dependencies. Do not
scaffold an application, install packages, or write application code unless
explicitly asked to in the current request — earlier instructions to hold off
do not expire on their own, but also don't assume they still apply if the
user later asks for a build step.

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
