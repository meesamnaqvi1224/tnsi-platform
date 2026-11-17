import { useEffect } from 'react';
import * as WebBrowser from 'expo-web-browser';

/**
 * Pre-warms the Android Custom Tab (a no-op on iOS) so the Google OAuth
 * browser sheet opens without a visible delay. Recommended by Clerk's own
 * Expo OAuth guide: https://clerk.com/docs/references/expo/web-browser
 */
export function useWarmUpBrowser() {
  useEffect(() => {
    void WebBrowser.warmUpAsync();
    return () => {
      void WebBrowser.coolDownAsync();
    };
  }, []);
}
