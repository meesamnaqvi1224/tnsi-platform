import { Image, Pressable, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { ThemedText } from '@/components/ThemedText';
import { colors, radius, spacing } from '@/theme';

const powerDropsImage = require('../../../assets/images/explore-powerdrops.jpg');
const resourcesImage = require('../../../assets/images/explore-resources.jpg');

/**
 * A Home-only 2-tile image grid into PowerDrops/Resources, matching the
 * mockup's "Explore" composition. Deliberately a separate component from
 * `PowerDropsEntryCard`/`ResourcesEntryCard` (also used on the Practices
 * screen, which isn't part of this redesign) rather than restyling those -
 * changing their look would have changed Practices too. Same navigation
 * targets, just a different visual presentation for Home specifically.
 */
export function ExploreTiles() {
  const router = useRouter();

  return (
    <Animated.View entering={FadeInDown.duration(450).delay(280)} style={styles.section}>
      <ThemedText variant="heading" style={styles.sectionTitle}>
        Explore
      </ThemedText>
      <ThemedText variant="body" color={colors.charcoal} style={styles.sectionSubtitle}>
        Dive deeper into practices, insights and tools.
      </ThemedText>

      <View style={styles.row}>
        <Pressable
          onPress={() => router.push('/practices/powerdrops')}
          accessibilityRole="button"
          accessibilityLabel="PowerDrops - short, powerful practices for real life"
          style={({ pressed }) => [styles.tile, pressed && styles.pressed]}
        >
          <Image source={powerDropsImage} style={styles.tileImage} />
          <View style={styles.tileOverlay}>
            <ThemedText variant="body" color={colors.cream} style={styles.tileTitle}>
              PowerDrops
            </ThemedText>
            <ThemedText variant="caption" color={colors.creamMuted} style={styles.tileCaption}>
              Short, powerful practices for real life.
            </ThemedText>
            <ThemedText variant="label" color={colors.bronzeMuted}>
              →
            </ThemedText>
          </View>
        </Pressable>

        <Pressable
          onPress={() => router.push('/resources')}
          accessibilityRole="button"
          accessibilityLabel="Resources - articles, insights and research"
          style={({ pressed }) => [styles.tile, pressed && styles.pressed]}
        >
          <Image source={resourcesImage} style={styles.tileImage} />
          <View style={styles.tileOverlay}>
            <ThemedText variant="body" color={colors.cream} style={styles.tileTitle}>
              Resources
            </ThemedText>
            <ThemedText variant="caption" color={colors.creamMuted} style={styles.tileCaption}>
              Articles, insights and research.
            </ThemedText>
            <ThemedText variant="label" color={colors.bronzeMuted}>
              →
            </ThemedText>
          </View>
        </Pressable>
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
  row: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  pressed: {
    opacity: 0.85,
  },
  tile: {
    flex: 1,
    height: 170,
    borderRadius: radius.xl,
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
    backgroundColor: 'rgba(11,21,38,0.45)',
  },
  tileTitle: {
    marginBottom: 2,
  },
  tileCaption: {
    marginBottom: spacing.sm,
  },
});
