# Project Status

This document is the living source of truth for where the project stands.
Unlike `README.md` (written for outside visitors), this file is for the team:
current phase, open decisions, and what's next.

## Current phase

**Phase 4 — First application scaffold (next)**

Engineering foundation, technical architecture (see `ARCHITECTURE.md`), and
the design system (`packages/ui`, see `docs/08-design-system.md`) are done.
No product pages/layouts have been built yet — `apps/web` has Next.js,
Tailwind, and `@tnsi/ui` wired up, but no screens.

## Phase history

| Phase | Description                                                        | Status      |
| ----- | ------------------------------------------------------------------ | ----------- |
| 0     | Engineering foundation (repo structure, conventions, doc skeleton) | Complete    |
| 1     | Product definition (PRD, personas, business model, IA)             | Not started |
| 2     | Technical architecture decisions (stack, infra, data model)        | Complete    |
| 3     | Design system                                                      | Complete    |
| 4     | First application scaffold                                         | Not started |

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

## Open decisions

None recorded yet beyond the log above.

## How to use this file

- Update the phase table as the project moves forward.
- Log significant decisions (stack choices, scope cuts, pivots) under "Open
  decisions" once made, moving them to a "Decisions log" section with date
  and rationale.
- Keep this file accurate over polished — it's read by the team, not investors.
