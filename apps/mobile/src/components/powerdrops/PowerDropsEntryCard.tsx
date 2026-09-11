import { Pressable, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Card } from '@/components/Card';
import { ThemedText } from '@/components/ThemedText';
import { colors, spacing } from '@/theme';

interface PowerDropsEntryCardProps {
  /** Overrides the default one-liner - e.g. to name a real featured PowerDrop's title. Never a randomly chosen one. */
  subtitle?: string;
}

/**
 * Compact entry point into the PowerDrops™ experience - used on Home and
 * at the top of the Practices library. Deliberately static/small: no
 * recommendation logic, no randomly chosen content, just a way in.
 */
export function PowerDropsEntryCard({ subtitle }: PowerDropsEntryCardProps) {
  const router = useRouter();

  return (
    <Pressable
      onPress={() => router.push('/practices/powerdrops')}
      accessibilityRole="button"
      accessibilityLabel="Explore PowerDrops"
      style={({ pressed }) => pressed && styles.pressed}
    >
      <Card variant="inverted" style={styles.card}>
        <View style={styles.row}>
          <View style={styles.textColumn}>
            <ThemedText variant="label" color={colors.bronzeMuted} style={styles.eyebrow}>
              POWERDROPS™
            </ThemedText>
            <ThemedText variant="body" color={colors.cream}>
              {subtitle ?? 'A small practice for the moment you’re in.'}
            </ThemedText>
          </View>
          <ThemedText variant="label" color={colors.cream}>
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
    marginBottom: spacing.xl,
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
