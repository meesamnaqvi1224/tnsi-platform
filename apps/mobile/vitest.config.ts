import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

/**
 * No test runner existed anywhere in `apps/mobile` before this milestone
 * (no jest/jest-expo, no test script, no testing-library). Rather than
 * introduce a new React Native component-testing stack (jest-expo +
 * @testing-library/react-native + native-module mocks for Clerk/expo-*)
 * for one focused milestone, this extends the same `vitest` already used
 * project-wide (apps/web, packages/cms, packages/auth, packages/integrations)
 * to this package too - for the plain TypeScript logic that doesn't
 * itself import React Native or Clerk (ordering, API client response
 * shaping). See docs/TNSI_Somatic_Card_Mobile_UI_v1.md §Tests for the
 * full reasoning and the resulting scope of what is/isn't covered.
 */
export default defineConfig({
  test: {
    environment: 'node',
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
});
