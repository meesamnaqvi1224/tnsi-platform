import { StyleSheet, View } from 'react-native';
import { ThemedText } from '@/components/ThemedText';
import { sortByOrder } from '@/lib/somatic-card-order';
import { colors, spacing } from '@/theme';
import type { SomaticWhatToNoticeItem } from '@/api/types';

interface WhatToNoticeListProps {
  items: SomaticWhatToNoticeItem[];
}

/** Ordered "What to Notice" prompts - every item rendered, sorted by the API's own `order` field, never collapsed or summarized. */
export function WhatToNoticeList({ items }: WhatToNoticeListProps) {
  if (items.length === 0) return null;
  const ordered = sortByOrder(items);

  return (
    <View accessibilityRole="list">
      {ordered.map((item, i) => (
        <View key={`${item.order}-${i}`} style={styles.row}>
          <ThemedText variant="body" color={colors.bronze} style={styles.bullet}>
            •
          </ThemedText>
          <ThemedText variant="body" style={styles.text}>
            {item.text}
          </ThemedText>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    marginBottom: spacing.xs,
  },
  bullet: {
    width: 16,
  },
  text: {
    flex: 1,
  },
});
