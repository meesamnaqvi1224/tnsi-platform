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
 * Six ways into the app, once each: the practice library, the two collections, My Learning, Resources
 * and My Journey. Each tile uses an existing approved photograph. Static: nothing is fetched and
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
    title: 'Resources',
    description: 'Articles, insights and guidance',
    href: '/resources',
    image: require('../../../assets/images/quick-ground.jpg'),
    label: 'Resources, articles, insights and guidance',
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
  // Large text sizes: two columns instead of three, so titles and descriptions keep room to read.
  const columns = fontScale >= 1.3 ? 2 : 3;
  // Home's content is inset by spacing.lg on each side; tiles share what is left, minus the gaps.
  const tileWidth = Math.floor((width - spacing.lg * 2 - GAP * (columns - 1)) / columns);

  return (
    <View style={styles.section}>
      <ThemedText variant="display" color={home.navy} style={styles.title}>
        Explore
      </ThemedText>
      <View style={styles.grid}>
        {DESTINATIONS.map((destination) => (
          <Pressable
            key={destination.title}
            onPress={() => router.push(destination.href)}
            accessibilityRole="button"
            accessibilityLabel={destination.label}
            style={({ pressed }) => [styles.tile, { width: tileWidth }, pressed && styles.pressed]}
          >
            <Image
              source={destination.image}
              style={styles.image}
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
    height: 232,
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
