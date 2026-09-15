export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
} as const;

export const radius = {
  sm: 4,
  md: 8,
  lg: 16,
  xl: 22,
} as const;

/**
 * Named tiers for Home's image-led cards, so their heights read as one
 * deliberate editorial scale rather than each component inventing its own
 * number. Ordered to match Home's own visual hierarchy - the hero is the
 * loudest moment on the screen, "feature" is the single personalised
 * practice (For This Moment), "statement" is the closing full-width
 * photo, "secondary" is Continue (real, but one step down from the
 * personalised pick), and "tertiary" covers the smaller supporting grids
 * (Quick Practice, Explore). Intentionally NOT one flat number - forcing
 * every image to the same height would flatten the hierarchy the mockup
 * establishes.
 */
export const imageHeight = {
  hero: 400,
  feature: 280,
  statement: 260,
  secondary: 220,
  tertiary: 170,
} as const;
