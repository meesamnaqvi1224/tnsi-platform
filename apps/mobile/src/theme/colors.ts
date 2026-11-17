/**
 * App palette, aligned with the white editorial theme (see
 * components/home/homeTheme.ts). The `cream` names are kept for the many
 * call sites that use them, but `cream` is now the white page colour and
 * `charcoal` the secondary-text grey. Plain hex - not derived from `packages/ui`'s OKLCH tokens, which are CSS
 * custom properties and don't carry over to React Native as-is. Revisit
 * once a shared JS/TS token module exists (see PHASE1_REPORT.md).
 */
export const colors = {
  navy: '#14253D',
  navyDark: '#0B1526',
  cream: '#FFFFFF',
  creamMuted: '#F7F9FB',
  charcoal: '#4B5563',
  bronze: '#A87942',
  bronzeMuted: '#C9A76B',
  white: '#FFFFFF',
  error: '#B3432B',
  success: '#3E5C3A',
  border: '#DDE1E5',
} as const;

export type ColorToken = keyof typeof colors;
