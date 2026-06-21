# 08 — Design System

> Status: Phase 3 foundation complete and committed. Brand identity is now
> decided (see [02-brand-strategy.md](./02-brand-strategy.md)) but **not
> yet reflected in code** — `packages/ui`'s tokens still use the neutral
> placeholder palette and single font family described below. Updating
> `tokens.css`/`theme.css` to the real spec is the next tracked piece of
> work, deliberately done as a separate pass from this doc-ingestion
> change.

The design system lives in code, at [`packages/ui`](../packages/ui)
(`@tnsi/ui`) — not in `design/`. `design/` is reserved for source design
assets (Figma exports, brand guidelines) once they exist; this document
explains structure and usage, it does not duplicate token values that live
in code.

## Design tokens

Two layers, both under `packages/ui/src/styles/`:

- **`tokens.css`** — primitive, raw values: neutral/brand color ramps,
  semantic state hues (success/warning/danger/info), the spacing scale,
  motion (duration/easing), and the z-index scale. Nothing here has a UI
  meaning yet.
- **`theme.css`** — semantic layer. Maps primitives onto roles
  (`--color-background`, `--color-primary`, …), declares `:root`/`.dark`
  variants, and registers Tailwind v4 `@theme` keys for radius, shadow, and
  breakpoints so `rounded-*`, `shadow-*`, and `sm:`/`md:`/… utilities are
  generated from our scale.

**Brand color is currently a placeholder, but the target is now known.**
`--brand-*` in `tokens.css` aliases the neutral (zero-chroma) ramp; the
real palette from [02-brand-strategy.md](./02-brand-strategy.md) is:

- Primary: Warm Ivory, Soft White, Charcoal, Deep Slate.
- Secondary: Warm Sand, Stone Grey, Muted Olive, Soft Taupe.
- Accent (charts/highlights only, not UI chrome): Deep Forest Green, Muted
  Bronze, Very Soft Blue.

Typography is also decided but not yet implemented: an elegant serif
display font (Canela / Noe Display / Cormorant Garamond / Libre
Baskerville) paired with a modern sans body font (Inter / Manrope /
Satoshi / General Sans) — meaning `--font-heading` should stop aliasing
`--font-sans` once a serif is loaded via `next/font`.

Because no component or theme code references raw color/font values
directly (everything goes through the semantic `--color-*`/`--font-*`
layer), this is purely a `tokens.css`/`theme.css` + font-loading change in
`apps/web/src/app/layout.tsx` — no component API changes.

The spacing scale this system already uses (`--space-xs` through
`--space-4xl`, currently 8/16/24/32/48/64/96px) matches the brand spec's
8/16/24/32/48/64/96/128 scale almost exactly; only a `--space-5xl: 8rem`
(128px) step is missing. The radius scale does **not** match — the brand
spec wants a simpler 4-step scale (8/12/16/24px) versus the current 7-step
scale — that's a real change, not just an addition.

## Component inventory

| Category   | Components                                                                                             |
| ---------- | ------------------------------------------------------------------------------------------------------ |
| Primitives | Button, IconButton, Card, Badge, Avatar, Container, Stack, Grid, Section, Divider, Heading, Text, Link |
| Forms      | Input, Textarea, Select, Checkbox, Radio, Switch, Label, Form/FormField, ValidationMessage             |
| Feedback   | Alert, Toast, Spinner, Skeleton, Progress, EmptyState                                                  |
| Overlay    | Modal, Drawer, Dropdown, Popover, Tooltip                                                              |

Interactive/overlay components wrap [`@base-ui/react`](https://base-ui.com)
primitives (matching the `base-nova` shadcn style already configured in
`apps/web/components.json`) for accessibility and behavior; everything else
is plain typed React. See `packages/ui/README.md` for the architectural
reasoning (location, Server Component boundaries, RHF compatibility).

## Accessibility standards

Baseline: WCAG 2.1 AA. Concretely, in this system:

- All overlays trap/restore focus and close on `Escape` via Base UI's
  built-in behavior — not reimplemented per component.
- `Heading`'s `as` prop is required (no default) so callers must choose the
  correct semantic level rather than skipping the document outline.
- Icon-only `IconButton` requires `aria-label`.
- `Spinner` exposes `role="status"` + a visually-hidden label; decorative
  icons elsewhere are `aria-hidden`.
- Form components don't auto-generate ids (keeps them Server Component
  friendly); `FormField` wires `aria-describedby`/`aria-invalid` from an
  id you provide, so hints/errors are always announced.
- Focus rings (`focus-visible:ring-*`) use `--color-ring`, not browser
  default outlines, so they're visible in both themes.

## Design-to-code workflow

There are no design assets yet (`design/` is still empty — the brand
strategy doc has prose/values but no Figma exports or asset files). Build
screens against `@tnsi/ui` components and tokens now; the pending token
update (above) only touches `tokens.css`/`theme.css` and font loading, not
component APIs, so screens built before that update don't need rework
afterward.
