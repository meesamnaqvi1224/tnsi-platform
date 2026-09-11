import { Image, Pressable, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Card } from '@/components/Card';
import { ThemedText } from '@/components/ThemedText';
import { capitalize, formatDuration } from '@/lib/format';
import { colors, radius, spacing } from '@/theme';
import type { Practice } from '@/api/types';

const journeyImage = require('../../../assets/images/journey-dock.jpg');

interface ContinuePractiseCardProps {
  practice: Practice;
}

/**
 * A single, real "pick up where you left off" entry - the practice the
 * member most recently played that isn't finished yet. Home decides
 * *whether* to show this (see (tabs)/index.tsx's findContinueCandidate);
 * this component only renders a real practice it's given. The percentage
 * and bar are `practice.progress.progressPct` as already returned by
 * GET /api/v1/today - not a new computation, just now actually shown
 * (the previous version fetched this field and never displayed it). The
 * thumbnail is the same placeholder-photo approach as ForThisMomentCard.
 */
export function ContinuePractiseCard({ practice }: ContinuePractiseCardProps) {
  const router = useRouter();
  const title = practice.title.trim();
  const meta = [capitalize(practice.contentType)];
  if (practice.durationSeconds) meta.push(formatDuration(practice.durationSeconds));
  const pct = Math.round((practice.progress?.progressPct ?? 0) * 100);

  return (
    <Animated.View entering={FadeInDown.duration(450).delay(80)} style={styles.section}>
      <ThemedText variant="heading" style={styles.sectionTitle}>
        Continue where you left off
      </ThemedText>
      <Pressable
        onPress={() => router.push({ pathname: '/practices/[id]', params: { id: practice.id } })}
        accessibilityRole="button"
        accessibilityLabel={`Continue ${title}, ${meta.join(', ')}, ${pct} percent complete`}
        style={({ pressed }) => pressed && styles.pressed}
      >
        <Card style={styles.card}>
          <View style={styles.row}>
            <Image
              source={practice.thumbnailUrl ? { uri: practice.thumbnailUrl } : journeyImage}
              style={styles.thumb}
            />
            <View style={styles.textColumn}>
              <ThemedText variant="body" style={styles.title}>
                {title}
              </ThemedText>
              <ThemedText variant="caption" color={colors.charcoal}>
                {meta.join(' · ')}
              </ThemedText>
              <View style={styles.barTrack}>
                <View style={[styles.barFill, { width: `${Math.min(100, Math.max(0, pct))}%` }]} />
              </View>
            </View>
            <View style={styles.percentBadge}>
              <ThemedText variant="label" color={colors.navy}>
                {pct}%
              </ThemedText>
            </View>
          </View>
        </Card>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  section: {
    marginBottom: spacing.xl,
  },
  sectionTitle: {
    marginBottom: spacing.md,
  },
  pressed: {
    opacity: 0.85,
  },
  card: {
    padding: spacing.md,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  thumb: {
    width: 56,
    height: 56,
    borderRadius: radius.md,
  },
  textColumn: {
    flex: 1,
  },
  title: {
    marginBottom: 2,
  },
  barTrack: {
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.creamMuted,
    marginTop: spacing.sm,
    overflow: 'hidden',
  },
  barFill: {
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.bronze,
  },
  percentBadge: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
