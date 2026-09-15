import { Pressable, StyleSheet, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ThemedText, PrimaryButton } from '@/components';
import {
  BREATHING_DURATIONS_SECONDS,
  DEFAULT_BREATHING_DURATION_SECONDS,
  formatDurationLabel,
  type BreathingDurationSeconds,
} from '@/lib/breathing';
import { colors, radius, spacing } from '@/theme';

function parseDuration(raw: string | undefined): BreathingDurationSeconds {
  const n = Number(raw);
  return (BREATHING_DURATIONS_SECONDS as readonly number[]).includes(n)
    ? (n as BreathingDurationSeconds)
    : DEFAULT_BREATHING_DURATION_SECONDS;
}

/**
 * Reached only via `router.replace` from a genuinely completed session
 * (see session.tsx) - so `duration` here is always the real session
 * length, not a guess. No mood check-in and no "View in Progress" link:
 * breathing has no backend persistence in V1 (see the implementation
 * report), so surfacing either would imply this session was recorded
 * somewhere it wasn't.
 */
export default function BreathingCompleteScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ duration?: string }>();
  const totalSeconds = parseDuration(params.duration);

  function done() {
    router.replace('/');
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right', 'bottom']}>
      <View style={styles.header}>
        <Pressable
          onPress={done}
          accessibilityRole="button"
          accessibilityLabel="Close"
          hitSlop={12}
          style={styles.closeButton}
        >
          <Ionicons name="close" size={26} color={colors.charcoal} />
        </Pressable>
      </View>

      <View style={styles.content}>
        <ThemedText variant="display" style={styles.title}>
          Practice complete.
        </ThemedText>
        <ThemedText variant="body" color={colors.charcoal} style={styles.subtitle}>
          You showed up for yourself.
        </ThemedText>

        <View style={styles.summaryCard}>
          <ThemedText variant="heading" style={styles.summaryDuration}>
            {formatDurationLabel(totalSeconds)}
          </ThemedText>
          <ThemedText variant="label" color={colors.bronze} style={styles.summaryStatus}>
            COMPLETED
          </ThemedText>
        </View>
      </View>

      <View style={styles.footer}>
        <PrimaryButton label="Done" onPress={done} />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.cream,
  },
  header: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    alignItems: 'flex-end',
  },
  closeButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: -spacing.sm,
  },
  content: {
    flex: 1,
    paddingHorizontal: spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  subtitle: {
    textAlign: 'center',
    marginBottom: spacing.xl,
  },
  summaryCard: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: spacing.sm,
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
  },
  summaryDuration: {
    marginBottom: 0,
  },
  summaryStatus: {
    letterSpacing: 1,
  },
  footer: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.md,
  },
});
