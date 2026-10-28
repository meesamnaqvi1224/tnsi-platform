/** The two preferences on the intro screen, remembered between sessions (as on the web). */
export interface ReturnPathSettings {
  /** Add a gentle pause between the in-breath and the out-breath. */
  pause: boolean;
  /** Practise without breath focus: markers become plain timed pauses. */
  noBreath: boolean;
}

export const DEFAULT_SETTINGS: ReturnPathSettings = { pause: false, noBreath: false };

/** Reads what was stored; anything missing or malformed falls back to the defaults. */
export function parseSettings(raw: string | null | undefined): ReturnPathSettings {
  if (!raw) return DEFAULT_SETTINGS;
  try {
    const value = JSON.parse(raw) as Partial<ReturnPathSettings> | null;
    return { pause: value?.pause === true, noBreath: value?.noBreath === true };
  } catch {
    return DEFAULT_SETTINGS;
  }
}
