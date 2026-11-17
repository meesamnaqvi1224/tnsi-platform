/**
 * Removing a practice from My Learning's Saved view.
 *
 * Unsaving only ever changes the SAVED fact: a practice that is in progress or completed stays in
 * those views. A removal is confirmed by the server before the row goes (the row shows a pending
 * state meanwhile); if the request fails the row simply stays and an error is shown. After a
 * successful removal a brief Undo is offered, and Undo re-saves through the same endpoint.
 *
 * This is the pure state machine; `useSavedRemoval` runs it with the real requests.
 */

export type SavedRemovalError = 'unsave' | 'restore';

export interface SavedRemovalState {
  /** Practices unsaved successfully this visit: hidden from Saved even though the loaded list still has them. */
  removedIds: readonly string[];
  /** The one practice with a request in flight (an unsave or an undo), if any. */
  pendingId: string | null;
  /** The most recent removal, while its Undo is on offer. */
  undoId: string | null;
  error: SavedRemovalError | null;
}

export const initialSavedRemoval: SavedRemovalState = {
  removedIds: [],
  pendingId: null,
  undoId: null,
  error: null,
};

export type SavedRemovalAction =
  | { type: 'unsaveStart'; id: string }
  | { type: 'unsaveSuccess'; id: string }
  | { type: 'unsaveFailure' }
  | { type: 'undoStart' }
  | { type: 'undoSuccess' }
  | { type: 'undoFailure' }
  | { type: 'dismissUndo' }
  | { type: 'clearError' };

export function savedRemovalReducer(
  state: SavedRemovalState,
  action: SavedRemovalAction,
): SavedRemovalState {
  switch (action.type) {
    case 'unsaveStart':
      if (state.pendingId) return state;
      return { ...state, pendingId: action.id, error: null };
    case 'unsaveSuccess':
      return {
        ...state,
        pendingId: null,
        removedIds: state.removedIds.includes(action.id)
          ? state.removedIds
          : [...state.removedIds, action.id],
        // A newer removal replaces the Undo offer; the earlier one is final.
        undoId: action.id,
      };
    case 'unsaveFailure':
      return { ...state, pendingId: null, error: 'unsave' };
    case 'undoStart':
      if (!state.undoId || state.pendingId) return state;
      return { ...state, pendingId: state.undoId, error: null };
    case 'undoSuccess': {
      // The practice being restored is the one in flight, not whatever undoId says now.
      const restoredId = state.pendingId ?? state.undoId;
      return {
        ...state,
        pendingId: null,
        removedIds: state.removedIds.filter((id) => id !== restoredId),
        undoId: null,
      };
    }
    case 'undoFailure':
      // The practice stays removed and the Undo stays on offer until it lapses, so it can be retried.
      return { ...state, pendingId: null, error: 'restore' };
    case 'dismissUndo':
      // While the Undo request is in flight the offer cannot lapse: its outcome must still land on this practice.
      if (state.pendingId !== null && state.pendingId === state.undoId) return state;
      return { ...state, undoId: null };
    case 'clearError':
      return { ...state, error: null };
  }
}

/** The saved list without what was removed this visit. Order is untouched, so an undone practice returns where it was. */
export function visibleSaved<T extends { id: string }>(
  list: readonly T[],
  state: SavedRemovalState,
): T[] {
  return list.filter((item) => !state.removedIds.includes(item.id));
}

export const SAVED_REMOVAL_MESSAGES: Record<SavedRemovalError, string> = {
  unsave: "We couldn't remove that from your saved practices. Please try again.",
  restore: "We couldn't save that practice again. Please try again.",
};

/** How long the Undo is offered after a removal. */
export const UNDO_WINDOW_MS = 6000;
