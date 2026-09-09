import { Pressable, ScrollView, StyleSheet } from 'react-native';
import { ThemedText } from '@/components/ThemedText';
import { capitalize } from '@/lib/format';
import { colors, radius, spacing } from '@/theme';
import type { PracticeContentType } from '@/api/types';

interface PracticeFilterBarProps {
  /** Only the content types actually present in the fetched practices - never the full enum, so no filter ever leads to a guaranteed-empty result. */
  availableTypes: PracticeContentType[];
  selected: PracticeContentType | null;
  onSelect: (type: PracticeContentType | null) => void;
}

/** "All" plus one chip per real content type present in the library. */
export function PracticeFilterBar({ availableTypes, selected, onSelect }: PracticeFilterBarProps) {
  if (availableTypes.length <= 1) return null;

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.row}
    >
      <Chip label="All" active={selected === null} onPress={() => onSelect(null)} />
      {availableTypes.map((type) => (
        <Chip
          key={type}
          label={capitalize(type)}
          active={selected === type}
          onPress={() => onSelect(type)}
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
      <ThemedText variant="label" color={active ? colors.cream : colors.charcoal}>
        {label}
      </ThemedText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    gap: spacing.sm,
    paddingBottom: spacing.lg,
  },
  chip: {
    paddingHorizontal: spacing.md,
    minHeight: 44,
    borderRadius: radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  chipActive: {
    backgroundColor: colors.navy,
    borderColor: colors.navy,
  },
  chipInactive: {
    backgroundColor: colors.white,
    borderColor: colors.border,
  },
  chipPressed: {
    opacity: 0.85,
  },
});
