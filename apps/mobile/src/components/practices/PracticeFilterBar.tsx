import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { ThemedText } from '@/components/ThemedText';
import { home } from '@/components/home/homeTheme';
import { radius, spacing } from '@/theme';

export interface FilterOption {
  /** The value the screen filters by. */
  key: string;
  /** What the member reads. */
  label: string;
}

interface PracticeFilterBarProps {
  /** What this row filters by, e.g. "Focus" or "Format". Shown as a small heading and read out for each chip. */
  label: string;
  /** Only values actually present in the loaded practices, so no chip ever leads to a guaranteed-empty list. */
  options: FilterOption[];
  selected: string | null;
  onSelect: (key: string | null) => void;
}

/** "All" plus one chip per real value present. A row with nothing to choose between is not shown. */
export function PracticeFilterBar({ label, options, selected, onSelect }: PracticeFilterBarProps) {
  if (options.length <= 1) return null;

  return (
    <View style={styles.group}>
      <ThemedText variant="label" color={home.ink} style={styles.heading}>
        {label}
      </ThemedText>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={styles.row}
        accessibilityLabel={`Filter by ${label.toLowerCase()}`}
      >
        <Chip label="All" group={label} active={selected === null} onPress={() => onSelect(null)} />
        {options.map((option) => (
          <Chip
            key={option.key}
            label={option.label}
            group={label}
            active={selected === option.key}
            onPress={() => onSelect(option.key)}
          />
        ))}
      </ScrollView>
    </View>
  );
}

function Chip({
  label,
  group,
  active,
  onPress,
}: {
  label: string;
  group: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      accessibilityLabel={`${group}: ${label}${active ? ', selected' : ''}`}
      style={({ pressed }) => [
        styles.chip,
        active ? styles.chipActive : styles.chipInactive,
        pressed && styles.chipPressed,
      ]}
    >
      <ThemedText variant="label" color={active ? '#FFFFFF' : home.navy}>
        {label}
      </ThemedText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  group: {
    marginBottom: spacing.md,
  },
  heading: {
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: spacing.xs,
  },
  row: {
    gap: spacing.sm,
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
    backgroundColor: home.page,
    borderColor: home.border,
  },
  chipPressed: {
    opacity: 0.85,
  },
});
