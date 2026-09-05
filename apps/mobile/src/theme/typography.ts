import { Platform } from 'react-native';

/**
 * No TNSI brand font files exist for mobile yet (not sourced this phase -
 * see PHASE1_REPORT.md). `serif`/`system` fall back to each platform's
 * built-in serif/sans faces, which is enough to read as "editorial" for
 * Phase 1 without blocking on asset hunting.
 */
export const fontFamily = {
  serif: Platform.select({ ios: 'Georgia', android: 'serif', default: 'serif' }),
  system: Platform.select({ ios: 'System', android: 'sans-serif', default: 'System' }),
} as const;

export const typography = {
  display: {
    fontFamily: fontFamily.serif,
    fontSize: 32,
    lineHeight: 38,
  },
  heading: {
    fontFamily: fontFamily.serif,
    fontSize: 22,
    lineHeight: 28,
  },
  body: {
    fontFamily: fontFamily.system,
    fontSize: 16,
    lineHeight: 24,
  },
  label: {
    fontFamily: fontFamily.system,
    fontSize: 13,
    lineHeight: 18,
    letterSpacing: 0.4,
  },
  caption: {
    fontFamily: fontFamily.system,
    fontSize: 12,
    lineHeight: 16,
  },
} as const;
