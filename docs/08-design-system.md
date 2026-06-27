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
| Editorial  | ChapterMarker, CapacityJourney, TypographicMoment, PageQuote, InstitutionalEvidence, EditorialFigure   |

## Editorial component system

Six components define the TNSI editorial design language — the visual grammar
that makes every page feel like a chapter of one publication rather than a
collection of independent screens. All live in `packages/ui/src/editorial/`
and are exported from `@tnsi/ui`. Future pages must use these primitives
rather than inventing equivalent visual patterns ad hoc.

### Design principles the editorial layer encodes

**Typography is the primary design element.** No icons, no decorative
graphics, no animation. All hierarchy, rhythm, and meaning are carried by
typeface, weight, size, and spacing alone.

**One major idea per screen.** The editorial components are calibrated for
generous whitespace. Do not attempt to increase information density by
reducing their default spacing — that collapses the rhythm they depend on.

**Restraint is the identity.** Every addition must reinforce calm, authority,
and clarity. If a visual element cannot justify its presence through those
three criteria, it does not belong on a TNSI page.

**The serif (Cormorant Garamond) is emotional; the sans (Inter) is functional.**
`ChapterMarker`, `TypographicMoment`, and `PageQuote` use `font-heading` for
this reason. Labels, captions, and credentials use `font-sans`.

---

### `ChapterMarker`

Replaces conventional `Eyebrow + Heading` pairs for major section transitions.

A mono-spaced chapter label anchors left; a hairline `border-t` rule extends
to the container edge; the chapter title sits below. The rule and the label
together signal a boundary — the reader knows they have arrived somewhere new
without being told explicitly.

**Props:** `index` (string), `title` (string), `as` (heading level, default
`h2`), `size` (heading size, default `xl`).

**Use for:** major chapter-level transitions only — the Method's four stages,
the About page's structural sections, the Faculty page's credentialling blocks.

**Do not use for:** sub-sections within a chapter (use `Heading` directly),
card titles, or any heading that does not represent a full narrative chapter.

---

### `CapacityJourney`

The Nervous System Institute's signature orientation element. Five stages
(`Survival → Understand → Regulate → Rewire → Lead`) over a continuous 1px
hairline, with tick marks at each stage.

Two modes:

- **Passive** (no `current` prop): all stages at equal visual weight. The full
  arc shown as a map. Use when first introducing the concept.
- **Active** (`current` set): one stage emphasised, others recede. Use when a
  piece of content, program, or user context is associated with a specific stage.

**Do not use** more than twice per page without a clear reason — the element
derives its authority from being used deliberately, not frequently.

---

### `TypographicMoment`

A single sentence given `min-h-[85vh]` of space, vertically centred. The
drama comes from the ratio of text to silence, not from the type size alone.

Two variants: `'light'` (warm ivory background, left-aligned — the sentence
addresses the reader personally) and `'dark'` (Deep Slate background, supports
either alignment — contemplative, more universal in register).

**Caller rules:**

- One complete thought only. If two sentences feel necessary, the thought is
  not ready to be a `TypographicMoment`.
- No pull-quote marks — scale is the emphasis.
- Use sparingly: one per major page section. Back-to-back instances eliminate
  the pause this component depends on.
- Vary `variant` when using more than once per page.

---

### `PageQuote`

The colophon of a section. Small italic Cormorant Garamond, narrow centred
column, single hairline rule above. Always positioned after the intellectual
content of a section — never at the top.

Rendered as a semantic `<blockquote>` with `<footer>/<cite>` for attribution.

**Do not use** for external testimonials or social proof — build a separate
testimonial component for that purpose. `PageQuote` is for the Institute's
own philosophy and Caroline's voice, not for external validation.

---

### `InstitutionalEvidence`

A quiet evidence panel presenting institutional credibility through typography,
spacing, and two hairline rules. No icons. No counters. No animation.

Accepts an array of `{ label, statement }` items. Labels are rendered in small
muted caps above the statement. Statements must be qualitative — write
"Fifteen years in private practice" not "500+ clients served". The former reads
as a considered credential; the latter reads as a marketing metric.

3–5 items is the intended range. The component handles its own internal
grid layout; the caller provides `Container` and `Section` context.

---

### `EditorialFigure`

Publication-style figure wrapper for diagrams, illustrations, and scientific
visuals. Figure number and caption flow as a single paragraph below a hairline
rule, following academic journal conventions.

**Props:** `number` (string or number), `caption` (string), `source`
(optional citation), `children` (figure content — image, SVG, diagram
component). When `children` is omitted, a labelled placeholder is shown.

Caption content rules: write in complete sentences, active voice, explaining
what the figure shows and why it matters — not a title, a description. Use
`source` for any figure derived from external research.

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
