import { useCallback, useEffect, useRef, useState } from 'react';
import { cycleStateAt, isSessionComplete, remainingSeconds } from '@/lib/breathing';

/** How often the clock re-samples the monotonic clock and re-renders.
 * Deliberately short so the countdown/animation feel continuous, but the
 * tick rate is never the source of truth for elapsed time - see the
 * interval callback below, which always recomputes from timestamps rather
 * than accumulating `TICK_MS` increments. */
const TICK_MS = 200;

export type BreathingRunState = 'running' | 'paused' | 'complete';

/**
 * Owns a breathing session's clock. Elapsed *active* time is always
 * computed from `performance.now()` deltas - deliberately not
 * `Date.now()`. `Date.now()` returns wall-clock time, which is not
 * monotonic: an NTP correction, a manual clock change, or a DST/timezone
 * adjustment mid-session could make it jump forward or backward, which
 * would make this timer's remaining time jump or even run backward.
 * `performance.now()` is guaranteed monotonic by spec (unaffected by any
 * of that) and is exactly the right tool for measuring "how much time has
 * elapsed" as opposed to "what time is it" - `Date.now()` stays the right
 * choice elsewhere in this app for real calendar dates (e.g. a check-in's
 * `completedDate`), just not here. Available in this project's Hermes/RN
 * runtime with no new dependency.
 *
 * A delayed tick (a busy JS thread, the app briefly backgrounded, a slow
 * re-render) can't cause drift either: the very next tick just recomputes
 * true elapsed time from the timestamps already held, and catches up
 * instantly rather than compounding an error.
 *
 * All impure work (reading the clock, reading refs) happens inside the
 * interval callback and the mount effect - never during render - so
 * `elapsedActiveMs` is plain React state by the time this hook's return
 * value is computed, and `remaining`/`cycle` are pure functions of that
 * state alone.
 *
 * Pausing records the moment it happened; resuming adds the paused span
 * to a running total that's subtracted out of every elapsed-time
 * calculation, so time truly spent paused never counts toward the
 * session. Completion is derived from elapsed time and latched via a ref
 * the instant it's first true, guaranteeing it fires exactly once even
 * though the tick interval keeps sampling at TICK_MS.
 */
export function useBreathingTimer(totalSeconds: number) {
  const [runState, setRunState] = useState<BreathingRunState>('running');
  const [elapsedActiveMs, setElapsedActiveMs] = useState(0);

  const startedAtRef = useRef<number | null>(null);
  const pausedAtRef = useRef<number | null>(null);
  const totalPausedMsRef = useRef(0);
  const completedRef = useRef(false);

  useEffect(() => {
    startedAtRef.current = performance.now();

    function computeElapsedActiveMs(): number {
      const now = performance.now();
      const startedAt = startedAtRef.current ?? now;
      const pausedNowMs = pausedAtRef.current !== null ? now - pausedAtRef.current : 0;
      const raw = now - startedAt - totalPausedMsRef.current - pausedNowMs;
      return Math.min(totalSeconds * 1000, Math.max(0, raw));
    }

    const intervalId = setInterval(() => {
      if (pausedAtRef.current !== null) return;

      const elapsed = computeElapsedActiveMs();
      setElapsedActiveMs(elapsed);

      if (!completedRef.current && isSessionComplete(totalSeconds, elapsed)) {
        completedRef.current = true;
        setRunState('complete');
        clearInterval(intervalId);
      }
    }, TICK_MS);

    return () => clearInterval(intervalId);
  }, [totalSeconds]);

  const pause = useCallback(() => {
    if (pausedAtRef.current !== null || completedRef.current) return;
    pausedAtRef.current = performance.now();
    setRunState('paused');
  }, []);

  const resume = useCallback(() => {
    if (pausedAtRef.current === null || completedRef.current) return;
    totalPausedMsRef.current += performance.now() - pausedAtRef.current;
    pausedAtRef.current = null;
    setRunState('running');
  }, []);

  return {
    runState,
    elapsedActiveMs,
    remaining: remainingSeconds(totalSeconds, elapsedActiveMs),
    cycle: cycleStateAt(elapsedActiveMs),
    pause,
    resume,
  };
}
