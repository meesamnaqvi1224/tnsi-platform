import { Pressable, StyleSheet, View } from 'react-native';
import { ThemedText } from '@/components/ThemedText';
import { home, homeCardStyle } from '@/components/home/homeTheme';
import { formatReflectionDate } from '@/lib/reflections';
import { spacing } from '@/theme';
import type { ReflectionListItem } from '@/api/types';

/**
 * One reflection in the history: when the writing began, an optional title and a short preview. Never
 * the full text. A draft carries a quiet "Draft" tag.
 */
export function ReflectionRow({
  entry,
  onPress,
}: {
  entry: ReflectionListItem;
  onPress: () => void;
}) {
  const date = formatReflectionDate(entry.createdAt);
  const isDraft = entry.status === 'draft';
  const preview = entry.preview + (entry.previewTruncated ? '…' : '');
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${isDraft ? 'Draft. ' : ''}${date}. ${entry.title ? entry.title + '. ' : ''}${preview}`}
      style={({ pressed }) => [styles.row, pressed && styles.pressed]}
    >
      <View style={styles.meta}>
        <ThemedText variant="caption" color={home.ink}>
          {date}
        </ThemedText>
        {isDraft ? (
          <ThemedText variant="label" color={home.bronze} style={styles.tag}>
            Draft
          </ThemedText>
        ) : null}
      </View>
      {entry.title ? (
        <ThemedText variant="heading" color={home.navy} numberOfLines={2} style={styles.title}>
          {entry.title}
        </ThemedText>
      ) : null}
      {preview ? (
        <ThemedText variant="body" color={home.ink} numberOfLines={3}>
          {preview}
        </ThemedText>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    ...homeCardStyle,
    backgroundColor: home.page,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  pressed: { opacity: 0.85 },
  meta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.xs,
  },
  tag: { textTransform: 'uppercase', letterSpacing: 1 },
  title: { marginBottom: spacing.xs },
});
