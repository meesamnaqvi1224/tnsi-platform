import type { ExpoConfig } from 'expo/config';

/**
 * Phase 1: native shell + auth only. No production icon/splash assets exist
 * yet (deliberately not fabricated this phase - see PHASE1_REPORT.md) so
 * this config omits `icon`/`splash` and lets Expo fall back to its
 * defaults; add real brand assets before any EAS/store-facing build.
 */
const config: ExpoConfig = {
  name: 'TNSI',
  slug: 'tnsi-mobile',
  scheme: 'tnsi',
  version: '0.1.0',
  orientation: 'portrait',
  userInterfaceStyle: 'automatic',
  ios: {
    bundleIdentifier: 'org.tnsi.mobile',
    supportsTablet: false,
  },
  android: {
    package: 'org.tnsi.mobile',
  },
  plugins: ['expo-router', 'expo-secure-store'],
  experiments: {
    typedRoutes: true,
  },
  extra: {
    router: {},
  },
};

export default config;
