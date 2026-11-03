import { StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { PrimaryButton, ThemedText } from '@/components';
import { formatDurationLabel, type GuidedPractice } from '@/lib/guided-practices';
import { colors, spacing } from '@/theme';

/**
 * Screen 3: a quiet close. No score, no rating, no celebration. The optional
 * prompt is only a sentence to hold: there is no field, nothing is submitted
 * and nothing is saved.
 */
export function GuidedPracticeComplete({ practice }: { practice: GuidedPractice }) {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right', 'bottom']}>
      <View style={styles.content}>
        <ThemedText variant="label" color={colors.bronze} style={styles.eyebrow}>
          Practice completed · {formatDurationLabel(practice.durationSeconds)}
        </ThemedText>
        <ThemedText variant="display" style={styles.title} accessibilityLiveRegion="polite">
          {practice.complete.heading}
        </ThemedText>
        <ThemedText variant="body" color={colors.charcoal} style={styles.message}>
          {practice.complete.message}
        </ThemedText>
        {practice.complete.prompt ? (
          <View style={styles.prompt}>
            <ThemedText variant="label" color={colors.bronze} style={styles.promptLabel}>
              If you’d like to
            </ThemedText>
            <ThemedText variant="heading" style={styles.promptText}>
              {practice.complete.prompt}
            </ThemedText>
          </View>
        ) : null}
      </View>

      <View style={styles.footer}>
        <PrimaryButton
          label={practice.complete.finish}
          onPress={() => router.dismissTo('/practices')}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.cream },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
  },
  eyebrow: { textTransform: 'uppercase', textAlign: 'center', marginBottom: spacing.md },
  title: { textAlign: 'center', marginBottom: spacing.md },
  message: { textAlign: 'center', maxWidth: 340 },
  prompt: {
    alignItems: 'center',
    marginTop: spacing.xl,
    paddingTop: spacing.lg,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
    maxWidth: 340,
  },
  promptLabel: { textTransform: 'uppercase', marginBottom: spacing.sm },
  promptText: { textAlign: 'center' },
  footer: { paddingHorizontal: spacing.lg, paddingTop: spacing.md, paddingBottom: spacing.md },
});
