import { Image, Pressable, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { ThemedText } from '@/components/ThemedText';
import { stockImageFor } from '@/components/practices/PracticeThumbnail';
import { formatDuration } from '@/lib/format';
import { categoryLabel } from '@/lib/practice-library';
import { fontFamily, spacing } from '@/theme';
import { home } from './homeTheme';
import type { Practice } from '@/api/types';

const CARD_IMAGE_HEIGHT = 150;

const momentImage = require('../../../assets/images/practice-moment.jpg');

interface ForThisMomentCardProps {
  practice: Practice | null;
  /** Whether today's check-in has already been recorded - lets the empty
   * state below tell the two honest reasons apart (no check-in yet, vs.
   * checked in but nothing tagged for that category yet) instead of one
   * generic message for both. */
  hasCheckedInToday: boolean;
}

/**
 * Home's presentation of `todayPractice` from GET /api/v1/today - a deterministic content-routing pick
 * from the member's latest capacity check-in (see apps/web/src/lib/practices.ts's
 * getRecommendedPractice), not a display-order pick. This component has no recommendation logic: it
 * renders what the backend decided, or an empty state when that is `null`. The card is one
 * horizontal piece: the practice's own thumbnail (or an existing approved image) on the left, its
 * category, title, description and length on the right, and a round play button. The whole card opens
 * the practice; a practice the member's plan does not include is marked "Members" and the practice
 * screen explains it, exactly as before.
 */
export function ForThisMomentCard({ practice, hasCheckedInToday }: ForThisMomentCardProps) {
  const router = useRouter();

  const header = (
    <View style={styles.headerRow}>
      <ThemedText variant="display" color={home.navy} style={styles.sectionTitle}>
        Your practice for today
      </ThemedText>
    </View>
  );

  if (!practice) {
    return (
      <View style={styles.section}>
        {header}
        <View style={styles.card}>
          <Image source={momentImage} style={styles.image} accessibilityIgnoresInvertColors />
          <View style={styles.body}>
            <ThemedText variant="heading" color={home.navy} style={styles.title}>
              {hasCheckedInToday ? 'Nothing matched today' : 'Check in first'}
            </ThemedText>
            <ThemedText variant="caption" color={home.ink} style={styles.description}>
              {hasCheckedInToday
                ? 'No practice is available today.'
                : "Complete today's check-in to see a practice for this moment."}
            </ThemedText>
          </View>
        </View>
      </View>
    );
  }

  const open = () => router.push({ pathname: '/practices/[id]', params: { id: practice.id } });
  const category = practice.category?.trim() ? categoryLabel(practice.category) : null;
  const locked = practice.locked === true;
  const duration = practice.durationSeconds ? formatDuration(practice.durationSeconds) : null;
  const eyebrow = [category, locked ? 'Members' : null].filter(Boolean).join(' · ');

  return (
    <View style={styles.section}>
      {header}
      <Pressable
        onPress={open}
        accessibilityRole="button"
        accessibilityLabel={`${practice.title.trim()}${duration ? `, ${duration}` : ''}${locked ? ', members only' : ''}. Recommended for you. Opens the practice.`}
        style={({ pressed }) => [styles.card, pressed && styles.pressed]}
      >
        <View style={styles.imageWrap}>
          <Image
            source={
              practice.thumbnailUrl
                ? { uri: practice.thumbnailUrl }
                : (stockImageFor(practice.contentType) ?? momentImage)
            }
            style={styles.image}
            resizeMode="cover"
            accessibilityIgnoresInvertColors
          />
        </View>
        <View style={styles.body}>
          <ThemedText variant="label" color={home.bronze} style={styles.eyebrow}>
            Recommended for you{eyebrow ? ` · ${eyebrow}` : ''}
          </ThemedText>
          <ThemedText variant="heading" color={home.navy} style={styles.title} numberOfLines={2}>
            {practice.title.trim()}
          </ThemedText>
          {practice.description ? (
            <ThemedText
              variant="caption"
              color={home.ink}
              style={styles.description}
              numberOfLines={2}
            >
              {practice.description}
            </ThemedText>
          ) : null}
          {duration ? (
            <View style={styles.duration}>
              <Ionicons name="time-outline" size={13} color={home.ink} />
              <ThemedText variant="caption" color={home.ink}>
                {duration}
              </ThemedText>
            </View>
          ) : null}
        </View>
        <View style={styles.play} accessibilityElementsHidden importantForAccessibility="no">
          <Ionicons name={locked ? 'lock-closed' : 'play'} size={18} color="#FFFFFF" />
        </View>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    marginBottom: spacing.xl,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  sectionTitle: {
    fontSize: 26,
    lineHeight: 32,
    fontFamily: fontFamily.serif,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: home.page,
    borderWidth: 1,
    borderColor: home.border,
    borderRadius: 14,
    overflow: 'hidden',
    shadowColor: home.navy,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 1,
  },
  pressed: {
    opacity: 0.9,
  },
  image: {
    width: 118,
    height: CARD_IMAGE_HEIGHT,
  },
  imageWrap: {
    width: 118,
    height: CARD_IMAGE_HEIGHT,
    overflow: 'hidden',
  },
  body: {
    flex: 1,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
  },
  eyebrow: {
    fontSize: 10,
    letterSpacing: 1.4,
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  title: {
    fontSize: 19,
    lineHeight: 24,
    marginBottom: 4,
  },
  description: {
    marginBottom: spacing.sm,
  },
  duration: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  play: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: home.navy,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
});
