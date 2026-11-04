import { Pressable, StyleSheet, View } from 'react-native';
import { ThemedText } from '@/components/ThemedText';
import { LEARNING_VIEWS, type LearningView } from '@/lib/my-learning';
import { colors, spacing } from '@/theme';

const LABELS: Record<LearningView, string> = {
  'in-progress': 'In Progress',
  completed: 'Completed',
  saved: 'Saved',
};

interface LearningTabsProps {
  selected: LearningView;
  onSelect: (view: LearningView) => void;
  /** A count to show beside a label. Leave a view out when its count is not known (for example, history still has more to load). */
  counts?: Partial<Record<LearningView, number>>;
}

/**
 * The three views of My Learning as quiet text tabs on one hairline: the selected one is
 * navy with a bronze underline, the others are softer. Each is at least 48 dp tall.
 */
export function LearningTabs({ selected, onSelect, counts = {} }: LearningTabsProps) {
  return (
    <View accessibilityRole="tablist" style={styles.bar}>
      {LEARNING_VIEWS.map((view) => {
        const active = view === selected;
        const count = counts[view];
        return (
          <Pressable
            key={view}
            onPress={() => onSelect(view)}
            accessibilityRole="tab"
            accessibilityState={{ selected: active }}
            accessibilityLabel={count === undefined ? LABELS[view] : `${LABELS[view]}, ${count}`}
            style={[styles.tab, active && styles.tabActive]}
          >
            <ThemedText
              variant="label"
              color={active ? colors.navy : colors.charcoal + '99'}
              style={styles.label}
            >
              {LABELS[view]}
            </ThemedText>
            {count !== undefined ? (
              <ThemedText
                variant="caption"
                color={active ? colors.bronze : colors.charcoal + '99'}
                style={styles.count}
              >
                {count}
              </ThemedText>
            ) : null}
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
    marginBottom: spacing.lg,
  },
  tab: {
    flex: 1,
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    // The underline of the selected tab sits on the bar's own hairline.
    marginBottom: -StyleSheet.hairlineWidth,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabActive: {
    borderBottomColor: colors.bronze,
  },
  label: {
    textTransform: 'uppercase',
  },
  count: {
    minWidth: 12,
  },
});
