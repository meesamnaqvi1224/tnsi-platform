import { useMemo } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Card } from '@/components/Card';
import { ThemedText } from '@/components/ThemedText';
import { useCheckInHistory } from '@/hooks/useCheckInHistory';
import { colors, spacing } from '@/theme';

const DAY_LABELS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

/** "2026-09-11" for a given Date, matching CheckInSummary.completedDate's format. */
function isoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

/** The last 7 calendar days (today last), Monday-anchored only in the
 * label row above - the actual dates always run oldest-to-newest ending
 * today, whatever weekday today is. */
function lastSevenDays(): Date[] {
  const days: Date[] = [];
  const today = new Date();
  for (let i = 6; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    days.push(d);
  }
  return days;
}

/**
 * A quiet "did you check in this day" reflection over the last 7 days -
 * reuses `useCheckInHistory` (the same GET /api/v1/check-ins hook the
 * Progress screen already uses), deriving which of the last 7 calendar
 * days have a real check-in entirely client-side. No streak count, no
 * score, no reward language - just what actually happened, and a link to
 * the existing full Progress screen for anyone who wants more detail.
 * Renders nothing while loading or on error/empty - this is a quiet
 * supplementary section, not one worth an error state of its own.
 */
export function WeekAtAGlance() {
  const router = useRouter();
  const { state } = useCheckInHistory();

  const days = useMemo(() => lastSevenDays(), []);
  const checkedDates = useMemo(() => {
    if (state.status !== 'success') return new Set<string>();
    return new Set(state.checkIns.map((c) => c.completedDate));
  }, [state]);

  if (state.status !== 'success') return null;

  const count = days.filter((d) => checkedDates.has(isoDate(d))).length;
  if (count === 0) return null;

  return (
    <Animated.View entering={FadeInDown.duration(450).delay(160)} style={styles.section}>
      <View style={styles.headerRow}>
        <ThemedText variant="heading" style={styles.sectionTitle}>
          Your week at a glance
        </ThemedText>
        <Pressable
          onPress={() => router.push('/profile/progress')}
          accessibilityRole="link"
          accessibilityLabel="View Progress"
        >
          <ThemedText variant="label" color={colors.bronze}>
            View Progress →
          </ThemedText>
        </Pressable>
      </View>

      <Card>
        <View style={styles.dotsRow}>
          {days.map((d, i) => {
            const checked = checkedDates.has(isoDate(d));
            return (
              <View key={i} style={styles.dayColumn}>
                <ThemedText variant="caption" color={colors.charcoal}>
                  {DAY_LABELS[d.getDay() === 0 ? 6 : d.getDay() - 1]}
                </ThemedText>
                <View
                  style={[styles.dot, checked ? styles.dotFilled : styles.dotEmpty]}
                  accessible
                  accessibilityLabel={`${d.toLocaleDateString('en-GB', { weekday: 'long' })}${checked ? ', checked in' : ', no check-in'}`}
                />
              </View>
            );
          })}
        </View>

        <ThemedText variant="caption" color={colors.charcoal} style={styles.summary}>
          {count} check-in{count === 1 ? '' : 's'} this week.
        </ThemedText>
        <ThemedText variant="body" color={colors.charcoal} style={styles.reflection}>
          Consistency isn&apos;t about perfection. It&apos;s about coming back to yourself.
        </ThemedText>
      </Card>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  section: {
    marginBottom: spacing.xl,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  sectionTitle: {
    flex: 1,
  },
  dotsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  dayColumn: {
    alignItems: 'center',
    gap: spacing.xs,
  },
  dot: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 1,
  },
  dotFilled: {
    backgroundColor: colors.bronze,
    borderColor: colors.bronze,
  },
  dotEmpty: {
    backgroundColor: 'transparent',
    borderColor: colors.border,
  },
  summary: {
    marginTop: spacing.md,
  },
  reflection: {
    marginTop: spacing.sm,
    fontStyle: 'italic',
  },
});
