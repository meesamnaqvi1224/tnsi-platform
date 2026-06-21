# Project Status

This document is the living source of truth for where the project stands.
Unlike `README.md` (written for outside visitors), this file is for the team:
current phase, open decisions, and what's next.

## Current phase

**Phase 4 — First application scaffold (next)**

Engineering foundation, technical architecture (see `ARCHITECTURE.md`),
product definition (`docs/01`–`docs/06`), and the design system foundation
(`packages/ui`, see `docs/08-design-system.md`) are done. One known gap:
`packages/ui`'s tokens still use a placeholder neutral palette/single font
— the real brand spec (`docs/02-brand-strategy.md`) hasn't been applied to
code yet (tracked as a follow-up, not blocking Phase 4). No product
pages/layouts have been built — `apps/web` has Next.js, Tailwind, and
`@tnsi/ui` wired up, but no screens.

## Phase history

| Phase | Description                                                        | Status                                    |
| ----- | ------------------------------------------------------------------ | ----------------------------------------- |
| 0     | Engineering foundation (repo structure, conventions, doc skeleton) | Complete                                  |
| 1     | Product definition (PRD, personas, business model, IA)             | Drafted (v1.0)                            |
| 2     | Technical architecture decisions (stack, infra, data model)        | Complete                                  |
| 3     | Design system                                                      | Foundation complete, brand tokens pending |
| 4     | First application scaffold                                         | Not started                               |

## Decisions log

### 2026-06-22 — Design system foundation (`packages/ui` / `@tnsi/ui`)

- **Lives in `packages/ui`, not `apps/web/components`.** `ARCHITECTURE.md`
  already designates it as cross-app (web, admin, future mobile/docs).
- **Tokens are layered**: raw primitives in `tokens.css`, semantic
  light/dark mapping + Tailwind `@theme` registration in `theme.css`.
  Brand color is a deliberate placeholder (aliases the neutral ramp) since
  `docs/02-brand-strategy.md` hasn't happened yet — only that one block
  changes when it does.
- **Hand-written components** (no shadcn CLI/registry network dependency),
  following shadcn conventions: `@base-ui/react` for interactive/overlay
  primitives + `class-variance-authority` for variants.
- **Server Component friendly by default** — only Base UI-backed components
  (anything stateful: Checkbox, Radio, Switch, Select, Modal, Drawer,
  Dropdown, Popover, Tooltip, Toast) are `'use client'`.
- **Form-library-agnostic**: components forward refs and accept standard DOM
  props rather than depending on `react-hook-form` directly, per
  `ARCHITECTURE.md`'s RHF + Zod-at-the-app-layer decision.
- **Toast** uses Base UI's built-in `Toast` primitive + `createToastManager`
  rather than adding a Zustand dependency for this — Base UI already covers
  the global-manager use case.

### 2026-06-22 — Founding product/brand/engineering documents ingested

Two founding documents (a full product doc set — PRD, brand strategy,
business model, IA, personas, feature spec, technical architecture, design
system, CMS/DB blueprint — and a separate "Master Engineering Handbook"
draft) were found in source files outside the repo and ingested:

- `docs/01-prd.md` through `docs/06-feature-specification.md` are now
  drafted (v1.0) from the product doc set, not stubs.
- `docs/07-technical-architecture.md` was extended with content the
  founding doc covered but `ARCHITECTURE.md` didn't (performance/SEO/
  security targets, content/data model, deployment pipeline, scalability
  roadmap) — `ARCHITECTURE.md` remains canonical for stack decisions.
- The Master Engineering Handbook's durable rules (Development Rules,
  Definition of Done, Git workflow, AI principles, CRM rule) were merged
  into `CLAUDE.md` rather than overwriting this file — `PROJECT.md` stays
  a phase tracker, `CLAUDE.md` stays "how to work in this repo," per the
  split `CLAUDE.md` already documented.
- **Brand identity is now actually decided** (colors, typography, spacing/
  radius scale — see `docs/02-brand-strategy.md`), which means
  `packages/ui`'s placeholder tokens (built in Phase 3 under the assumption
  brand strategy hadn't happened yet) need a follow-up update. That's
  scoped as separate work, not done in this pass.

## Open decisions

- Update `packages/ui`'s `tokens.css`/`theme.css` (colors, fonts, radius
  scale) to match `docs/02-brand-strategy.md`'s real brand spec, plus load
  a serif display font in `apps/web` alongside the existing sans.

## How to use this file

- Update the phase table as the project moves forward.
- Log significant decisions (stack choices, scope cuts, pivots) under "Open
  decisions" once made, moving them to a "Decisions log" section with date
  and rationale.
- Keep this file accurate over polished — it's read by the team, not investors.
