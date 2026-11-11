import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { View } from 'react-native';
import { useFocusEffect, useLocalSearchParams } from 'expo-router';
import { ScreenContainer, ErrorNotice, ThemedText } from '@/components';
import { PageTitle } from '@/components/PageTitle';
import { home } from '@/components/home/homeTheme';
import { CompletedView } from '@/components/learning/CompletedView';
import { InProgressView } from '@/components/learning/InProgressView';
import { LearningTabs } from '@/components/learning/LearningTabs';
import { SavedView } from '@/components/learning/SavedView';
import { CheckInEntry } from '@/components/progress/CheckInEntry';
import { ProgressOverview } from '@/components/progress/ProgressOverview';
import { PrimaryButton } from '@/components';
import { useCheckInHistory } from '@/hooks/useCheckInHistory';
import { useToday } from '@/hooks/useToday';
import { UndoBar } from '@/components/learning/UndoBar';
import { PracticesSkeleton } from '@/components/practices/PracticesSkeleton';
import { useApiClient } from '@/hooks/useApiClient';
import { usePracticeHistory } from '@/hooks/usePracticeHistory';
import { usePractices } from '@/hooks/usePractices';
import { useSavedPractices } from '@/hooks/useSavedPractices';
import { useSavedRemoval } from '@/hooks/useSavedRemoval';
import {
  buildLearningIndex,
  completedEver,
  inProgressPractices,
  parseLearningView,
  type LearningView,
} from '@/lib/my-learning';
import { SAVED_REMOVAL_MESSAGES, visibleSaved } from '@/lib/saved-removal';

/**
 * My Learning: the member's relationship with the practice library in three views.
 *
 * - In Progress: practices whose latest session is unfinished (GET /api/v1/practices, which
 *   attaches each practice's latest session).
 * - Completed: practices completed at least once. The list cannot say this for a practice that was
 *   restarted, so it comes from Practice History (one entry per completed session, paged), shown one
 *   entry per practice; the history is only ever loaded a page at a time, by the member's own tap.
 * - Saved: bookmarked practices (GET /api/v1/practices/saved), whatever their completion state.
 *
 * Removing a practice from Saved waits for the server, then offers a brief Undo (see
 * src/lib/saved-removal.ts); it never changes a practice's In Progress or Completed state.
 *
 * The three are independent facts, so one practice can be in all of them; each row shows the other
 * states it is in. The full record (every session, reflections, check-ins) stays in Practice History
 * and My Journey, linked from Completed. See src/lib/my-learning.ts for the definitions.
 *
 * `?view=saved` (or `completed`) opens a view directly.
 */
export default function MyLearningScreen() {
  const params = useLocalSearchParams<{ view?: string }>();
  const [view, setView] = useState<LearningView>(() => parseLearningView(params.view));

  const practicesState = usePractices();
  const historyState = usePracticeHistory();
  const savedState = useSavedPractices();
  const checkInsState = useCheckInHistory();
  const todayState = useToday();

  // Coming back to this tab (after practising, saving or finishing a practice) shows what the server
  // says now. The first focus is skipped: the hooks already fetch on mount. The API client changes
  // identity on every render (see useApiClient), so the refresh functions live in a ref and the focus
  // callback stays stable.
  const refreshAll = useRef(() => {});
  useEffect(() => {
    refreshAll.current = () => {
      practicesState.refresh();
      historyState.refresh();
      savedState.refresh();
      checkInsState.reload();
      void todayState.refresh();
    };
  });
  const firstFocus = useRef(true);
  useFocusEffect(
    useCallback(() => {
      if (firstFocus.current) {
        firstFocus.current = false;
        return;
      }
      refreshAll.current();
    }, []),
  );

  const api = useApiClient();
  const removal = useSavedRemoval({
    unsave: useCallback((id: string) => api.delete(`/api/v1/practices/${id}/save`), [api]),
    save: useCallback((id: string) => api.post(`/api/v1/practices/${id}/save`), [api]),
  });

  const practices = useMemo(
    () => (practicesState.state.status === 'success' ? practicesState.state.practices : []),
    [practicesState.state],
  );
  const history = useMemo(
    () => (historyState.state.status === 'success' ? historyState.state.history : []),
    [historyState.state],
  );
  // What is still saved: the loaded list less anything removed this visit. Removing a practice from
  // Saved changes nothing about its In Progress or Completed state.
  const saved = useMemo(
    () =>
      visibleSaved(
        savedState.state.status === 'success' ? savedState.state.practices : [],
        removal.state,
      ),
    [savedState.state, removal.state],
  );
  const undoTitle = useMemo(() => {
    if (!removal.state.undoId || savedState.state.status !== 'success') return null;
    return (
      savedState.state.practices.find((p) => p.id === removal.state.undoId)?.title.trim() ?? null
    );
  }, [removal.state.undoId, savedState.state]);

  const inProgress = useMemo(() => inProgressPractices(practices), [practices]);
  const completed = useMemo(() => completedEver(history, practices), [history, practices]);
  const index = useMemo(
    () =>
      buildLearningIndex({
        practices,
        completed,
        savedIds: new Set(saved.map((practice) => practice.id)),
      }),
    [practices, completed, saved],
  );

  // A count is shown only when it is known. Completed is paged, so its count is exact only once
  // every page has been loaded.
  const completedCountKnown =
    historyState.state.status === 'success' && !historyState.state.hasMore;
  const counts = {
    ...(practicesState.state.status === 'success' ? { 'in-progress': inProgress.length } : {}),
    ...(completedCountKnown ? { completed: completed.length } : {}),
    ...(savedState.state.status === 'success' ? { saved: saved.length } : {}),
  };

  return (
    <View style={{ flex: 1 }}>
      <ScreenContainer scroll underHeader inTabs background={home.page}>
        <PageTitle
          title="My Progress"
          subtitle="A record of your check-ins and practice. Observable activity only."
        />

        {todayState.state.status === 'success' ? (
          <ProgressOverview data={todayState.state.data} />
        ) : null}

        <LearningTabs
          selected={view}
          onSelect={(next) => {
            removal.clearError();
            setView(next);
          }}
          counts={counts}
        />

        {view === 'in-progress' && (
          <>
            {practicesState.state.status === 'loading' && <PracticesSkeleton />}
            {practicesState.state.status === 'error' && (
              <ErrorNotice message={practicesState.state.message} onRetry={practicesState.reload} />
            )}
            {practicesState.state.status === 'success' && (
              <InProgressView practices={inProgress} index={index} />
            )}
          </>
        )}

        {view === 'completed' && (
          <>
            {historyState.state.status === 'loading' && <PracticesSkeleton />}
            {historyState.state.status === 'error' && (
              <ErrorNotice message={historyState.state.message} onRetry={historyState.reload} />
            )}
            {historyState.state.status === 'success' && (
              <CompletedView
                items={completed}
                index={index}
                hasMore={historyState.state.hasMore}
                loadingMore={historyState.state.loadingMore}
                onLoadMore={historyState.loadMore}
              />
            )}
          </>
        )}

        {view === 'check-ins' && (
          <>
            {checkInsState.state.status === 'loading' && <PracticesSkeleton />}
            {checkInsState.state.status === 'error' && (
              <ErrorNotice message={checkInsState.state.message} onRetry={checkInsState.reload} />
            )}
            {checkInsState.state.status === 'success' &&
              checkInsState.state.checkIns.length === 0 && (
                <ThemedText variant="body" color={home.ink}>
                  Your check-ins will appear here after you complete one on Home.
                </ThemedText>
              )}
            {checkInsState.state.status === 'success' &&
              checkInsState.state.checkIns.map((checkIn) => (
                <CheckInEntry key={checkIn.id} checkIn={checkIn} />
              ))}
            {checkInsState.state.status === 'success' && checkInsState.state.hasMore ? (
              <PrimaryButton
                label={checkInsState.state.loadingMore ? 'Loading…' : 'Load More'}
                variant="secondary"
                onPress={checkInsState.loadMore}
                loading={checkInsState.state.loadingMore}
              />
            ) : null}
          </>
        )}

        {view === 'saved' && (
          <>
            {savedState.state.status === 'loading' && <PracticesSkeleton />}
            {savedState.state.status === 'error' && (
              <ErrorNotice message={savedState.state.message} onRetry={savedState.reload} />
            )}
            {savedState.state.status === 'success' && (
              <SavedView
                practices={saved}
                index={index}
                pendingId={removal.state.pendingId}
                onRemove={(practice) => void removal.remove(practice.id)}
                errorMessage={
                  removal.state.error ? SAVED_REMOVAL_MESSAGES[removal.state.error] : null
                }
              />
            )}
          </>
        )}
      </ScreenContainer>
      {removal.state.undoId ? (
        <UndoBar
          message={undoTitle ? `Removed “${undoTitle}” from Saved.` : 'Removed from Saved.'}
          pending={removal.state.pendingId !== null}
          onUndo={() => void removal.undo()}
        />
      ) : null}
    </View>
  );
}
