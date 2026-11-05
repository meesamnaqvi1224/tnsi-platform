import { Image, Pressable, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { ThemedText } from '@/components/ThemedText';
import { home, homeCardStyle } from '@/components/home/homeTheme';
import {
  formatDurationLabel,
  guidedPracticeRoutes,
  type GuidedPractice,
} from '@/lib/guided-practices';
import { spacing } from '@/theme';

/** Existing approved photographs, one per guided practice. */
const PHOTOS: Record<string, number> = {
  '90-second-reset': require('../../../assets/images/quick-regulate.jpg'),
  'the-empty-chair': require('../../../assets/images/institute-consultation.jpg'),
};

/**
 * A way into one standalone guided audio practice, listed in the Practices screen: photograph on the
 * left, kind and length, title and subtitle in the middle, a round play button on the right. Static:
 * no recommendation logic, nothing fetched.
 */
export function GuidedPracticeCard({ practice }: { practice: GuidedPractice }) {
  const router = useRouter();
  const duration = formatDurationLabel(practice.durationSeconds);
  const photo = PHOTOS[practice.slug];

  return (
    <Pressable
      onPress={() => router.push(guidedPracticeRoutes(practice.slug).intro)}
      accessibilityRole="button"
      accessibilityLabel={`${practice.title}, ${practice.condition}, ${practice.format}, ${duration}`}
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}
    >
      {photo ? (
        <Image source={photo} style={styles.photo} accessibilityIgnoresInvertColors />
      ) : null}
      <View style={styles.text}>
        <ThemedText variant="label" color={home.bronze} style={styles.eyebrow}>
          {practice.condition} · {practice.format}
        </ThemedText>
        <ThemedText variant="heading" color={home.navy} style={styles.title}>
          {practice.title}
        </ThemedText>
        <ThemedText variant="caption" color={home.ink} numberOfLines={2}>
          {practice.subtitle}
        </ThemedText>
        <ThemedText variant="caption" color={home.ink} style={styles.duration}>
          {duration}
        </ThemedText>
      </View>
      <View style={styles.play} accessibilityElementsHidden importantForAccessibility="no">
        <Ionicons name="play" size={16} color="#FFFFFF" />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  pressed: { opacity: 0.9 },
  card: {
    ...homeCardStyle,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: home.page,
    overflow: 'hidden',
    marginBottom: spacing.sm + 2,
  },
  photo: { width: 96, height: 112 },
  text: { flex: 1, paddingVertical: spacing.md, paddingHorizontal: spacing.md },
  eyebrow: { textTransform: 'uppercase', fontSize: 10, letterSpacing: 1.2, marginBottom: 2 },
  title: { fontSize: 17, lineHeight: 22, marginBottom: 2 },
  duration: { marginTop: spacing.xs },
  play: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: home.navy,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
});
