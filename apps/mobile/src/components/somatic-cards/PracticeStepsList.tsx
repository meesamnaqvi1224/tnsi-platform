import { StyleSheet, View } from 'react-native';
import { ThemedText } from '@/components/ThemedText';
import { sortByOrder } from '@/lib/somatic-card-order';
import { colors, spacing } from '@/theme';
import type { SomaticPracticeStep } from '@/api/types';

interface PracticeStepsListProps {
  steps: SomaticPracticeStep[];
}

/**
 * Ordered practice steps - every step rendered regardless of count
 * (1, 2, 3, or 4+; never assumes exactly 3), sorted by the API's own
 * `order` field (see `sortByOrder`), optional `label` rendered only when
 * present. A numbered row is the native equivalent of an `<ol>` - order
 * is meaningful here, not decorative.
 */
export function PracticeStepsList({ steps }: PracticeStepsListProps) {
  if (steps.length === 0) return null;
  const ordered = sortByOrder(steps);

  return (
    <View accessibilityRole="list">
      {ordered.map((step, i) => (
        <View key={`${step.order}-${i}`} style={styles.row} accessibilityRole="text">
          <ThemedText variant="body" color={colors.bronze} style={styles.number}>
            {i + 1}
          </ThemedText>
          <ThemedText variant="body" style={styles.instruction}>
            {step.label ? (
              <ThemedText variant="body" style={styles.label}>
                {step.label}:{' '}
              </ThemedText>
            ) : null}
            {step.instruction}
          </ThemedText>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    marginBottom: spacing.sm,
  },
  number: {
    width: 24,
  },
  instruction: {
    flex: 1,
  },
  label: {
    fontWeight: '600',
  },
});
