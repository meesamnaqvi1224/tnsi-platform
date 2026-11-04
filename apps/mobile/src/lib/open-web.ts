import { Linking } from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import { env } from '@/lib/env';
import { buildTnsiUrl, type TnsiPage } from '@/lib/web-links';

/**
 * Opens an official TNSI page in the native in-app browser (SFSafariViewController on iOS, Chrome
 * Custom Tabs on Android), so the member stays signed in to their own browser session and
 * returns to the app by closing it. Falls back to the system browser if that is unavailable.
 * Resolves when the browser is dismissed.
 */
export async function openTnsiPage(page: TnsiPage): Promise<void> {
  const url = buildTnsiUrl(env.apiBaseUrl, page);
  try {
    await WebBrowser.openBrowserAsync(url);
  } catch {
    await Linking.openURL(url);
  }
}
