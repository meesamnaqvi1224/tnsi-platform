/**
 * Server-side draft autosave scheduling for My Reflections, free of any framework so it is tested once and
 * can be reused by the app. It only decides WHEN to save; the caller's `run` does the saving (to the
 * member's own journal API), so nothing is ever stored on the device by this module.
 *
 * Behaviour:
 *  - `notifyChange()` after every edit: a save runs `debounceMs` after the last edit, and never later than
 *    `maxWaitMs` after the first unsaved edit (so continuous typing still saves).
 *  - One save at a time. Edits made while a save is running trigger exactly one further save afterwards.
 *  - A failed save is retried after `retryMs`, doubling up to `maxRetryMs`; any new edit also retries.
 *  - `flush()` saves now (tab hidden, leaving the page) and resolves when nothing is pending or running.
 *  - `settle()` stops the timers and waits for a running save, WITHOUT starting a new one: used before an
 *    explicit Save so the two never race.
 */
export interface AutosaverOptions {
  /** Performs one save. Resolves true when the server confirmed it, false when it failed (never throws). */
  run: () => Promise<boolean>;
  /** Whether there is anything worth saving right now (for example: not blank, not already saved). */
  shouldRun: () => boolean;
  debounceMs?: number;
  maxWaitMs?: number;
  retryMs?: number;
  maxRetryMs?: number;
  /** Timer functions, replaceable in tests. */
  setTimer?: (fn: () => void, ms: number) => unknown;
  clearTimer?: (handle: unknown) => void;
  now?: () => number;
}

export type AutosaveStatus = 'idle' | 'pending' | 'saving' | 'failed';

export interface Autosaver {
  notifyChange(): void;
  flush(): Promise<void>;
  settle(): Promise<void>;
  cancel(): void;
  status(): AutosaveStatus;
}

export const AUTOSAVE_DEBOUNCE_MS = 2_000;
export const AUTOSAVE_MAX_WAIT_MS = 15_000;
export const AUTOSAVE_RETRY_MS = 5_000;
export const AUTOSAVE_MAX_RETRY_MS = 60_000;

export function createAutosaver(options: AutosaverOptions): Autosaver {
  const debounceMs = options.debounceMs ?? AUTOSAVE_DEBOUNCE_MS;
  const maxWaitMs = options.maxWaitMs ?? AUTOSAVE_MAX_WAIT_MS;
  const retryBase = options.retryMs ?? AUTOSAVE_RETRY_MS;
  const retryCap = options.maxRetryMs ?? AUTOSAVE_MAX_RETRY_MS;
  const setTimer = options.setTimer ?? ((fn, ms) => setTimeout(fn, ms));
  const clearTimer =
    options.clearTimer ?? ((h) => clearTimeout(h as ReturnType<typeof setTimeout>));
  const now = options.now ?? (() => Date.now());

  let timer: unknown = null;
  let firstChangeAt: number | null = null;
  let dirty = false; // an edit not yet covered by a started save
  let inflight: Promise<void> | null = null;
  let failed = false;
  let retryDelay = retryBase;
  let cancelled = false;

  function stopTimer() {
    if (timer !== null) {
      clearTimer(timer);
      timer = null;
    }
  }

  function arm(delay: number) {
    stopTimer();
    timer = setTimer(() => {
      timer = null;
      void start();
    }, delay);
  }

  function start(): Promise<void> {
    if (cancelled) return Promise.resolve();
    if (inflight) return inflight;
    stopTimer();
    if (!dirty && !failed) return Promise.resolve();
    if (!options.shouldRun()) {
      dirty = false;
      firstChangeAt = null;
      return Promise.resolve();
    }
    dirty = false;
    firstChangeAt = null;
    inflight = (async () => {
      let ok = false;
      try {
        ok = await options.run();
      } catch {
        ok = false;
      }
      inflight = null;
      if (cancelled) return;
      if (ok) {
        failed = false;
        retryDelay = retryBase;
        // Edits made while saving: one more save, after the usual quiet period.
        if (dirty) {
          firstChangeAt = firstChangeAt ?? now();
          arm(debounceMs);
        }
      } else {
        failed = true;
        dirty = true; // the failed text still needs saving
        firstChangeAt = firstChangeAt ?? now();
        arm(retryDelay);
        retryDelay = Math.min(retryDelay * 2, retryCap);
      }
    })();
    return inflight;
  }

  return {
    notifyChange() {
      if (cancelled) return;
      dirty = true;
      const t = now();
      if (firstChangeAt === null) firstChangeAt = t;
      if (inflight) return; // rescheduled when the running save finishes
      const waited = t - firstChangeAt;
      arm(Math.max(0, Math.min(debounceMs, maxWaitMs - waited)));
    },
    async flush() {
      if (cancelled) return;
      stopTimer();
      if (inflight) await inflight;
      if (dirty || failed) await start();
      if (inflight) await inflight;
    },
    async settle() {
      stopTimer();
      if (inflight) await inflight;
      stopTimer();
    },
    cancel() {
      cancelled = true;
      stopTimer();
    },
    status() {
      if (inflight) return 'saving';
      if (failed) return 'failed';
      return dirty ? 'pending' : 'idle';
    },
  };
}
