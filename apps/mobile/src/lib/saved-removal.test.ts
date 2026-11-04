import { describe, expect, it } from 'vitest';
import {
  initialSavedRemoval,
  savedRemovalReducer as reduce,
  visibleSaved,
  type SavedRemovalAction,
  type SavedRemovalState,
} from './saved-removal';

const run = (actions: SavedRemovalAction[], from: SavedRemovalState = initialSavedRemoval) =>
  actions.reduce(reduce, from);

const list = [{ id: 'a' }, { id: 'b' }, { id: 'c' }];

describe('Saved removal', () => {
  it('keeps the row while the request is in flight, then removes it once the server confirms', () => {
    const pending = run([{ type: 'unsaveStart', id: 'b' }]);
    expect(pending.pendingId).toBe('b');
    expect(visibleSaved(list, pending).map((i) => i.id)).toEqual(['a', 'b', 'c']);

    const done = reduce(pending, { type: 'unsaveSuccess', id: 'b' });
    expect(done.pendingId).toBeNull();
    expect(done.undoId).toBe('b');
    expect(visibleSaved(list, done).map((i) => i.id)).toEqual(['a', 'c']);
  });

  it('keeps the row and reports an error when the unsave request fails', () => {
    const failed = run([{ type: 'unsaveStart', id: 'b' }, { type: 'unsaveFailure' }]);
    expect(failed.error).toBe('unsave');
    expect(failed.pendingId).toBeNull();
    expect(failed.undoId).toBeNull();
    expect(visibleSaved(list, failed).map((i) => i.id)).toEqual(['a', 'b', 'c']);
  });

  it('clears the error when the member tries again', () => {
    const retry = run([
      { type: 'unsaveStart', id: 'b' },
      { type: 'unsaveFailure' },
      { type: 'unsaveStart', id: 'b' },
    ]);
    expect(retry.error).toBeNull();
    expect(retry.pendingId).toBe('b');
  });

  it('ignores a second removal while one is still in flight', () => {
    const state = run([
      { type: 'unsaveStart', id: 'a' },
      { type: 'unsaveStart', id: 'b' },
    ]);
    expect(state.pendingId).toBe('a');
  });

  it('undo puts the practice back in its original place', () => {
    const undone = run([
      { type: 'unsaveStart', id: 'b' },
      { type: 'unsaveSuccess', id: 'b' },
      { type: 'undoStart' },
      { type: 'undoSuccess' },
    ]);
    expect(undone.undoId).toBeNull();
    expect(undone.removedIds).toEqual([]);
    expect(visibleSaved(list, undone).map((i) => i.id)).toEqual(['a', 'b', 'c']);
  });

  it('a failed undo leaves the practice removed, reports an error and keeps Undo on offer', () => {
    const failed = run([
      { type: 'unsaveStart', id: 'b' },
      { type: 'unsaveSuccess', id: 'b' },
      { type: 'undoStart' },
      { type: 'undoFailure' },
    ]);
    expect(failed.error).toBe('restore');
    expect(failed.undoId).toBe('b');
    expect(visibleSaved(list, failed).map((i) => i.id)).toEqual(['a', 'c']);
  });

  it('a newer removal replaces the Undo offer and the earlier removal stays final', () => {
    const state = run([
      { type: 'unsaveStart', id: 'a' },
      { type: 'unsaveSuccess', id: 'a' },
      { type: 'unsaveStart', id: 'b' },
      { type: 'unsaveSuccess', id: 'b' },
    ]);
    expect(state.undoId).toBe('b');
    expect(visibleSaved(list, state).map((i) => i.id)).toEqual(['c']);
    const undone = run([{ type: 'undoStart' }, { type: 'undoSuccess' }], state);
    expect(visibleSaved(list, undone).map((i) => i.id)).toEqual(['b', 'c']);
  });

  it('lets the Undo offer lapse without touching the removal', () => {
    const lapsed = run([
      { type: 'unsaveStart', id: 'b' },
      { type: 'unsaveSuccess', id: 'b' },
      { type: 'dismissUndo' },
    ]);
    expect(lapsed.undoId).toBeNull();
    expect(visibleSaved(list, lapsed).map((i) => i.id)).toEqual(['a', 'c']);
  });

  it('does nothing on Undo when there is nothing to undo', () => {
    expect(reduce(initialSavedRemoval, { type: 'undoStart' })).toBe(initialSavedRemoval);
  });
});
