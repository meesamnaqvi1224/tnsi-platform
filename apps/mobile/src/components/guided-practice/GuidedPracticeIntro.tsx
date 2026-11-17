import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { PrimaryButton, ThemedText } from '@/components';
import {
  formatDurationLabel,
  guidedPracticeRoutes,
  type GuidedPractice,
} from '@/lib/guided-practices';
import { colors, spacing } from '@/theme';

/** Screen 1: a spacious introduction. One decision on it: begin. */
export function GuidedPracticeIntro({ practice }: { practice: GuidedPractice }) {
  const router = useRouter();
  const routes = guidedPracticeRoutes(practice.slug);

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right', 'bottom']}>
      <View style={styles.header}>
        <Pressable
          onPress={() => router.back()}
          accessibilityRole="button"
          accessibilityLabel="Back to Practices"
          hitSlop={12}
          style={styles.headerButton}
        >
          <Ionicons name="chevron-back" size={26} color={colors.charcoal} />
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <ThemedText variant="label" color={colors.bronze} style={styles.eyebrow}>
          {practice.condition} · {practice.format}
        </ThemedText>
        <ThemedText variant="display" style={styles.title}>
          {practice.title}
        </ThemedText>
        <ThemedText variant="heading" color={colors.bronze} style={styles.subtitle}>
          {practice.subtitle}
        </ThemedText>
        <ThemedText variant="body" color={colors.charcoal} style={styles.description}>
          {practice.description}
        </ThemedText>
        <View style={styles.durationRow}>
          <Ionicons name="time-outline" size={18} color={colors.bronze} />
          <ThemedText variant="body" color={colors.charcoal}>
            {formatDurationLabel(practice.durationSeconds)}
          </ThemedText>
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <PrimaryButton label={practice.begin} onPress={() => router.push(routes.session)} />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.cream },
  header: { paddingHorizontal: spacing.lg, paddingTop: spacing.sm },
  headerButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: -spacing.sm,
  },
  content: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg,
  },
  eyebrow: { textTransform: 'uppercase', marginBottom: spacing.sm },
  title: { marginBottom: spacing.sm },
  subtitle: { marginBottom: spacing.lg },
  description: { marginBottom: spacing.lg, maxWidth: 420 },
  durationRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  footer: { paddingHorizontal: spacing.lg, paddingTop: spacing.md, paddingBottom: spacing.md },
});
