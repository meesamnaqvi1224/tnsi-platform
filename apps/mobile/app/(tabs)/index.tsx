import { useMemo } from 'react';
import { KeyboardAvoidingView, Platform, StyleSheet } from 'react-native';
import { useUser } from '@clerk/clerk-expo';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { ScreenContainer, ErrorNotice, ThemedText, Card } from '@/components';
import { WelcomeHeader } from '@/components/home/WelcomeHeader';
import { ForThisMomentCard } from '@/components/home/ForThisMomentCard';
import { ContinuePractiseCard } from '@/components/home/ContinuePractiseCard';
import { WeekAtAGlance } from '@/components/home/WeekAtAGlance';
import { QuickPracticeRow } from '@/components/home/QuickPracticeRow';
import { RecentlyPractisedCard } from '@/components/home/RecentlyPractisedCard';
import { ExploreTiles } from '@/components/home/ExploreTiles';
import { LatestInsightCard } from '@/components/home/LatestInsightCard';
import { QuoteBlock } from '@/components/home/QuoteBlock';
import { ClosingStatementCard } from '@/components/home/ClosingStatementCard';
import { HomeSkeleton } from '@/components/home/HomeSkeleton';
import { CheckInCard } from '@/components/check-in/CheckInCard';
import { LifeBeyondTraumaCard } from '@/components/home/LifeBeyondTraumaCard';
import { BookConsultationCard } from '@/components/home/BookConsultationCard';
import { useToday } from '@/hooks/useToday';
import { colors, spacing } from '@/theme';
import type { Practice } from '@/api/types';

/**
 * Home: a calm daily orientation, not a dashboard. Fetches GET
 * /api/v1/today once; the only other network calls this screen makes are
 * the check-in submission (owned by CheckInCard) and two already-existing
 * hooks reused as-is (`useCheckInHistory` inside WeekAtAGlance,
 * `useArticles` inside LatestInsightCard). No fabricated content, no
 * gamification, no aggregate "progress" score, no new APIs.
 *
 * "Continue" and "Recently practised" are both derived client-side from
 * the same `/api/v1/today` response already fetched (that endpoint
 * returns up to ten published practices with this member's own progress
 * attached) - no second practices fetch. Same definitions already used by
 * profile/progress.tsx and my-learning.tsx: in-progress is not completed
 * with progressPct strictly between 0 and 1; completed is progress.completed
 * === true, newest completedAt first.
 */
function findContinueCandidate(practices: Practice[], excludeId: string | undefined) {
  const candidates = practices.filter((p) => {
    if (p.id === excludeId) return false;
    const pct = p.progress?.progressPct ?? 0;
    return !p.progress?.completed && pct > 0 && pct < 1 && p.progress?.lastPlayedAt;
  });
  if (candidates.length === 0) return null;
  return candidates.sort(
    (a, b) =>
      new Date(b.progress!.lastPlayedAt!).getTime() - new Date(a.progress!.lastPlayedAt!).getTime(),
  )[0];
}

function completedTime(practice: Practice): number {
  const iso = practice.progress?.completedAt;
  return iso ? new Date(iso).getTime() : 0;
}

function findRecentlyCompleted(practices: Practice[], excludeId: string | undefined): Practice[] {
  return practices
    .filter((p) => p.id !== excludeId && p.progress?.completed === true)
    .sort((a, b) => completedTime(b) - completedTime(a))
    .slice(0, 2);
}

export default function HomeScreen() {
  const { user } = useUser();
  const { state, reload, setCheckIn } = useToday();

  const todayPractice = state.status === 'success' ? state.data.todayPractice : null;
  const continueCandidate = useMemo(() => {
    if (state.status !== 'success') return null;
    return findContinueCandidate(state.data.practices, todayPractice?.id);
  }, [state, todayPractice?.id]);
  const recentlyCompleted = useMemo(() => {
    if (state.status !== 'success') return [];
    return findRecentlyCompleted(state.data.practices, todayPractice?.id);
  }, [state, todayPractice?.id]);

  return (
    <ScreenContainer scroll>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <WelcomeHeader firstName={user?.firstName} />

        {state.status === 'loading' && <HomeSkeleton />}

        {state.status === 'error' && <ErrorNotice message={state.message} onRetry={reload} />}

        {state.status === 'success' && (
          <>
            <Animated.View entering={FadeInDown.duration(450)} style={styles.checkInSection}>
              <CheckInCard initialCheckIn={state.data.checkIn} onSubmitted={setCheckIn} />
            </Animated.View>

            <ForThisMomentCard practice={todayPractice} />

            {continueCandidate ? <ContinuePractiseCard practice={continueCandidate} /> : null}
          </>
        )}

        <WeekAtAGlance />

        <QuickPracticeRow />

        <RecentlyPractisedCard practices={recentlyCompleted} />

        <ExploreTiles />

        <LatestInsightCard />

        <QuoteBlock />

        <ClosingStatementCard />

        <Animated.View
          entering={FadeInDown.duration(450).delay(520)}
          style={styles.instituteSection}
        >
          <ThemedText variant="caption" color={colors.charcoal} style={styles.instituteLabel}>
            FROM THE INSTITUTE
          </ThemedText>
          <Card style={styles.instituteCard}>
            <LifeBeyondTraumaCard />
            <BookConsultationCard />
          </Card>
        </Animated.View>
      </KeyboardAvoidingView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  checkInSection: {
    marginBottom: spacing.xl,
  },
  instituteSection: {
    marginTop: spacing.md,
  },
  instituteCard: {
    padding: 0,
  },
  instituteLabel: {
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: spacing.md,
  },
});
