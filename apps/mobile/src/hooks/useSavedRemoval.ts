import { useCallback, useEffect, useReducer } from 'react';
import {
  UNDO_WINDOW_MS,
  initialSavedRemoval,
  savedRemovalReducer,
  type SavedRemovalState,
} from '@/lib/saved-removal';

interface SavedRemovalRequests {
  /** DELETE /api/v1/practices/[id]/save. Rejects if the request fails. */
  unsave: (practiceId: string) => Promise<unknown>;
  /** POST /api/v1/practices/[id]/save, for Undo. Rejects if the request fails. */
  save: (practiceId: string) => Promise<unknown>;
}

/**
 * Runs Saved-view removals with the real requests (see src/lib/saved-removal.ts for the rules).
 * The state lives with the screen, not the Saved view, so a removal still holds if the member
 * switches tabs and comes back.
 */
export function useSavedRemoval({ unsave, save }: SavedRemovalRequests) {
  const [state, dispatch] = useReducer(savedRemovalReducer, initialSavedRemoval);

  // The Undo is offered briefly, then lapses; the removal itself is already final.
  useEffect(() => {
    if (!state.undoId) return;
    const timer = setTimeout(() => dispatch({ type: 'dismissUndo' }), UNDO_WINDOW_MS);
    return () => clearTimeout(timer);
  }, [state.undoId]);

  const remove = useCallback(
    async (practiceId: string) => {
      if (state.pendingId) return;
      dispatch({ type: 'unsaveStart', id: practiceId });
      try {
        await unsave(practiceId);
        dispatch({ type: 'unsaveSuccess', id: practiceId });
      } catch {
        dispatch({ type: 'unsaveFailure' });
      }
    },
    [state.pendingId, unsave],
  );

  const undo = useCallback(async () => {
    const practiceId = state.undoId;
    if (!practiceId || state.pendingId) return;
    dispatch({ type: 'undoStart' });
    try {
      await save(practiceId);
      dispatch({ type: 'undoSuccess' });
    } catch {
      dispatch({ type: 'undoFailure' });
    }
  }, [state.undoId, state.pendingId, save]);

  const clearError = useCallback(() => dispatch({ type: 'clearError' }), []);

  return { state: state satisfies SavedRemovalState, remove, undo, clearError };
}
