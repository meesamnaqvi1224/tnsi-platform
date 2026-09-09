import { useMemo } from 'react';
import { KeyboardAvoidingView, Platform, StyleSheet, View } from 'react-native';
import { useUser } from '@clerk/clerk-expo';
import { ScreenContainer, ErrorNotice, ThemedText } from '@/components';
import { WelcomeHeader } from '@/components/home/WelcomeHeader';
import { TodayPracticeCard } from '@/components/home/TodayPracticeCard';
import { ContinuePractiseCard } from '@/components/home/ContinuePractiseCard';
import { ResourcesEntryCard } from '@/components/home/ResourcesEntryCard';
import { HomeSkeleton } from '@/components/home/HomeSkeleton';
import { CheckInCard } from '@/components/check-in/CheckInCard';
import { PowerDropsEntryCard } from '@/components/powerdrops/PowerDropsEntryCard';
import { useToday } from '@/hooks/useToday';
import { usePowerDrops } from '@/hooks/usePowerDrops';
import { colors, spacing } from '@/theme';
import type { Practice } from '@/api/types';

/**
 * Home: a calm daily orientation, not a dashboard. Fetches GET
 * /api/v1/today once; the only other network calls this screen makes are
 * the check-in submission (owned by CheckInCard) and a small
 * featured-PowerDrops-only lookup for the compact entry card below. No
 * fabricated content, no gamification, no aggregate "progress" score.
 *
 * "Continue" is derived client-side from the same `/api/v1/today`
 * response already fetched (that endpoint returns up to ten published
 * practices with this member's own progress attached, not just one) -
 * no second practices fetch. Same "in progress" definition already used
 * by profile/progress.tsx's practice summary: not completed, and
 * progressPct strictly between 0 and 1.
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

export default function HomeScreen() {
  const { user } = useUser();
  const { state, reload, setCheckIn } = useToday();
  const { state: powerDropsState } = usePowerDrops({ featured: true });
  const featuredPowerDrop =
    powerDropsState.status === 'success' ? (powerDropsState.powerDrops[0] ?? null) : null;

  const todayPractice = state.status === 'success' ? (state.data.practices[0] ?? null) : null;
  const continueCandidate = useMemo(() => {
    if (state.status !== 'success') return null;
    return findContinueCandidate(state.data.practices, todayPractice?.id);
  }, [state, todayPractice?.id]);

  return (
    <ScreenContainer scroll>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <WelcomeHeader firstName={user?.firstName} />

        <ThemedText variant="label" style={styles.sectionLabel}>
          Today
        </ThemedText>

        {state.status === 'loading' && <HomeSkeleton />}

        {state.status === 'error' && <ErrorNotice message={state.message} onRetry={reload} />}

        {state.status === 'success' && (
          <>
            <CheckInCard initialCheckIn={state.data.checkIn} onSubmitted={setCheckIn} />
            <TodayPracticeCard practice={todayPractice} />
            {continueCandidate ? <ContinuePractiseCard practice={continueCandidate} /> : null}
          </>
        )}

        <View style={styles.exploreSection}>
          <ThemedText variant="label" color={colors.charcoal} style={styles.sectionLabel}>
            Explore
          </ThemedText>
          <PowerDropsEntryCard
            subtitle={featuredPowerDrop ? `Featured: ${featuredPowerDrop.title}` : undefined}
          />
          <ResourcesEntryCard />
        </View>
      </KeyboardAvoidingView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  sectionLabel: {
    textTransform: 'uppercase',
    marginBottom: spacing.md,
  },
  exploreSection: {
    marginTop: spacing.md,
  },
});
