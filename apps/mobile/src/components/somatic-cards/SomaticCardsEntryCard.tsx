import { Pressable, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Card } from '@/components/Card';
import { ThemedText } from '@/components/ThemedText';
import { colors, spacing } from '@/theme';

/**
 * Compact entry point into the Somatic Card library - used at the top of
 * the Practices library, same placement/shape as `PowerDropsEntryCard`
 * (the established pattern this app already uses for surfacing a
 * distinct-but-related content type without a tab-bar/navigation
 * redesign - see docs/TNSI_Somatic_Card_Mobile_UI_v1.md §Navigation).
 * Deliberately static: no recommendation logic, no randomly chosen
 * content, just a way in.
 */
export function SomaticCardsEntryCard() {
  const router = useRouter();

  return (
    <Pressable
      onPress={() => router.push('/practices/somatic-cards')}
      accessibilityRole="button"
      accessibilityLabel="Explore Somatic Cards"
      style={({ pressed }) => pressed && styles.pressed}
    >
      <Card variant="accent" style={styles.card}>
        <View style={styles.row}>
          <View style={styles.textColumn}>
            <ThemedText variant="label" color={colors.bronze} style={styles.eyebrow}>
              SOMATIC CARDS
            </ThemedText>
            <ThemedText variant="body" color={colors.charcoal}>
              A guided library of somatic practice cards.
            </ThemedText>
          </View>
          <ThemedText variant="label" color={colors.bronze}>
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
