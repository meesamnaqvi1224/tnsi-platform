import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
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

/** One line of supporting context per duration - written copy, not derived
 * from any data source, matching the reference mockup's tone. */
const DURATION_SUBTITLES: Record<BreathingDurationSeconds, string> = {
  60: 'A quick reset',
  180: 'Find a little more space',
  300: 'Reset and recharge',
  600: 'A deeper practice',
};

/**
 * Breathing setup: pick a duration, then start. The only state this screen
 * owns is the selection itself - the actual session (timer, phase,
 * pause/resume) lives entirely in the session screen, reached by pushing
 * the chosen duration as a route param.
 *
 * Duration choice is presented as a quiet editorial list, not a boxed
 * settings form: rows are separated by a hairline divider (the same
 * pattern RecentlyPractisedCard already uses for a list on Home), the
 * selected row gets a soft warm fill rather than a border, and the only
 * indicator is an understated checkmark on the selected row - no
 * persistent circle/radio glyph sitting on every option.
 */
export default function BreathingSetupScreen() {
  const router = useRouter();
  const [duration, setDuration] = useState<BreathingDurationSeconds>(
    DEFAULT_BREATHING_DURATION_SECONDS,
  );

  function start() {
    router.push({
      pathname: '/practices/breathing/session',
      params: { duration: String(duration) },
    });
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right', 'bottom']}>
      <View style={styles.header}>
        <Pressable
          onPress={() => router.back()}
          accessibilityRole="button"
          accessibilityLabel="Back"
          hitSlop={12}
          style={styles.headerButton}
        >
          <Ionicons name="chevron-back" size={26} color={colors.charcoal} />
        </Pressable>
      </View>

      <View style={styles.content}>
        <ThemedText variant="display" style={styles.title}>
          Breathing Exercise
        </ThemedText>
        <ThemedText variant="body" color={colors.charcoal} style={styles.subtitle}>
          A simple practice to create a little more space.
        </ThemedText>

        <View
          style={styles.options}
          accessibilityRole="radiogroup"
          accessibilityLabel="Breathing duration"
        >
          {BREATHING_DURATIONS_SECONDS.map((seconds, index) => {
            const selected = seconds === duration;
            return (
              <Pressable
                key={seconds}
                onPress={() => setDuration(seconds)}
                accessibilityRole="radio"
                accessibilityState={{ selected }}
                accessibilityLabel={`${formatDurationLabel(seconds)}, ${DURATION_SUBTITLES[seconds]}`}
                style={({ pressed }) => [
                  styles.option,
                  index > 0 && styles.optionDivider,
                  selected && styles.optionSelected,
                  pressed && styles.optionPressed,
                ]}
              >
                <View style={styles.optionText}>
                  <ThemedText
                    variant="heading"
                    color={selected ? colors.navy : colors.charcoal}
                    style={styles.optionLabel}
                  >
                    {formatDurationLabel(seconds)}
                  </ThemedText>
                  <ThemedText variant="body" color={colors.charcoal}>
                    {DURATION_SUBTITLES[seconds]}
                  </ThemedText>
                </View>
                {selected ? (
                  <Ionicons name="checkmark" size={22} color={colors.bronze} />
                ) : (
                  <View style={styles.checkmarkSpacer} />
                )}
              </Pressable>
            );
          })}
        </View>
      </View>

      <View style={styles.footer}>
        <PrimaryButton label="Start Breathing" onPress={start} />
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
  },
  headerButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: -spacing.sm,
  },
  content: {
    flex: 1,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
  },
  title: {
    marginBottom: spacing.sm,
  },
  subtitle: {
    marginBottom: spacing.xxl,
    maxWidth: 320,
  },
  options: {
    marginHorizontal: -spacing.md,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.md,
    borderRadius: radius.md,
  },
  optionDivider: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  optionSelected: {
    backgroundColor: colors.creamMuted,
  },
  optionPressed: {
    opacity: 0.85,
  },
  optionText: {
    flex: 1,
  },
  optionLabel: {
    marginBottom: 2,
  },
  checkmarkSpacer: {
    width: 22,
  },
  footer: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.md,
  },
});
