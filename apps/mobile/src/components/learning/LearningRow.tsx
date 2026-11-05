import type { ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { ThemedText } from '@/components/ThemedText';
import { PracticeThumbnail } from '@/components/practices/PracticeThumbnail';
import { capitalize, formatDuration } from '@/lib/format';
import { home, homeCardStyle } from '@/components/home/homeTheme';
import { radius, spacing } from '@/theme';
import type { PracticeContentType } from '@/api/types';

const THUMB = 84;

interface LearningRowProps {
  title: string;
  contentType: PracticeContentType;
  thumbnailUrl: string | null;
  durationSeconds: number | null;
  /** Short status lines under the title, most important first. */
  lines?: string[];
  /** 0 to 1: draws a thin progress line under the text. */
  progress?: number | null;
  onPress: () => void;
  accessibilityLabel: string;
  /** Actions shown under the row (Continue, Save). A sibling of the row's own button, never nested in it. */
  action?: ReactNode;
}

/**
 * One practice as a bordered card: a small image, the format and length in bronze, the title in the
 * serif face, a quiet line or two of status and a thin progress bar when there is progress.
 */
export function LearningRow({
  title,
  contentType,
  thumbnailUrl,
  durationSeconds,
  lines = [],
  progress = null,
  onPress,
  accessibilityLabel,
  action,
}: LearningRowProps) {
  const meta = [capitalize(contentType), durationSeconds ? formatDuration(durationSeconds) : null]
    .filter(Boolean)
    .join(' · ');

  return (
    <View style={styles.item}>
      <Pressable
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel}
        style={({ pressed }) => [styles.row, pressed && styles.pressed]}
      >
        <View style={styles.thumb}>
          <PracticeThumbnail
            thumbnailUrl={thumbnailUrl}
            contentType={contentType}
            height={THUMB}
            showLabel={false}
          />
        </View>
        <View style={styles.text}>
          <ThemedText variant="label" color={home.bronze} style={styles.meta}>
            {meta}
          </ThemedText>
          <ThemedText variant="heading" color={home.navy} style={styles.title}>
            {title.trim()}
          </ThemedText>
          {lines.map((line) => (
            <ThemedText key={line} variant="caption" color={home.ink} style={styles.line}>
              {line}
            </ThemedText>
          ))}
          {progress !== null ? (
            <View style={styles.track} accessible={false}>
              <View style={[styles.fill, { width: `${Math.round(progress * 100)}%` }]} />
            </View>
          ) : null}
        </View>
      </Pressable>
      {action ? <View style={styles.action}>{action}</View> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  item: {
    ...homeCardStyle,
    backgroundColor: home.page,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  row: {
    flexDirection: 'row',
    gap: spacing.md,
    alignItems: 'flex-start',
    minHeight: THUMB,
  },
  pressed: {
    opacity: 0.8,
  },
  thumb: {
    width: THUMB,
    height: THUMB,
    borderRadius: radius.md,
    overflow: 'hidden',
  },
  text: {
    flex: 1,
    minWidth: 0,
  },
  meta: {
    textTransform: 'uppercase',
    fontSize: 10,
    letterSpacing: 1.2,
    marginBottom: 2,
  },
  title: {
    fontSize: 17,
    lineHeight: 22,
    marginBottom: 2,
  },
  line: {
    marginTop: 2,
  },
  track: {
    height: 3,
    marginTop: spacing.sm,
    borderRadius: 2,
    backgroundColor: '#E6E9ED',
    overflow: 'hidden',
  },
  fill: {
    height: 3,
    backgroundColor: home.bronze,
  },
  action: {
    // Lines up with the text column: the image width plus the gap beside it.
    marginLeft: THUMB + spacing.md,
    marginTop: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
});
