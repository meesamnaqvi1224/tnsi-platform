import { Pressable, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Card } from '@/components/Card';
import { ThemedText } from '@/components/ThemedText';
import {
  formatDurationLabel,
  guidedPracticeRoutes,
  type GuidedPractice,
} from '@/lib/guided-practices';
import { colors, spacing } from '@/theme';

/**
 * A way into one standalone guided audio practice, listed alongside the other
 * practices in the library. Static: no recommendation logic, nothing fetched.
 */
export function GuidedPracticeCard({ practice }: { practice: GuidedPractice }) {
  const router = useRouter();
  const duration = formatDurationLabel(practice.durationSeconds);

  return (
    <Pressable
      onPress={() => router.push(guidedPracticeRoutes(practice.slug).intro)}
      accessibilityRole="button"
      accessibilityLabel={`${practice.title}, ${practice.condition}, ${practice.format}, ${duration}`}
      style={({ pressed }) => pressed && styles.pressed}
    >
      <Card variant="accent" style={styles.card}>
        <View style={styles.row}>
          <View style={styles.textColumn}>
            <ThemedText variant="label" color={colors.bronze} style={styles.eyebrow}>
              {practice.condition} · {practice.format}
            </ThemedText>
            <ThemedText variant="heading">{practice.title}</ThemedText>
            <ThemedText variant="body" color={colors.charcoal}>
              {practice.subtitle}
            </ThemedText>
          </View>
          <ThemedText variant="label" color={colors.charcoal}>
            {duration}
          </ThemedText>
        </View>
      </Card>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  pressed: { opacity: 0.85 },
  card: { marginBottom: spacing.md },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  textColumn: { flex: 1 },
  eyebrow: { textTransform: 'uppercase', marginBottom: spacing.xs },
});
