import type { ExpoConfig } from 'expo/config';

/**
 * Real brand assets: the lotus mark from Caroline's "The Nervous System
 * Institute" lockup, supplied directly by her (see
 * assets/images/icon.png / adaptive-icon.png / splash.png).
 */
const config: ExpoConfig = {
  name: 'TNSI',
  slug: 'tnsi-mobile',
  scheme: 'tnsi',
  version: '0.1.0',
  orientation: 'portrait',
  userInterfaceStyle: 'automatic',
  icon: './assets/images/icon.png',
  ios: {
    bundleIdentifier: 'org.tnsi.mobile',
    buildNumber: '1',
    supportsTablet: false,
  },
  android: {
    package: 'org.tnsi.mobile',
    versionCode: 1,
    adaptiveIcon: {
      foregroundImage: './assets/images/adaptive-icon.png',
      backgroundColor: '#0D141C',
    },
  },
  plugins: [
    'expo-router',
    'expo-secure-store',
    'expo-video',
    'expo-audio',
    [
      'expo-splash-screen',
      {
        image: './assets/images/splash.png',
        backgroundColor: '#0D141C',
        resizeMode: 'contain',
      },
    ],
    [
      'expo-image-picker',
      {
        photosPermission: 'Allow TNSI to access your photos to set a profile picture.',
      },
    ],
  ],
  experiments: {
    typedRoutes: true,
  },
  extra: {
    router: {},
  },
};

export default config;
