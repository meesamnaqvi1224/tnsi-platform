import { Pressable, StyleSheet, View } from 'react-native';
import { ThemedText } from '@/components/ThemedText';
import { LEARNING_VIEWS, type LearningView } from '@/lib/my-learning';
import { home } from '@/components/home/homeTheme';
import { spacing } from '@/theme';

const LABELS: Record<LearningView, string> = {
  'in-progress': 'In Progress',
  completed: 'Completed',
  saved: 'Saved',
  'check-ins': 'Check-ins',
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
              color={active ? home.navy : home.ink}
              style={styles.label}
              numberOfLines={1}
            >
              {LABELS[view]}
            </ThemedText>
            {count !== undefined ? (
              <ThemedText
                variant="caption"
                color={active ? home.bronze : home.ink}
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
    borderBottomColor: home.border,
    marginBottom: spacing.lg,
  },
  tab: {
    flex: 1,
    minHeight: 48,
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
    paddingHorizontal: 2,
    // The underline of the selected tab sits on the bar's own hairline.
    marginBottom: -StyleSheet.hairlineWidth,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabActive: {
    borderBottomColor: home.bronze,
  },
  label: {
    textTransform: 'uppercase',
    fontSize: 11,
    letterSpacing: 0.3,
    textAlign: 'center',
  },
  count: {
    minWidth: 12,
  },
});
