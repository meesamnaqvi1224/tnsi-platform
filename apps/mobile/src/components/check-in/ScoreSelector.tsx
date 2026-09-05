import { Pressable, StyleSheet, View } from 'react-native';
import { ThemedText } from '@/components/ThemedText';
import { colors, radius, spacing } from '@/theme';

const SCORES = [1, 2, 3, 4, 5] as const;

interface ScoreSelectorProps {
  label: string;
  value: number | null;
  onChange: (value: number) => void;
  lowLabel: string;
  highLabel: string;
  disabled?: boolean;
}

/**
 * A 1-5 selector for mood/capacity. Selected state is shown by a filled
 * vs. outlined treatment (not colour alone), so it reads correctly without
 * colour vision and the accessibility label always states the number and
 * its endpoint meaning.
 */
export function ScoreSelector({
  label,
  value,
  onChange,
  lowLabel,
  highLabel,
  disabled = false,
}: ScoreSelectorProps) {
  return (
    <View style={styles.container}>
      <ThemedText variant="label" color={colors.charcoal} style={styles.label}>
        {label}
      </ThemedText>
      <View style={styles.row}>
        {SCORES.map((score) => {
          const selected = value === score;
          return (
            <Pressable
              key={score}
              accessibilityRole="radio"
              accessibilityState={{ selected, disabled }}
              accessibilityLabel={
                score === 1
                  ? `${lowLabel} (1 of 5)`
                  : score === 5
                    ? `${highLabel} (5 of 5)`
                    : `${score} of 5`
              }
              disabled={disabled}
              onPress={() => onChange(score)}
              style={({ pressed }) => [
                styles.pill,
                selected ? styles.pillSelected : styles.pillUnselected,
                pressed && !disabled && styles.pillPressed,
                disabled && styles.pillDisabled,
              ]}
            >
              <ThemedText
                variant="body"
                color={selected ? colors.cream : colors.charcoal}
                style={selected ? styles.scoreTextSelected : undefined}
              >
                {score}
              </ThemedText>
            </Pressable>
          );
        })}
      </View>
      <View style={styles.endpointRow}>
        <ThemedText variant="caption" color={colors.charcoal}>
          {lowLabel}
        </ThemedText>
        <ThemedText variant="caption" color={colors.charcoal}>
          {highLabel}
        </ThemedText>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: spacing.lg,
  },
  label: {
    textTransform: 'uppercase',
    marginBottom: spacing.sm,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  pill: {
    width: 48,
    height: 48,
    borderRadius: radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  pillUnselected: {
    backgroundColor: colors.white,
    borderColor: colors.border,
  },
  pillSelected: {
    backgroundColor: colors.navy,
    borderColor: colors.navy,
  },
  pillPressed: {
    opacity: 0.85,
  },
  pillDisabled: {
    opacity: 0.5,
  },
  scoreTextSelected: {
    fontWeight: '700',
  },
  endpointRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: spacing.xs,
  },
});
