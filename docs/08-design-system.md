# 08 — Design System

> Status: Phase 3 complete, including brand tokens. `packages/ui`'s
> `tokens.css`/`theme.css` now implement the real palette and radius scale
> from [02-brand-strategy.md](./02-brand-strategy.md), and `apps/web` loads
> the chosen typefaces.

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

**Brand color is implemented.** `tokens.css`'s neutral ramp is now
warm-hued (oklch, ~75° hue) rather than zero-chroma grey — its endpoints
are Soft White (`--neutral-50`) and Charcoal (`--neutral-900`). A separate
`--deep-slate`/`--deep-slate-raised` pair covers the brand's distinct cool
dark-mode hue, rather than just a darker step of the warm ramp. Named
secondary tokens (`--warm-sand`, `--stone-grey`, `--muted-olive`,
`--soft-taupe`) and the accent trio (`--accent-forest`, `--accent-bronze`,
`--accent-blue`) exist as raw tokens; the accent trio is intentionally
**not** wired into any semantic role yet — per the brand doc it's for
charts/highlights only, and no component renders a chart today.
`--brand-*` still deliberately aliases the neutral ramp: primary actions
are ink/Charcoal, not a saturated hue — "Premium Through Restraint" in
[02-brand-strategy.md](./02-brand-strategy.md).

**Typography is implemented.** `apps/web/src/app/layout.tsx` loads Inter
(body, `--font-sans-body`) and Cormorant Garamond (display,
`--font-display`) via `next/font/google`; `globals.css` points
`--font-sans`/`--font-heading` at them. Canela and Noe Display (the brand
doc's first-choice serifs) aren't available via `next/font/google` — being
commercial typefaces — so Cormorant Garamond is the standing choice until
a licensed alternative is set up; revisit if/when that happens.

**Spacing and radius are implemented.** The spacing scale now goes up to
`--space-5xl: 8rem` (128px), matching the brand spec's full 8/16/24/32/48/
64/96/128 scale. The radius scale was simplified from 7 steps to the brand
spec's 4 (`--radius-sm`=8px, `-md`=12px, `-lg`=16px, `-xl`=24px, plus
`-none`/`-full`) — `rounded-xs` no longer exists; the few call sites using
it (`Checkbox`, `Link`, `Toast`'s close button) now use `rounded-sm`.

**Known gap:** `apps/web/src/app/globals.css` still has its own
`--chart-1..5`/`--sidebar-*` tokens in cold greyscale, unrelated to the new
warm palette — those are app-level (not `@tnsi/ui`) and weren't in scope
for this pass since no component renders a chart or sidebar yet. Update
them to the accent trio above if/when a chart component is built.

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
