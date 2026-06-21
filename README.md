# TNSI Platform

> Status: Foundation phase. No application code exists yet.

## What this is

TNSI Platform is currently in its pre-build phase: the engineering foundation,
documentation structure, and conventions are being established before any
application code is written. See [`PROJECT.md`](./PROJECT.md) for current
status and [`docs/`](./docs) for product and technical context.

## Repository structure

```
apps/        Deployable applications (web, api, admin, etc.) — empty for now
packages/    Shared libraries consumed by apps/ (ui kit, types, utils) — empty for now
design/      Design tokens, assets, and design-system source of truth
docs/        Product, business, and technical documentation
scripts/     Repository automation (codegen, release, CI helpers)
.github/     CI workflows, issue/PR templates, CODEOWNERS
```

## Getting started

There is nothing to install or run yet. This repository currently contains
only documentation and tooling configuration. Setup instructions will be
added here once the first application is scaffolded.

## Documentation

Start with [`docs/01-prd.md`](./docs/01-prd.md) and read in numeric order —
each document builds on the context established by the previous one.

## Contributing

Code style is enforced via Prettier (`.prettierrc`) and ESLint
(`.eslintrc.json`). Conventions for working in this repo, including
AI-assisted contributions, are documented in [`CLAUDE.md`](./CLAUDE.md).
