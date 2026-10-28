import * as SecureStore from 'expo-secure-store';
import { DEFAULT_SETTINGS, parseSettings, type ReturnPathSettings } from './settings';

const STORAGE_KEY = 'return-path-settings';

export async function loadSettings(): Promise<ReturnPathSettings> {
  try {
    return parseSettings(await SecureStore.getItemAsync(STORAGE_KEY));
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export async function saveSettings(settings: ReturnPathSettings): Promise<void> {
  try {
    await SecureStore.setItemAsync(STORAGE_KEY, JSON.stringify(settings));
  } catch {
    // Storage unavailable: the preference simply isn't remembered.
  }
}
