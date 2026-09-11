import { Image, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Card } from '@/components/Card';
import { ThemedText } from '@/components/ThemedText';
import { PrimaryButton } from '@/components/PrimaryButton';
import { capitalize, formatDuration } from '@/lib/format';
import { colors, spacing } from '@/theme';
import type { Practice } from '@/api/types';

const momentImage = require('../../../assets/images/practice-moment.jpg');

interface ForThisMomentCardProps {
  practice: Practice | null;
}

/**
 * Home's editorial presentation of `todayPractice` from GET /api/v1/today -
 * a deterministic content-routing pick from the user's latest capacity
 * check-in (see apps/web/src/lib/practices.ts's getRecommendedPractice),
 * not a display-order pick. This component itself has no recommendation
 * logic and no "based on your check-ins" framing - it just renders whatever
 * the backend decided, or the empty state below when that's `null` (no
 * check-in yet, or no practice tagged with the recommended category yet).
 * Shows the practice's own real thumbnail when it has one; otherwise a
 * placeholder mood photo
 * (not a real photo of this practice - swap for real photography later)
 * rather than the plain branded fallback used elsewhere, since this is
 * Home's single largest visual moment.
 *
 * A single "Begin Practice" button is the only tap target (not the whole
 * card wrapped in a Pressable) - nesting a Pressable button inside a
 * Pressable card is an RN anti-pattern that causes unreliable touch
 * handling between the two.
 */
export function ForThisMomentCard({ practice }: ForThisMomentCardProps) {
  const router = useRouter();

  if (!practice) {
    return (
      <View style={styles.section}>
        <ThemedText variant="heading" style={styles.sectionTitle}>
          For this moment
        </ThemedText>
        <ThemedText variant="body" color={colors.charcoal}>
          No practice is available today.
        </ThemedText>
      </View>
    );
  }

  function open() {
    router.push({ pathname: '/practices/[id]', params: { id: practice!.id } });
  }

  return (
    <Animated.View entering={FadeInDown.duration(450)} style={styles.section}>
      <ThemedText variant="heading" style={styles.sectionTitle}>
        For this moment
      </ThemedText>
      <ThemedText variant="body" color={colors.charcoal} style={styles.sectionSubtitle}>
        A gentle practice to support you now.
      </ThemedText>

      <Card style={styles.card}>
        <Image
          source={practice.thumbnailUrl ? { uri: practice.thumbnailUrl } : momentImage}
          style={styles.image}
        />
        <ThemedText variant="heading" style={styles.title}>
          {practice.title.trim()}
        </ThemedText>
        <ThemedText variant="caption" color={colors.charcoal} style={styles.meta}>
          {capitalize(practice.contentType)}
          {practice.durationSeconds ? ` · ${formatDuration(practice.durationSeconds)}` : ''}
        </ThemedText>
        {practice.description ? (
          <ThemedText variant="body" color={colors.charcoal} style={styles.description}>
            {practice.description}
          </ThemedText>
        ) : null}
        <PrimaryButton label="Begin Practice" onPress={open} style={styles.button} />
      </Card>
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
  card: {
    padding: 0,
    overflow: 'hidden',
  },
  image: {
    width: '100%',
    height: 200,
    borderRadius: 0,
  },
  title: {
    marginHorizontal: spacing.lg,
    marginTop: spacing.md,
    marginBottom: spacing.xs,
  },
  meta: {
    marginHorizontal: spacing.lg,
    marginBottom: spacing.sm,
  },
  description: {
    marginHorizontal: spacing.lg,
    marginBottom: spacing.lg,
  },
  button: {
    marginHorizontal: spacing.lg,
    marginBottom: spacing.lg,
    alignSelf: 'flex-start',
    paddingHorizontal: spacing.xl,
  },
});
