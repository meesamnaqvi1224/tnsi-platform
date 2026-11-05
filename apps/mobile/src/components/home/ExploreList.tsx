import { Pressable, StyleSheet, View } from 'react-native';
import { useRouter, type Href } from 'expo-router';
import { Card } from '@/components/Card';
import { ThemedText } from '@/components/ThemedText';
import { SectionLabel } from '@/components/SectionLabel';
import { colors, spacing } from '@/theme';

interface Destination {
  title: string;
  caption: string;
  href: Href;
  label: string;
}

/**
 * Every way into the app's libraries, once, in plain rows. Static: nothing is fetched and
 * nothing is recommended here, so Home does not repeat the Practices or My Learning libraries,
 * it only points to them. Each destination is a separate collection; Resources is separate from
 * all practice content.
 */
const DESTINATIONS: Destination[] = [
  {
    title: 'Guided practices',
    caption: 'The 90-Second Reset and The Empty Chair.',
    href: '/practices',
    label: 'Guided practices, in the Practices library',
  },
  {
    title: 'Breathing exercise',
    caption: 'A few minutes of guided breathing.',
    href: '/practices/breathing',
    label: 'Breathing exercise, a guided breathing session',
  },
  {
    title: 'PowerDrops™',
    caption: 'A small practice for the moment you’re in.',
    href: '/practices/powerdrops',
    label: 'PowerDrops, small practices',
  },
  {
    title: 'Somatic Cards',
    caption: 'A guided library of somatic practice cards.',
    href: '/practices/somatic-cards',
    label: 'Somatic Cards, a library of practice cards',
  },
  {
    title: 'My Learning',
    caption: 'In progress, completed and saved.',
    href: '/my-learning',
    label: 'My Learning, your in progress, completed and saved practices',
  },
  {
    title: 'Resources',
    caption: 'Articles, insights and research.',
    href: '/resources',
    label: 'Resources, articles and insights',
  },
];

export function ExploreList() {
  const router = useRouter();

  return (
    <View style={styles.section}>
      <SectionLabel>Explore</SectionLabel>
      <Card style={styles.card}>
        {DESTINATIONS.map((destination, index) => (
          <Pressable
            key={destination.title}
            onPress={() => router.push(destination.href)}
            accessibilityRole="button"
            accessibilityLabel={destination.label}
            style={({ pressed }) => [
              styles.row,
              index > 0 && styles.divider,
              pressed && styles.pressed,
            ]}
          >
            <View style={styles.text}>
              <ThemedText variant="body" style={styles.title}>
                {destination.title}
              </ThemedText>
              <ThemedText variant="caption" color={colors.charcoal}>
                {destination.caption}
              </ThemedText>
            </View>
            <ThemedText variant="label" color={colors.bronze}>
              →
            </ThemedText>
          </Pressable>
        ))}
      </Card>
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    marginBottom: spacing.xl,
  },
  card: {
    padding: 0,
    overflow: 'hidden',
  },
  row: {
    minHeight: 64,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  divider: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  pressed: {
    opacity: 0.7,
  },
  text: {
    flex: 1,
  },
  title: {
    marginBottom: 2,
  },
});
