import { Pressable, StyleSheet, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { ThemedText } from '@/components/ThemedText';
import { colors, radius, spacing } from '@/theme';

/**
 * The five capacity-oriented options a check-in can report, in low-to-high
 * order. `value` is the same 1-5 scale `packages/core/src/practices/
 * recommendation.ts`'s `categoryForCapacityScore` already normalizes into a
 * capacity state - this list exists so the member never sees that number or
 * a clinical label, only these plain-language options. `icon` is a purely
 * decorative weather metaphor (matching the app's own mountain/sky
 * photography elsewhere) - never shown as a score, never implying a
 * diagnosis, just a gentle visual echo of the same plain-language label.
 */
export const CAPACITY_OPTIONS = [
  { label: 'A lot is going on', value: 1, icon: 'rainy-outline' },
  { label: "I'm feeling unsettled", value: 2, icon: 'cloud-outline' },
  { label: "I'm okay", value: 3, icon: 'partly-sunny-outline' },
  { label: 'I’m feeling good', value: 4, icon: 'sunny-outline' },
  { label: 'I’m feeling really well', value: 5, icon: 'sunny' },
] as const satisfies readonly {
  label: string;
  value: number;
  icon: keyof typeof Ionicons.glyphMap;
}[];

/** The option's label for a given 1-5 score, or null if the score is out of range. */
export function capacityOptionLabel(value: number): string | null {
  return CAPACITY_OPTIONS.find((option) => option.value === value)?.label ?? null;
}

interface CapacityOptionListProps {
  value: number | null;
  onChange: (value: number) => void;
  disabled?: boolean;
}

/**
 * A single-select list of five plain-language options - not a 1-5 scale, no
 * numbers shown, no second question. Reuses the existing check-in
 * infrastructure unchanged: the chosen option's `value` is submitted as
 * both `moodScore` and `capacityScore` (that pair is what the API already
 * requires), and only `capacityScore` is what the recommendation engine
 * actually reads.
 */
export function CapacityOptionList({ value, onChange, disabled = false }: CapacityOptionListProps) {
  return (
    <View style={styles.container} accessibilityRole="radiogroup">
      {CAPACITY_OPTIONS.map((option) => (
        <CapacityOption
          key={option.value}
          option={option}
          selected={value === option.value}
          disabled={disabled}
          onPress={() => onChange(option.value)}
        />
      ))}
    </View>
  );
}

interface CapacityOptionProps {
  option: (typeof CAPACITY_OPTIONS)[number];
  selected: boolean;
  disabled: boolean;
  onPress: () => void;
}

/** One option row, its own component so the selection spring only ever animates the row that actually changed. */
function CapacityOption({ option, selected, disabled, onPress }: CapacityOptionProps) {
  const scale = useSharedValue(1);
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  // `scale` is a Reanimated SharedValue - assigning `.value` is its
  // documented imperative API (mirrors expo-video's `player.currentTime`
  // in VideoPlayer.tsx), not a plain render-derived object mutation, so
  // the immutability rule doesn't apply here.
  /* eslint-disable react-hooks/immutability */
  function handlePressIn() {
    if (disabled) return;
    scale.value = withSpring(0.98, { damping: 18, stiffness: 260 });
  }

  function handlePressOut() {
    scale.value = withSpring(1, { damping: 18, stiffness: 260 });
  }
  /* eslint-enable react-hooks/immutability */

  return (
    <Animated.View style={animatedStyle}>
      <Pressable
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        disabled={disabled}
        accessibilityRole="radio"
        accessibilityState={{ selected, disabled }}
        accessibilityLabel={option.label}
        style={({ pressed }) => [
          styles.option,
          selected && styles.optionSelected,
          pressed && !disabled && styles.optionPressed,
          disabled && styles.optionDisabled,
        ]}
      >
        <View style={[styles.iconBadge, selected && styles.iconBadgeSelected]}>
          <Ionicons
            name={option.icon}
            size={20}
            color={selected ? colors.cream : colors.bronzeMuted}
          />
        </View>
        <ThemedText
          variant="body"
          color={selected ? colors.navy : colors.charcoal}
          style={selected ? styles.labelSelected : undefined}
        >
          {option.label}
        </ThemedText>
        {selected ? (
          <Ionicons
            name="checkmark-circle"
            size={20}
            color={colors.bronze}
            style={styles.checkmark}
          />
        ) : null}
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.sm,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.cream,
    minHeight: 56,
  },
  optionSelected: {
    borderColor: colors.bronze,
    backgroundColor: colors.creamMuted,
    shadowColor: colors.bronze,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.16,
    shadowRadius: 8,
    elevation: 3,
  },
  optionPressed: {
    opacity: 0.85,
  },
  optionDisabled: {
    opacity: 0.6,
  },
  iconBadge: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.creamMuted,
  },
  iconBadgeSelected: {
    backgroundColor: colors.bronze,
  },
  labelSelected: {
    fontWeight: '600',
  },
  checkmark: {
    marginLeft: 'auto',
  },
});
