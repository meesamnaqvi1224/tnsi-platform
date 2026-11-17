import { Pressable, ScrollView, StyleSheet } from 'react-native';
import { ThemedText } from '@/components/ThemedText';
import { colors, radius, spacing } from '@/theme';
import { home } from '@/components/home/homeTheme';

interface PowerDropCategoryBarProps {
  /** Only the category values actually present in the fetched PowerDrops - never the full taxonomy, so no filter ever leads to a guaranteed-empty result. */
  availableCategories: string[];
  selected: string | null;
  onSelect: (category: string | null) => void;
}

/** "All" plus one chip per real category present in the library. Mirrors PracticeFilterBar. */
export function PowerDropCategoryBar({
  availableCategories,
  selected,
  onSelect,
}: PowerDropCategoryBarProps) {
  if (availableCategories.length <= 1) return null;

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      // Do not grow to fill spare height when the screen below is short.
      style={styles.scroller}
      contentContainerStyle={styles.row}
    >
      <Chip label="All" active={selected === null} onPress={() => onSelect(null)} />
      {availableCategories.map((category) => (
        <Chip
          key={category}
          label={category}
          active={selected === category}
          onPress={() => onSelect(category)}
        />
      ))}
    </ScrollView>
  );
}

function Chip({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      accessibilityLabel={`Filter: ${label}${active ? ', selected' : ''}`}
      style={({ pressed }) => [
        styles.chip,
        active ? styles.chipActive : styles.chipInactive,
        pressed && styles.chipPressed,
      ]}
    >
      <ThemedText variant="label" color={active ? colors.cream : home.ink}>
        {label}
      </ThemedText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  scroller: {
    flexGrow: 0,
  },
  row: {
    gap: spacing.sm,
    paddingBottom: spacing.lg,
  },
  chip: {
    paddingHorizontal: spacing.md,
    minHeight: 48,
    borderRadius: radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  chipActive: {
    backgroundColor: home.navy,
    borderColor: home.navy,
  },
  chipInactive: {
    backgroundColor: colors.white,
    borderColor: home.border,
  },
  chipPressed: {
    opacity: 0.85,
  },
});
