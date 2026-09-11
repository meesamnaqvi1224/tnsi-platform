import { Image, Pressable, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { ThemedText } from '@/components/ThemedText';
import { colors, radius, spacing } from '@/theme';

const regulateImage = require('../../../assets/images/quick-regulate.jpg');
const groundImage = require('../../../assets/images/quick-ground.jpg');
const reconnectImage = require('../../../assets/images/quick-reconnect.jpg');

/**
 * Three tiles naming real PowerDrop categories from the approved taxonomy
 * (Regulation, Grounding, Interoception - see packages/cms's powerDrop
 * schema). Phase 1 (this pass): all three open the PowerDrops library,
 * same as the existing PowerDropsEntryCard - there is no per-duration
 * content model to filter by yet. Phase 2: wire each tile to actually
 * pre-filter PowerDrops by its category once that's worth building.
 * Durations shown are illustrative labels matching the category's own
 * spirit, not a real queryable field.
 */
const TILES = [
  { label: 'Regulate', duration: '90 seconds', category: 'Regulation', image: regulateImage },
  { label: 'Ground', duration: '3 minutes', category: 'Grounding', image: groundImage },
  { label: 'Reconnect', duration: '5 minutes', category: 'Interoception', image: reconnectImage },
] as const;

export function QuickPracticeRow() {
  const router = useRouter();

  return (
    <Animated.View entering={FadeInDown.duration(450).delay(40)} style={styles.section}>
      <View style={styles.headerRow}>
        <ThemedText variant="heading" style={styles.sectionTitle}>
          Quick practice
        </ThemedText>
        <Pressable
          onPress={() => router.push('/practices/powerdrops')}
          accessibilityRole="link"
          accessibilityLabel="View all quick practices"
        >
          <ThemedText variant="label" color={colors.bronze}>
            View All →
          </ThemedText>
        </Pressable>
      </View>
      <ThemedText variant="body" color={colors.charcoal} style={styles.sectionSubtitle}>
        Need a moment? Try a short practice.
      </ThemedText>

      <View style={styles.row}>
        {TILES.map((tile) => (
          <Pressable
            key={tile.label}
            onPress={() => router.push('/practices/powerdrops')}
            accessibilityRole="button"
            accessibilityLabel={`${tile.label}, ${tile.duration}`}
            style={({ pressed }) => [styles.tile, pressed && styles.pressed]}
          >
            <Image source={tile.image} style={styles.tileImage} />
            <View style={styles.tileOverlay}>
              <ThemedText variant="label" color={colors.cream} style={styles.tileDuration}>
                {tile.duration}
              </ThemedText>
              <ThemedText variant="body" color={colors.cream} style={styles.tileLabel}>
                {tile.label}
              </ThemedText>
            </View>
          </Pressable>
        ))}
      </View>
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
    marginBottom: spacing.xs,
  },
  sectionTitle: {
    flex: 1,
  },
  sectionSubtitle: {
    marginBottom: spacing.md,
  },
  row: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  pressed: {
    opacity: 0.85,
  },
  tile: {
    flex: 1,
    aspectRatio: 1,
    borderRadius: radius.lg,
    overflow: 'hidden',
  },
  tileImage: {
    width: '100%',
    height: '100%',
    position: 'absolute',
  },
  tileOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    padding: spacing.sm,
    backgroundColor: 'rgba(11,21,38,0.35)',
  },
  tileDuration: {
    marginBottom: 2,
  },
  tileLabel: {
    fontSize: 15,
  },
});
