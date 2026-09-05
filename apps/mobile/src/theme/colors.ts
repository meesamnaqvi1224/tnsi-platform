/**
 * Phase 1 palette. Values approximate the brand direction from the Phase 0
 * audit (deep navy, warm cream, charcoal, restrained bronze/gold) using
 * plain hex - not derived from `packages/ui`'s OKLCH tokens, which are CSS
 * custom properties and don't carry over to React Native as-is. Revisit
 * once a shared JS/TS token module exists (see PHASE1_REPORT.md).
 */
export const colors = {
  navy: '#12213A',
  navyDark: '#0B1526',
  cream: '#F7F3EA',
  creamMuted: '#EFE8D8',
  charcoal: '#26241F',
  bronze: '#A9803E',
  bronzeMuted: '#C9A76B',
  white: '#FFFFFF',
  error: '#B3432B',
  success: '#3E5C3A',
  border: '#DDD4BE',
} as const;

export type ColorToken = keyof typeof colors;
