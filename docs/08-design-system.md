# 08 — Design System

> Status: Phase 3 complete (foundation). Visual/brand identity is still
> pending `docs/02-brand-strategy.md`.

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

**Brand color is a placeholder.** `--brand-*` in `tokens.css` currently
aliases the neutral (zero-chroma) ramp because `docs/02-brand-strategy.md`
hasn't been written yet. When brand strategy is decided, only that block in
`tokens.css` changes — no component or theme code references raw color
values, so the actual brand hue can land without touching anything else.

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

There are no design assets yet (`design/` is empty). Until
`docs/02-brand-strategy.md` lands, this system is the working default:
build screens against `@tnsi/ui` components and tokens now; when brand
assets exist, they'll update `tokens.css`'s color ramps and any
typography/motion tokens that need to change, not the component APIs.
