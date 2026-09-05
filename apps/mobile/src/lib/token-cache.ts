import * as SecureStore from 'expo-secure-store';
import type { TokenCache } from '@clerk/clerk-expo';

/**
 * Clerk session tokens must live in the platform Keychain/Keystore, never
 * in AsyncStorage (plaintext, not encrypted at rest) - see the Phase 0
 * audit's security review. `expo-secure-store` wraps iOS Keychain /
 * Android Keystore.
 */
export const tokenCache: TokenCache = {
  async getToken(key: string) {
    try {
      return await SecureStore.getItemAsync(key);
    } catch {
      return null;
    }
  },
  async saveToken(key: string, value: string) {
    try {
      await SecureStore.setItemAsync(key, value);
    } catch {
      // Best-effort: if secure storage is unavailable, the user will just
      // need to sign in again next launch rather than crash the app.
    }
  },
};
