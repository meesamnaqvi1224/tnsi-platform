import { Image, Pressable, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { ThemedText } from '@/components/ThemedText';
import { colors, imageOverlayGradient, radius, spacing } from '@/theme';

const breatheImage = require('../../../assets/images/quick-breathe.jpg');
const regulateImage = require('../../../assets/images/quick-regulate.jpg');
const groundImage = require('../../../assets/images/quick-ground.jpg');
const reconnectImage = require('../../../assets/images/quick-reconnect.jpg');

type Tile =
  | { label: string; caption: string; image: number; kind: 'breathing' }
  | { label: string; caption: string; image: number; kind: 'powerdrops'; category: string };

/**
 * Four simple choices, image-led, 2x2. Breathe is the one native
 * interactive experience this engagement adds (see
 * app/(tabs)/practices/breathing); the other three name real PowerDrop
 * categories from the approved taxonomy (Regulation, Grounding,
 * Interoception - see packages/cms's powerDrop schema) and pre-filter the
 * PowerDrops library to that category via a route param, same as before -
 * only the addition of Breathe and the grid layout changed here.
 */
const TILES: Tile[] = [
  { label: 'Breathe', caption: 'Calm now', image: breatheImage, kind: 'breathing' },
  {
    label: 'Regulate',
    caption: 'Find balance',
    image: regulateImage,
    kind: 'powerdrops',
    category: 'Regulation',
  },
  {
    label: 'Ground',
    caption: 'Be present',
    image: groundImage,
    kind: 'powerdrops',
    category: 'Grounding',
  },
  {
    label: 'Reconnect',
    caption: 'Feel steady',
    image: reconnectImage,
    kind: 'powerdrops',
    category: 'Interoception',
  },
];

export function QuickPracticeRow() {
  const router = useRouter();

  function openTile(tile: Tile) {
    if (tile.kind === 'breathing') {
      router.push('/practices/breathing');
      return;
    }
    router.push({ pathname: '/practices/powerdrops', params: { category: tile.category } });
  }

  return (
    <Animated.View entering={FadeInDown.duration(450).delay(40)} style={styles.section}>
      <ThemedText variant="heading" style={styles.sectionTitle}>
        Quick practice
      </ThemedText>
      <ThemedText variant="body" color={colors.charcoal} style={styles.sectionSubtitle}>
        A few minutes can change how you meet this moment.
      </ThemedText>

      <View style={styles.grid}>
        {TILES.map((tile) => (
          <Pressable
            key={tile.label}
            onPress={() => openTile(tile)}
            accessibilityRole="button"
            accessibilityLabel={
              tile.kind === 'breathing'
                ? `${tile.label}, ${tile.caption}. Opens a guided breathing exercise.`
                : `${tile.label}, ${tile.caption}`
            }
            style={({ pressed }) => [styles.tile, pressed && styles.pressed]}
          >
            <Image source={tile.image} style={styles.tileImage} />
            <LinearGradient colors={imageOverlayGradient} style={StyleSheet.absoluteFill} />
            <View style={styles.tileOverlay}>
              <ThemedText variant="body" color={colors.cream} style={styles.tileLabel}>
                {tile.label}
              </ThemedText>
              <ThemedText variant="caption" color={colors.creamMuted}>
                {tile.caption}
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
  sectionTitle: {
    marginBottom: spacing.xs,
  },
  sectionSubtitle: {
    marginBottom: spacing.md,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  pressed: {
    opacity: 0.85,
  },
  tile: {
    width: '48%',
    aspectRatio: 1.05,
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
    padding: spacing.md,
  },
  tileLabel: {
    marginBottom: 1,
  },
});
