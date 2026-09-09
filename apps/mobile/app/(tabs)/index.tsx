import { KeyboardAvoidingView, Platform, StyleSheet } from 'react-native';
import { useUser } from '@clerk/clerk-expo';
import { ScreenContainer, ErrorNotice, ThemedText } from '@/components';
import { WelcomeHeader } from '@/components/home/WelcomeHeader';
import { TodayPracticeCard } from '@/components/home/TodayPracticeCard';
import { HomeSkeleton } from '@/components/home/HomeSkeleton';
import { CheckInCard } from '@/components/check-in/CheckInCard';
import { PowerDropsEntryCard } from '@/components/powerdrops/PowerDropsEntryCard';
import { useToday } from '@/hooks/useToday';
import { usePowerDrops } from '@/hooks/usePowerDrops';
import { spacing } from '@/theme';

/**
 * Home: today's orientation and the daily check-in - the app's first real
 * product experience. Fetches GET /api/v1/today once; the only other
 * network calls this screen makes are the check-in submission (owned by
 * CheckInCard) and a small featured-PowerDrops-only lookup for the
 * compact entry card below. No fabricated content, no gamification, no
 * practice player/detail navigation yet (Phase 3).
 */
export default function HomeScreen() {
  const { user } = useUser();
  const { state, reload, setCheckIn } = useToday();
  const { state: powerDropsState } = usePowerDrops({ featured: true });
  const featuredPowerDrop =
    powerDropsState.status === 'success' ? (powerDropsState.powerDrops[0] ?? null) : null;

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
            <TodayPracticeCard practice={state.data.practices[0] ?? null} />
          </>
        )}

        <PowerDropsEntryCard
          subtitle={featuredPowerDrop ? `Featured: ${featuredPowerDrop.title}` : undefined}
        />
      </KeyboardAvoidingView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  sectionLabel: {
    textTransform: 'uppercase',
    marginBottom: spacing.md,
  },
});
