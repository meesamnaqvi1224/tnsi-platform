import { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { ScreenContainer, ErrorNotice, ThemedText, PrimaryButton } from '@/components';
import { CheckInEntry } from '@/components/progress/CheckInEntry';
import { useCheckInHistory } from '@/hooks/useCheckInHistory';
import { usePractices } from '@/hooks/usePractices';
import { colors, radius, spacing } from '@/theme';

/**
 * Progress: a chronological record of two genuinely separate activity
 * streams - check-ins and practice activity - never combined into one
 * metric, score, or trend. Check-in history and practice summary are two
 * independent data sources (separate hooks, separate loading/error states)
 * so a failure in one never hides the other. No Capacity Assessment section:
 * `assessment_submissions` rows carry no `userId` today (see the Phase 9.1
 * audit), so there is no reliable way to show "this user's" assessment
 * history without inventing an account-linking mechanism this phase
 * explicitly does not build.
 */
export default function ProgressScreen() {
  const router = useRouter();
  const {
    state: checkInsState,
    reload: reloadCheckIns,
    loadMore: loadMoreCheckIns,
  } = useCheckInHistory();
  const { state: practicesState } = usePractices();

  return (
    <ScreenContainer scroll>
      <ThemedText variant="label" color={colors.bronze} style={styles.eyebrow}>
        Progress
      </ThemedText>
      <ThemedText variant="display" style={styles.heading}>
        Notice what you&apos;re practising.
      </ThemedText>
      <ThemedText variant="body" color={colors.charcoal} style={styles.subtitle}>
        A simple record of your check-ins and practice activity over time.
      </ThemedText>

      <CheckInsSection
        state={checkInsState}
        onRetry={reloadCheckIns}
        onLoadMore={loadMoreCheckIns}
      />
      <PracticeSummarySection
        state={practicesState}
        onViewMyLearning={() => router.push('/my-learning')}
      />
    </ScreenContainer>
  );
}

function CheckInsSection({
  state,
  onRetry,
  onLoadMore,
}: {
  state: ReturnType<typeof useCheckInHistory>['state'];
  onRetry: () => void;
  onLoadMore: () => void;
}) {
  return (
    <View style={styles.section}>
      <View accessibilityRole="header" accessible>
        <ThemedText variant="heading" style={styles.sectionTitle}>
          Your Check-Ins
        </ThemedText>
      </View>

      {state.status === 'loading' && <ProgressSkeleton />}

      {state.status === 'error' && (
        // A failed check-in fetch never affects the Practice summary below -
        // it renders from its own independent hook regardless of this state.
        <ErrorNotice message={state.message} onRetry={onRetry} />
      )}

      {state.status === 'success' && state.checkIns.length === 0 && (
        <View>
          <ThemedText variant="body" style={styles.emptyTitle}>
            No check-ins yet.
          </ThemedText>
          <ThemedText variant="body" color={colors.charcoal}>
            Your daily check-ins will appear here as you use TNSI.
          </ThemedText>
        </View>
      )}

      {state.status === 'success' && state.checkIns.length > 0 && (
        <>
          {state.checkIns.map((checkIn) => (
            <CheckInEntry key={checkIn.id} checkIn={checkIn} />
          ))}

          {state.hasMore ? (
            <PrimaryButton
              label={state.loadingMore ? 'Loading…' : 'Load More'}
              variant="secondary"
              onPress={onLoadMore}
              loading={state.loadingMore}
              style={styles.loadMore}
            />
          ) : null}
        </>
      )}
    </View>
  );
}

function PracticeSummarySection({
  state,
  onViewMyLearning,
}: {
  state: ReturnType<typeof usePractices>['state'];
  onViewMyLearning: () => void;
}) {
  const counts = useMemo(() => {
    if (state.status !== 'success') return null;
    const completed = state.practices.filter((p) => p.progress?.completed).length;
    const inProgress = state.practices.filter((p) => {
      const pct = p.progress?.progressPct ?? 0;
      return !p.progress?.completed && pct > 0 && pct < 1;
    }).length;
    return { completed, inProgress };
  }, [state]);

  return (
    <View style={styles.section}>
      <View accessibilityRole="header" accessible>
        <ThemedText variant="heading" style={styles.sectionTitle}>
          Your Practice
        </ThemedText>
      </View>

      {state.status === 'loading' && <ProgressSkeleton />}

      {state.status === 'error' && <ErrorNotice message={state.message} />}

      {state.status === 'success' && counts && (
        <>
          {counts.completed === 0 && counts.inProgress === 0 ? (
            <ThemedText variant="body" color={colors.charcoal} style={styles.emptyTitle}>
              Your practice activity will appear here as you begin.
            </ThemedText>
          ) : (
            <View style={styles.countRow}>
              <ThemedText variant="body">
                {counts.completed} {counts.completed === 1 ? 'practice' : 'practices'} completed
              </ThemedText>
              <ThemedText variant="body">
                {counts.inProgress} {counts.inProgress === 1 ? 'practice' : 'practices'} in progress
              </ThemedText>
            </View>
          )}

          <PrimaryButton
            label="View My Learning"
            variant="secondary"
            onPress={onViewMyLearning}
            style={styles.myLearningButton}
          />
        </>
      )}
    </View>
  );
}

/** Static placeholder blocks while a section's data loads - no animation, matching HomeSkeleton/PracticesSkeleton. */
function ProgressSkeleton() {
  return (
    <View accessibilityLabel="Loading">
      <View style={styles.skeletonBlock} />
    </View>
  );
}

const styles = StyleSheet.create({
  eyebrow: {
    textTransform: 'uppercase',
    marginBottom: spacing.sm,
  },
  heading: {
    marginBottom: spacing.sm,
  },
  subtitle: {
    marginBottom: spacing.xl,
  },
  section: {
    marginBottom: spacing.xl,
  },
  sectionTitle: {
    marginBottom: spacing.md,
  },
  emptyTitle: {
    marginBottom: spacing.xs,
  },
  countRow: {
    marginBottom: spacing.md,
  },
  myLearningButton: {
    marginTop: spacing.xs,
  },
  loadMore: {
    marginTop: spacing.sm,
  },
  skeletonBlock: {
    height: 120,
    borderRadius: radius.md,
    backgroundColor: colors.creamMuted,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
});
