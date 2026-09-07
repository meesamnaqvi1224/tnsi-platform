import { Pressable, ScrollView, StyleSheet } from 'react-native';
import { ThemedText } from '@/components/ThemedText';
import { colors, radius, spacing } from '@/theme';

export interface ArticleCategoryOption {
  slug: string;
  title: string;
}

interface ArticleFilterBarProps {
  /** Only categories actually present in the fetched articles, in first-seen order - never a separately maintained taxonomy, never fabricated counts. */
  categories: ArticleCategoryOption[];
  selected: string | null;
  onSelect: (categorySlug: string | null) => void;
}

/** "All" plus one chip per real category present in the library. */
export function ArticleFilterBar({ categories, selected, onSelect }: ArticleFilterBarProps) {
  if (categories.length <= 1) return null;

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.row}
    >
      <Chip label="All" active={selected === null} onPress={() => onSelect(null)} />
      {categories.map((category) => (
        <Chip
          key={category.slug}
          label={category.title}
          active={selected === category.slug}
          onPress={() => onSelect(category.slug)}
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
    minHeight: 40,
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
