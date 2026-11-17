import { describe, expect, it } from 'vitest';
import { STARTUP, STARTUP_FADE_START_MS, STARTUP_MAX_MS, STARTUP_TOTAL_MS } from './startup-timing';

describe('start-up sequence timing', () => {
  it('never keeps a member waiting longer than the cap', () => {
    expect(STARTUP_TOTAL_MS).toBeLessThanOrEqual(STARTUP_MAX_MS);
  });

  it('fades out only after the breath has finished', () => {
    expect(STARTUP_FADE_START_MS).toBe(
      STARTUP.lotusIn + STARTUP.inhale + STARTUP.exhale + STARTUP.hold,
    );
    expect(STARTUP_TOTAL_MS).toBe(STARTUP_FADE_START_MS + STARTUP.fadeOut);
  });

  it('breathes out more slowly than it breathes in', () => {
    expect(STARTUP.exhale).toBeGreaterThan(STARTUP.inhale);
  });

  it('shows the wordmark and tagline before the dissolve begins', () => {
    expect(STARTUP.wordmarkDelay + STARTUP.wordmarkIn).toBeLessThan(STARTUP_FADE_START_MS);
    expect(STARTUP.taglineDelay + STARTUP.taglineIn).toBeLessThan(STARTUP_FADE_START_MS);
  });

  it('skipping or reduced motion is much shorter than the full sequence', () => {
    expect(STARTUP.skipFade).toBeLessThan(STARTUP_TOTAL_MS / 4);
  });
});
