# @tnsi/ui

Shared design system (Tailwind + Base UI primitives) used by every app in the workspace.

See [`docs/08-design-system.md`](../../docs/08-design-system.md) for the
full design-token and component inventory, and `ARCHITECTURE.md` for why
this lives in `packages/ui` rather than `apps/web/components`.

## Usage

```ts
import { Button, Card, Stack } from '@tnsi/ui';
```

Import the stylesheet once, in your app's global CSS, after Tailwind itself:

```css
@import 'tailwindcss';
@import '@tnsi/ui/styles.css';
@source '../relative/path/to/packages/ui/src';
```

The `@source` directive is required: Tailwind v4 only scans the app's own
root by default, so without it, utility classes used inside this package's
components won't be generated.

## Conventions

- Components are Server Component-friendly by default. Only components
  backed by `@base-ui/react` (anything stateful/interactive: Checkbox,
  Radio, Switch, Select, Modal, Drawer, Dropdown, Popover, Tooltip, Toast)
  have `'use client'`.
- Form inputs (`Input`, `Textarea`, Label, etc.) are native elements and
  work directly with React Hook Form's `register()`. Base UI-backed form
  controls (`Checkbox`, `RadioGroup`/`RadioItem`, `Switch`, `Select*`) don't
  have a real `<input>` you control directly — use RHF's `<Controller>` and
  map `field.value`/`field.onChange`/`field.ref` to `checked`/`value` +
  `onCheckedChange`/`onValueChange` + `inputRef`.
- No brand color decisions are baked in yet — see
  `docs/08-design-system.md` for why `tokens.css`'s brand ramp is currently
  a neutral placeholder.
