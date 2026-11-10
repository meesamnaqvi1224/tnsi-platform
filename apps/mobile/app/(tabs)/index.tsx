import { useCallback, useEffect, useRef } from 'react';
import { KeyboardAvoidingView, Platform, StyleSheet } from 'react-native';
import { useUser } from '@clerk/clerk-expo';
import { useFocusEffect } from 'expo-router';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { ScreenContainer, ErrorNotice, ThemedText, Card } from '@/components';
import { WelcomeHeader } from '@/components/home/WelcomeHeader';
import { ForThisMomentCard } from '@/components/home/ForThisMomentCard';
import { QuoteBlock } from '@/components/home/QuoteBlock';
import { ClosingStatementCard } from '@/components/home/ClosingStatementCard';
import { RecommendationExtras } from '@/components/home/RecommendationExtras';
import { HomeProgressWidget } from '@/components/home/HomeProgressWidget';
import { HomeSkeleton } from '@/components/home/HomeSkeleton';
import { CheckInCard } from '@/components/check-in/CheckInCard';
import { LifeBeyondTraumaCard } from '@/components/home/LifeBeyondTraumaCard';
import { BookConsultationCard } from '@/components/home/BookConsultationCard';
import { AssessmentEntryCard } from '@/components/home/AssessmentEntryCard';
import { ResourcesOnWebsiteCard } from '@/components/home/ResourcesOnWebsiteCard';
import { useToday } from '@/hooks/useToday';
import { practiceForToday } from '@/lib/check-in-day';
import { home, homeCardStyle } from '@/components/home/homeTheme';
import { colors, spacing } from '@/theme';
import type { CheckIn } from '@/api/types';

/**
 * Home: check in, get one practice for the moment, see a small record of what you have done. Fetches
 * GET /api/v1/today (the check-in, the recommendation and its alternative, and a progress summary).
 * Before today's check-in there is no recommendation: Home invites the check-in. Practices are not
 * browsable from here; they arrive through the recommendation and through Human Expansion Theory.
 */
export default function HomeScreen() {
  const { user } = useUser();
  const { state, reload, setCheckIn, refresh } = useToday();

  function handleCheckInSubmitted(checkIn: CheckIn) {
    // Instant feedback (CheckInCard's own "recorded" view doesn't wait on
    // this), then a quiet background refetch so todayPractice reflects the
    // category this check-in just routed to - see useToday.ts's `refresh`.
    setCheckIn(checkIn);
    void refresh();
  }

  // Coming back to Home (after practising, saving or checking in elsewhere) shows what the
  // server says now. The first focus is skipped because the hook already fetches on mount, and
  // the refresh lives in a ref because the API client changes identity every render.
  const refreshToday = useRef(() => {});
  useEffect(() => {
    refreshToday.current = () => void refresh();
  });
  const firstFocus = useRef(true);
  useFocusEffect(
    useCallback(() => {
      if (firstFocus.current) {
        firstFocus.current = false;
        return;
      }
      refreshToday.current();
    }, []),
  );

  // The recommendation belongs to a check-in made today (see src/lib/check-in-day.ts).
  const todayPractice =
    state.status === 'success'
      ? practiceForToday(state.data.checkIn, state.data.todayPractice)
      : null;
  return (
    <ScreenContainer scroll inTabs background={home.page}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <WelcomeHeader firstName={user?.firstName} />

        {state.status === 'loading' && <HomeSkeleton />}

        {state.status === 'error' && <ErrorNotice message={state.message} onRetry={reload} />}

        {state.status === 'success' && (
          <>
            <Animated.View entering={FadeInDown.duration(450)} style={styles.checkInSection}>
              <CheckInCard
                initialCheckIn={state.data.checkIn}
                onSubmitted={handleCheckInSubmitted}
              />
            </Animated.View>

            {state.data.checkIn ? (
              <>
                <ForThisMomentCard practice={todayPractice} hasCheckedInToday />
                {todayPractice ? (
                  <RecommendationExtras
                    primary={todayPractice}
                    alternative={practiceForToday(
                      state.data.checkIn,
                      state.data.alternativePractice,
                    )}
                  />
                ) : null}
              </>
            ) : null}

            <HomeProgressWidget data={state.data} recommended={todayPractice} />
          </>
        )}

        <AssessmentEntryCard />

        <QuoteBlock />

        <ClosingStatementCard />

        <Animated.View
          entering={FadeInDown.duration(450).delay(520)}
          style={styles.instituteSection}
        >
          <ThemedText variant="caption" color={colors.charcoal} style={styles.instituteLabel}>
            FROM THE INSTITUTE
          </ThemedText>
          <Card style={{ ...styles.instituteCard, ...homeCardStyle }}>
            <LifeBeyondTraumaCard />
            <BookConsultationCard />
            <ResourcesOnWebsiteCard />
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
