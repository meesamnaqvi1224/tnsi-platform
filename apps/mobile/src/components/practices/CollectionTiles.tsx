import { Pressable, StyleSheet, View, useWindowDimensions } from 'react-native';
import { useRouter } from 'expo-router';
import { Card } from '@/components/Card';
import { ThemedText } from '@/components/ThemedText';
import { colors, spacing } from '@/theme';

/**
 * The two collections that are their own libraries, separate from the practice library and
 * from the guided practices: PowerDrops™ and Somatic Cards. Two compact tiles side by side
 * (stacked when the member's text size is large). Static: nothing is fetched and nothing is
 * recommended, they are only a way in.
 */
export function CollectionTiles() {
  const router = useRouter();
  const { fontScale } = useWindowDimensions();
  const stacked = fontScale >= 1.3;

  return (
    <View style={[styles.row, stacked && styles.rowStacked]}>
      <Tile
        variant="inverted"
        eyebrow="POWERDROPS™"
        body="A small practice for the moment you’re in."
        accessibilityLabel="Explore PowerDrops, a collection of small practices"
        onPress={() => router.push('/practices/powerdrops')}
      />
      <Tile
        variant="accent"
        eyebrow="SOMATIC CARDS"
        body="A guided library of somatic practice cards."
        accessibilityLabel="Explore Somatic Cards, a guided library of practice cards"
        onPress={() => router.push('/practices/somatic-cards')}
      />
    </View>
  );
}

function Tile({
  variant,
  eyebrow,
  body,
  accessibilityLabel,
  onPress,
}: {
  variant: 'inverted' | 'accent';
  eyebrow: string;
  body: string;
  accessibilityLabel: string;
  onPress: () => void;
}) {
  const inverted = variant === 'inverted';
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      style={({ pressed }) => [styles.tile, pressed && styles.pressed]}
    >
      <Card variant={variant} style={styles.card}>
        <ThemedText
          variant="label"
          color={inverted ? colors.bronzeMuted : colors.bronze}
          style={styles.eyebrow}
        >
          {eyebrow}
        </ThemedText>
        <ThemedText
          variant="body"
          color={inverted ? colors.cream : colors.charcoal}
          style={styles.body}
        >
          {body}
        </ThemedText>
        <ThemedText variant="label" color={inverted ? colors.cream : colors.bronze}>
          Explore →
        </ThemedText>
      </Card>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: spacing.md,
    marginBottom: spacing.xl,
  },
  rowStacked: {
    flexDirection: 'column',
    marginBottom: spacing.lg,
  },
  tile: {
    flex: 1,
  },
  card: {
    flex: 1,
    minHeight: 132,
    justifyContent: 'space-between',
  },
  pressed: {
    opacity: 0.85,
  },
  eyebrow: {
    textTransform: 'uppercase',
    marginBottom: spacing.xs,
  },
  body: {
    marginBottom: spacing.md,
  },
});
