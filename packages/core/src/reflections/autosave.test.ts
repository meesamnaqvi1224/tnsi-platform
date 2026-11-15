import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createAutosaver, type Autosaver } from './autosave';

/** A save we can hold open and then resolve, to prove saves never overlap. */
function controllable() {
  const calls: Array<(ok: boolean) => void> = [];
  const run = vi.fn(() => new Promise<boolean>((resolve) => calls.push(resolve)));
  return { run, calls, finish: (i: number, ok = true) => calls[i]!(ok) };
}

let autosaver: Autosaver | undefined;
beforeEach(() => vi.useFakeTimers());
afterEach(() => {
  autosaver?.cancel();
  vi.useRealTimers();
});

describe('createAutosaver', () => {
  it('saves a quiet moment after the last edit, not before, and only once', async () => {
    const run = vi.fn(async () => true);
    autosaver = createAutosaver({ run, shouldRun: () => true });
    autosaver.notifyChange();
    await vi.advanceTimersByTimeAsync(1_999);
    expect(run).not.toHaveBeenCalled();
    autosaver.notifyChange(); // typing again restarts the wait
    await vi.advanceTimersByTimeAsync(1_999);
    expect(run).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(1);
    expect(run).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(60_000);
    expect(run).toHaveBeenCalledTimes(1);
    expect(autosaver.status()).toBe('idle');
  });

  it('still saves during continuous typing (never waits longer than the maximum)', async () => {
    const run = vi.fn(async () => true);
    autosaver = createAutosaver({ run, shouldRun: () => true });
    for (let i = 0; i < 14; i += 1) {
      autosaver.notifyChange();
      await vi.advanceTimersByTimeAsync(1_000); // never a 2s pause
    }
    expect(run).not.toHaveBeenCalled();
    autosaver.notifyChange();
    await vi.advanceTimersByTimeAsync(1_000);
    expect(run).toHaveBeenCalledTimes(1);
  });

  it('never runs two saves at once; edits during a save cause exactly one more afterwards', async () => {
    const { run, calls, finish } = controllable();
    autosaver = createAutosaver({ run, shouldRun: () => true });
    autosaver.notifyChange();
    await vi.advanceTimersByTimeAsync(2_000);
    expect(run).toHaveBeenCalledTimes(1);
    expect(autosaver.status()).toBe('saving');
    autosaver.notifyChange();
    autosaver.notifyChange();
    await vi.advanceTimersByTimeAsync(10_000);
    expect(run).toHaveBeenCalledTimes(1); // still the first one in flight
    finish(0);
    await vi.advanceTimersByTimeAsync(2_000);
    expect(run).toHaveBeenCalledTimes(2);
    finish(1);
    await vi.advanceTimersByTimeAsync(60_000);
    expect(run).toHaveBeenCalledTimes(2);
    expect(calls).toHaveLength(2);
  });

  it('retries a failed save with growing delays, and recovers when one succeeds', async () => {
    let ok = false;
    const run = vi.fn(async () => ok);
    autosaver = createAutosaver({ run, shouldRun: () => true });
    autosaver.notifyChange();
    await vi.advanceTimersByTimeAsync(2_000);
    expect(run).toHaveBeenCalledTimes(1);
    expect(autosaver.status()).toBe('failed');
    await vi.advanceTimersByTimeAsync(4_999);
    expect(run).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(1);
    expect(run).toHaveBeenCalledTimes(2); // after 5s
    await vi.advanceTimersByTimeAsync(9_999);
    expect(run).toHaveBeenCalledTimes(2);
    ok = true;
    await vi.advanceTimersByTimeAsync(1);
    expect(run).toHaveBeenCalledTimes(3); // after a further 10s
    expect(autosaver.status()).toBe('idle');
    await vi.advanceTimersByTimeAsync(120_000);
    expect(run).toHaveBeenCalledTimes(3);
  });

  it('caps the retry delay, and treats a thrown error as a failure', async () => {
    const run = vi.fn(async () => {
      throw new Error('boom');
    });
    autosaver = createAutosaver({ run, shouldRun: () => true, retryMs: 5_000, maxRetryMs: 20_000 });
    autosaver.notifyChange();
    await vi.advanceTimersByTimeAsync(2_000); // 1st run
    await vi.advanceTimersByTimeAsync(5_000); // 2nd
    await vi.advanceTimersByTimeAsync(10_000); // 3rd
    await vi.advanceTimersByTimeAsync(20_000); // 4th
    await vi.advanceTimersByTimeAsync(20_000); // 5th: capped, not 40s
    expect(run).toHaveBeenCalledTimes(5);
    expect(autosaver.status()).toBe('failed');
  });

  it('flush saves immediately and resolves only when nothing is pending or running', async () => {
    const { run, finish } = controllable();
    autosaver = createAutosaver({ run, shouldRun: () => true });
    autosaver.notifyChange();
    let done = false;
    const flushed = autosaver.flush().then(() => (done = true));
    await vi.advanceTimersByTimeAsync(0);
    expect(run).toHaveBeenCalledTimes(1); // no waiting for the quiet period
    expect(done).toBe(false);
    finish(0);
    await flushed;
    expect(done).toBe(true);
    expect(autosaver.status()).toBe('idle');
  });

  it('settle waits for a running save and cancels the timer WITHOUT starting a new save', async () => {
    const { run, finish } = controllable();
    autosaver = createAutosaver({ run, shouldRun: () => true });
    autosaver.notifyChange();
    await vi.advanceTimersByTimeAsync(2_000);
    autosaver.notifyChange();
    let settled = false;
    const p = autosaver.settle().then(() => (settled = true));
    await vi.advanceTimersByTimeAsync(10_000);
    expect(settled).toBe(false);
    finish(0);
    await p;
    await vi.advanceTimersByTimeAsync(10_000);
    expect(run).toHaveBeenCalledTimes(1);
  });

  it('does not save when there is nothing worth saving, and stops after cancel', async () => {
    const run = vi.fn(async () => true);
    let worth = false;
    autosaver = createAutosaver({ run, shouldRun: () => worth });
    autosaver.notifyChange();
    await vi.advanceTimersByTimeAsync(5_000);
    expect(run).not.toHaveBeenCalled();
    expect(autosaver.status()).toBe('idle');
    worth = true;
    autosaver.notifyChange();
    autosaver.cancel();
    await vi.advanceTimersByTimeAsync(60_000);
    expect(run).not.toHaveBeenCalled();
  });
});
