/**
 * Timings (milliseconds) of the start-up sequence, kept apart from the
 * component so the total can be checked: a launch animation must never keep a
 * member waiting. One slow breath: the lotus rises, breathes in, breathes out,
 * the wordmark settles beneath it, then the whole screen dissolves into the app.
 */
export const STARTUP = {
  /** Lotus fades and scales up to full size. */
  lotusIn: 700,
  /** The in-breath: the lotus and its glow grow. */
  inhale: 600,
  /** The out-breath: they settle (longer than the in-breath, as in the practices). */
  exhale: 900,
  /** A beat of stillness before the dissolve. */
  hold: 100,
  /** The overlay fades away, revealing the app. */
  fadeOut: 400,
  /** The wordmark appears this long after the start, and fades in over `wordmarkIn`. */
  wordmarkDelay: 450,
  wordmarkIn: 700,
  taglineDelay: 800,
  taglineIn: 600,
  /** Tapping to skip, or reduced motion: a quick dissolve instead. */
  skipFade: 250,
} as const;

/** The moment the dissolve starts. */
export const STARTUP_FADE_START_MS =
  STARTUP.lotusIn + STARTUP.inhale + STARTUP.exhale + STARTUP.hold;

/** Total time the overlay is on screen. */
export const STARTUP_TOTAL_MS = STARTUP_FADE_START_MS + STARTUP.fadeOut;

/** The longest the sequence may ever take. */
export const STARTUP_MAX_MS = 3000;
