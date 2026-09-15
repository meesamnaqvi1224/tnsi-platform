import { Image, Pressable, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { ThemedText } from '@/components/ThemedText';
import { capitalize, formatDuration } from '@/lib/format';
import { colors, imageHeight, imageOverlayGradient, radius, spacing } from '@/theme';
import type { Practice } from '@/api/types';

const journeyImage = require('../../../assets/images/journey-dock.jpg');

interface ContinuePractiseCardProps {
  practice: Practice;
}

/**
 * A large image-led "pick up where you left off" card - the practice the
 * member most recently played that isn't finished yet. Home decides
 * *whether* to show this (see (tabs)/index.tsx's findContinueCandidate);
 * this component only renders a real practice it's given. The percentage
 * and bar are `practice.progress.progressPct` as already returned by
 * GET /api/v1/today - not a new computation. Restructured this engagement
 * from a compact list row into an image-dominant card (title/meta/progress
 * overlaid on the photo, matching For This Moment's treatment) per the
 * editorial redesign direction - the underlying data and navigation are
 * unchanged.
 */
export function ContinuePractiseCard({ practice }: ContinuePractiseCardProps) {
  const router = useRouter();
  const title = practice.title.trim();
  const meta = [capitalize(practice.contentType)];
  if (practice.durationSeconds) meta.push(formatDuration(practice.durationSeconds));
  const pct = Math.round((practice.progress?.progressPct ?? 0) * 100);

  function open() {
    router.push({ pathname: '/practices/[id]', params: { id: practice.id } });
  }

  return (
    <Animated.View entering={FadeInDown.duration(450).delay(80)} style={styles.section}>
      <ThemedText variant="heading" style={styles.sectionTitle}>
        Continue where you left off
      </ThemedText>
      <ThemedText variant="body" color={colors.charcoal} style={styles.sectionSubtitle}>
        Pick up right where you paused.
      </ThemedText>

      <Pressable
        onPress={open}
        accessibilityRole="button"
        accessibilityLabel={`Continue ${title}, ${meta.join(', ')}, ${pct} percent complete`}
        style={({ pressed }) => [styles.card, pressed && styles.pressed]}
      >
        <Image
          source={practice.thumbnailUrl ? { uri: practice.thumbnailUrl } : journeyImage}
          style={styles.image}
        />
        <LinearGradient colors={imageOverlayGradient} style={StyleSheet.absoluteFill} />
        <View style={styles.overlay}>
          <View style={styles.textColumn}>
            <ThemedText variant="heading" color={colors.cream} style={styles.title}>
              {title}
            </ThemedText>
            <ThemedText variant="caption" color={colors.creamMuted} style={styles.meta}>
              {meta.join(' · ')}
            </ThemedText>
            <View style={styles.barTrack}>
              <View style={[styles.barFill, { width: `${Math.min(100, Math.max(0, pct))}%` }]} />
            </View>
          </View>
          <View style={styles.playButton}>
            <Ionicons name="play" size={20} color={colors.navy} />
          </View>
        </View>
      </Pressable>
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
  pressed: {
    opacity: 0.92,
  },
  card: {
    height: imageHeight.secondary,
    borderRadius: radius.lg,
    overflow: 'hidden',
  },
  image: {
    width: '100%',
    height: '100%',
    position: 'absolute',
  },
  overlay: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    padding: spacing.lg,
  },
  textColumn: {
    flex: 1,
    marginRight: spacing.md,
  },
  title: {
    marginBottom: 2,
  },
  meta: {
    marginBottom: spacing.sm,
  },
  barTrack: {
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(247,243,234,0.3)',
    overflow: 'hidden',
    maxWidth: 200,
  },
  barFill: {
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.bronze,
  },
  playButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.cream,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
