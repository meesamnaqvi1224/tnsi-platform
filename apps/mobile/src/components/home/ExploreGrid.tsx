import { Image, Pressable, StyleSheet, View, useWindowDimensions } from 'react-native';
import { useRouter, type Href } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { ThemedText } from '@/components/ThemedText';
import { fontFamily, spacing } from '@/theme';
import { home } from './homeTheme';

interface Destination {
  title: string;
  description: string;
  href: Href;
  image: number;
  label: string;
}

/**
 * Five ways into the app, once each: the practice library, the two collections, My Learning and My
 * Journey. Each tile uses an existing approved photograph. Static: nothing is fetched and
 * nothing is recommended, so Home does not repeat the library screens, it only points to them.
 */
const GAP = 10;

const DESTINATIONS: Destination[] = [
  {
    title: 'Practices',
    description: 'Guided practices for everyday life',
    href: '/practices',
    image: require('../../../assets/images/practice-moment.jpg'),
    label: 'Practices, guided practices for everyday life',
  },
  {
    title: 'PowerDrops',
    description: 'Short, grounding audio sessions',
    href: '/practices/powerdrops',
    image: require('../../../assets/images/explore-powerdrops.jpg'),
    label: 'PowerDrops, short grounding audio sessions',
  },
  {
    title: 'Somatic Cards',
    description: 'Body-based practices and reflections',
    href: '/practices/somatic-cards',
    image: require('../../../assets/images/quick-reconnect.jpg'),
    label: 'Somatic Cards, body-based practices and reflections',
  },
  {
    title: 'My Learning',
    description: 'In progress, completed and saved',
    href: '/my-learning',
    image: require('../../../assets/images/explore-resources.jpg'),
    label: 'My Learning, your in progress, completed and saved practices',
  },
  {
    title: 'My Journey',
    description: 'Your check-ins and practice history',
    href: '/practices/journey',
    image: require('../../../assets/images/journey-dock.jpg'),
    label: 'My Journey, your check-ins and practice history',
  },
];

export function ExploreGrid() {
  const router = useRouter();
  const { fontScale, width } = useWindowDimensions();
  // Five tiles: a row of three and a row of two (two, two and one at large text sizes, so titles
  // and descriptions keep room to read). Home's content is inset by spacing.lg on each side; the
  // tiles in a row share what is left, minus the gaps.
  const rows = fontScale >= 1.3 ? [2, 2, 1] : [3, 2];
  const widths = rows.flatMap((count) =>
    Array<number>(count).fill(Math.floor((width - spacing.lg * 2 - GAP * (count - 1)) / count)),
  );

  // Wider tiles get taller photographs, so every tile fills its card.
  const imageHeights = rows.flatMap((count) => Array<number>(count).fill(count === 3 ? 84 : 132));

  return (
    <View style={styles.section}>
      <ThemedText variant="display" color={home.navy} style={styles.title}>
        Explore
      </ThemedText>
      <View style={styles.grid}>
        {DESTINATIONS.map((destination, index) => (
          <Pressable
            key={destination.title}
            onPress={() => router.push(destination.href)}
            accessibilityRole="button"
            accessibilityLabel={destination.label}
            style={({ pressed }) => [
              styles.tile,
              { width: widths[index] },
              pressed && styles.pressed,
            ]}
          >
            <Image
              source={destination.image}
              style={[styles.image, { height: imageHeights[index] }]}
              accessibilityIgnoresInvertColors
            />
            <View style={styles.body}>
              <ThemedText
                variant="heading"
                color={home.navy}
                style={styles.tileTitle}
                numberOfLines={2}
              >
                {destination.title}
              </ThemedText>
              <ThemedText
                variant="caption"
                color={home.ink}
                numberOfLines={3}
                style={styles.tileText}
              >
                {destination.description}
              </ThemedText>
              <View
                style={styles.chevron}
                accessibilityElementsHidden
                importantForAccessibility="no"
              >
                <Ionicons name="chevron-forward" size={14} color={home.bronze} />
              </View>
            </View>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    marginBottom: spacing.xl,
  },
  title: {
    fontSize: 26,
    lineHeight: 32,
    fontFamily: fontFamily.serif,
    marginBottom: spacing.md,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: GAP,
  },
  tile: {
    backgroundColor: home.page,
    borderWidth: 1,
    borderColor: home.border,
    borderRadius: 12,
    overflow: 'hidden',
  },
  pressed: {
    opacity: 0.85,
  },
  image: {
    width: '100%',
    height: 84,
  },
  body: {
    flex: 1,
    padding: spacing.sm + 2,
    paddingBottom: spacing.md,
    minHeight: 124,
  },
  tileTitle: {
    fontSize: 15,
    lineHeight: 19,
    marginBottom: 2,
  },
  tileText: {
    lineHeight: 15,
    fontSize: 11,
  },
  chevron: {
    alignSelf: 'flex-end',
    marginTop: 'auto',
    paddingTop: spacing.sm,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: home.bronzeTint,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
