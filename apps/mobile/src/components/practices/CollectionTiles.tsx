import { Image, Pressable, StyleSheet, View, useWindowDimensions } from 'react-native';
import { useRouter, type Href } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { ThemedText } from '@/components/ThemedText';
import { home, homeCardStyle } from '@/components/home/homeTheme';
import { spacing } from '@/theme';

/**
 * The two collections that are their own libraries, separate from the practice library and from the
 * guided practices: PowerDrops and Somatic Cards. Two photo tiles side by side (stacked when the
 * member's text size is large). Static: nothing is fetched and nothing is recommended, they are only a
 * way in.
 */
export function CollectionTiles() {
  const { fontScale } = useWindowDimensions();
  const stacked = fontScale >= 1.3;

  return (
    <View style={[styles.row, stacked && styles.rowStacked]}>
      <Tile
        title="PowerDrops™"
        body="A small practice for the moment you’re in."
        image={require('../../../assets/images/explore-powerdrops.jpg')}
        href="/practices/powerdrops"
        label="Explore PowerDrops, a collection of small practices"
      />
      <Tile
        title="Somatic Cards"
        body="A guided library of somatic practice cards."
        image={require('../../../assets/images/quick-reconnect.jpg')}
        href="/practices/somatic-cards"
        label="Explore Somatic Cards, a guided library of practice cards"
      />
    </View>
  );
}

function Tile({
  title,
  body,
  image,
  href,
  label,
}: {
  title: string;
  body: string;
  image: number;
  href: Href;
  label: string;
}) {
  const router = useRouter();
  return (
    <Pressable
      onPress={() => router.push(href)}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={({ pressed }) => [styles.tile, pressed && styles.pressed]}
    >
      <Image source={image} style={styles.image} accessibilityIgnoresInvertColors />
      <View style={styles.body}>
        <ThemedText variant="heading" color={home.navy} style={styles.title}>
          {title}
        </ThemedText>
        <ThemedText variant="caption" color={home.ink} style={styles.text}>
          {body}
        </ThemedText>
        <View style={styles.chevron} accessibilityElementsHidden importantForAccessibility="no">
          <Ionicons name="chevron-forward" size={14} color={home.bronze} />
        </View>
      </View>
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
  },
  tile: {
    ...homeCardStyle,
    flex: 1,
    backgroundColor: home.page,
    overflow: 'hidden',
  },
  pressed: { opacity: 0.9 },
  image: { width: '100%', height: 92 },
  body: { padding: spacing.md, minHeight: 112 },
  title: { fontSize: 17, lineHeight: 22, marginBottom: 2 },
  text: { lineHeight: 16, paddingRight: 28 },
  chevron: {
    position: 'absolute',
    right: spacing.sm + 2,
    bottom: spacing.sm + 2,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: home.bronzeTint,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
