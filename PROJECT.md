# Project Status

This document is the living source of truth for where the project stands.
Unlike `README.md` (written for outside visitors), this file is for the team:
current phase, open decisions, and what's next.

## Current phase

**Phase 4 — First application (in progress)**

Foundations (Phases 0–3) are done. The **public marketing website is built
and live in production** on Vercel (`tnsi-platform.vercel.app`): Home, About,
Method, Programs (+ Practitioner Certification, Executive Advisory),
Research, Resources, Articles (+ detail template), Faculty, Discovery Call,
Contact, and legal pages — responsive, accessible, SEO-ready, with curated
production imagery. An **embedded Sanity CMS** is now integrated (see the
decisions log below): the Articles listing and Programs comparison read from
Sanity, editable via a Studio at `/studio`.

Still stubbed (not yet functional): forms/newsletter submission, Flowi CRM
sync, discovery-call booking, auth/payments/programme delivery, and the AI
guide. Content types beyond Articles/Programs remain hardcoded.

## Phase history

| Phase | Description                                                        | Status         |
| ----- | ------------------------------------------------------------------ | -------------- |
| 0     | Engineering foundation (repo structure, conventions, doc skeleton) | Complete       |
| 1     | Product definition (PRD, personas, business model, IA)             | Drafted (v1.0) |
| 2     | Technical architecture decisions (stack, infra, data model)        | Complete       |
| 3     | Design system                                                      | Complete       |
| 4     | First application — public marketing site + CMS                    | In progress    |

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

### 2026-06-22 — Brand tokens applied to `packages/ui`

- **Warm neutral ramp** replaces the zero-chroma placeholder (Soft White →
  Charcoal); **`--deep-slate`/`--deep-slate-raised`** added as a distinct
  cool hue for dark mode rather than just a darker warm step.
- **Secondary palette** (`--warm-sand`/`--stone-grey`/`--muted-olive`/
  `--soft-taupe`) and the **accent trio**
  (`--accent-forest`/`--accent-bronze`/`--accent-blue`) added as raw
  tokens. The accent trio is deliberately _not_ wired into any semantic
  role — brand strategy scopes it to charts/highlights only, and nothing
  renders a chart yet.
- **`--brand-*` still aliases neutral** — primary actions stay ink/
  Charcoal, not a saturated hue, per the brand doc's "Premium Through
  Restraint" principle. This was a placeholder before; it's now a
  confirmed decision.
- **Radius scale simplified** from 7 steps to the brand spec's 4
  (8/12/16/24px) — `rounded-xs` removed; updated the 3 call sites that
  used it to `rounded-sm`.
- **Spacing scale extended** with `--space-5xl` (128px), completing the
  8/16/24/32/48/64/96/128 scale.
- **Typography wired up** in `apps/web`: Inter (body) + Cormorant Garamond
  (display, via `font-heading`) loaded through `next/font/google`. Canela/
  Noe Display (the brand doc's first choices) aren't on Google Fonts —
  revisit if a licensed version becomes available.
- **Known gap, not addressed here:** `apps/web/globals.css`'s own
  `--chart-*`/`--sidebar-*` tokens are still cold greyscale — they're
  app-level, not part of `@tnsi/ui`, and nothing renders a chart or
  sidebar yet.

### 2026-08-07 — Sanity CMS integrated (embedded Studio, Articles + Programs)

First CMS integration, per the documented decision that Sanity is the
editorial CMS (`docs/07-technical-architecture.md`). Delivered end-to-end and
live in production.

- **Embedded Studio, not standalone.** The Studio ships inside `apps/web` at
  `/studio` rather than as a separate `apps/studio` deployment. `ARCHITECTURE.md`
  had reserved a standalone studio for decoupled release cadence; embedded was
  chosen for speed-to-value and a single deploy. Reversible later; `apps/studio`
  stays reserved.
- **Version pin: Sanity 3 + next-sanity 9.** Sanity 5 needs React 19.2's
  `useEffectEvent`; Sanity 4 + next-sanity 11 clash on Portable Text versions.
  Sanity 3 + next-sanity 9 is the proven combo for Next 15 App Router.
- **Build switched from Turbopack to webpack** (`next build`, was
  `next build --turbopack`). Sanity Studio does not bundle under Turbopack.
  Dev still uses Turbopack, so `/studio` is not served by `next dev` — use a
  webpack build (or the deployed site) for the Studio locally.
- **Schema in `apps/web/src/sanity`, not `packages/cms`.** `packages/cms` was
  the documented home for the client/queries/types; kept everything in the app
  for v1 to avoid a cross-package `sanity` dependency. `packages/cms` remains
  reserved for a future extraction.
- **Graceful fallback.** A guarded `sanityFetch` returns `null` when the CMS is
  unconfigured or errors, and the pages fall back to the hardcoded
  `src/content/*` — the site can never go blank if Sanity is unreachable.
- **Scope:** Articles listing + Programs "Compare Pathways" read from Sanity;
  seeded with 7 articles, 3 programs, 1 author, 6 categories (idempotent
  `scripts/seed-sanity.mjs`). Article **detail** bodies and other content areas
  remain hardcoded — the pattern is established for extending them.
- **Ops:** projectId `hookrbdv`, dataset `production`. Env vars
  (`NEXT_PUBLIC_SANITY_*`, `SANITY_API_READ_TOKEN`) live in Vercel and a
  gitignored `.env.local`; the deployed origin is a Sanity CORS origin.

## Open decisions

None recorded yet beyond the log above.

## How to use this file

- Update the phase table as the project moves forward.
- Log significant decisions (stack choices, scope cuts, pivots) under "Open
  decisions" once made, moving them to a "Decisions log" section with date
  and rationale.
- Keep this file accurate over polished — it's read by the team, not investors.
