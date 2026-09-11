import { Pressable, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Card } from '@/components/Card';
import { ThemedText } from '@/components/ThemedText';
import { colors, spacing } from '@/theme';

/**
 * A quiet, static entry point into Resources - no fetch, no featured-
 * article lookup, no recommendation logic. Mirrors PowerDropsEntryCard's
 * compact row treatment so the two sit together as one restrained
 * "Explore" section rather than two differently-weighted cards.
 */
export function ResourcesEntryCard() {
  const router = useRouter();

  return (
    <Pressable
      onPress={() => router.push('/resources')}
      accessibilityRole="button"
      accessibilityLabel="Explore Resources"
      style={({ pressed }) => pressed && styles.pressed}
    >
      <Card variant="accent" style={styles.card}>
        <View style={styles.row}>
          <View style={styles.textColumn}>
            <ThemedText variant="label" color={colors.bronze} style={styles.eyebrow}>
              RESOURCES
            </ThemedText>
            <ThemedText variant="body" color={colors.charcoal}>
              Writing from the Institute on the nervous system, leadership, and change.
            </ThemedText>
          </View>
          <ThemedText variant="label" color={colors.navy}>
            Explore →
          </ThemedText>
        </View>
      </Card>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  pressed: {
    opacity: 0.85,
  },
  card: {
    marginBottom: spacing.lg,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  textColumn: {
    flex: 1,
  },
  eyebrow: {
    textTransform: 'uppercase',
    marginBottom: spacing.xs,
  },
});
