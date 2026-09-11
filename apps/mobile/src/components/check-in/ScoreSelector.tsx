import { StyleSheet, View } from 'react-native';
import Slider from '@react-native-community/slider';
import { ThemedText } from '@/components/ThemedText';
import { colors, spacing } from '@/theme';

const TICKS = [1, 2, 3, 4, 5] as const;

interface ScoreSelectorProps {
  label: string;
  value: number | null;
  onChange: (value: number) => void;
  lowLabel: string;
  highLabel: string;
  /** A word for each of the 5 points (1 to 5), e.g. ['Very low', 'Low',
   * 'Okay', 'Good', 'Very good'] - shown in the readout above the slider
   * and announced by screen readers as the slider moves. */
  valueLabels: readonly [string, string, string, string, string];
  disabled?: boolean;
}

/**
 * A 1-5 slider for mood/capacity - a real native slider (not a custom
 * gesture reimplementation), so it inherits correct platform accessibility
 * behaviour (VoiceOver/TalkBack already know how to operate a native
 * slider). Snaps to whole numbers via `step={1}`. The current value is
 * always named in words, not just a number, both in the readout above and
 * via `accessibilityIncrements`, so nobody has to guess what "4" means.
 */
export function ScoreSelector({
  label,
  value,
  onChange,
  lowLabel,
  highLabel,
  valueLabels,
  disabled = false,
}: ScoreSelectorProps) {
  const touched = value !== null;
  const current = value ?? 3;

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <ThemedText variant="label" color={colors.charcoal} style={styles.label}>
          {label}
        </ThemedText>
        <ThemedText variant="label" color={touched ? colors.bronze : colors.charcoal}>
          {touched ? `${current} · ${valueLabels[current - 1]}` : 'Slide to select'}
        </ThemedText>
      </View>

      <Slider
        value={current}
        onValueChange={onChange}
        minimumValue={1}
        maximumValue={5}
        step={1}
        disabled={disabled}
        minimumTrackTintColor={touched ? colors.bronze : colors.border}
        maximumTrackTintColor={colors.border}
        thumbTintColor={touched ? colors.bronze : colors.charcoal}
        style={styles.slider}
        accessibilityLabel={label}
        accessibilityUnits="rating"
        accessibilityIncrements={valueLabels as unknown as string[]}
      />

      <View style={styles.tickRow}>
        {TICKS.map((tick) => (
          <ThemedText
            key={tick}
            variant="label"
            color={touched && tick === current ? colors.bronze : colors.border}
            style={styles.tick}
          >
            {tick}
          </ThemedText>
        ))}
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
    marginBottom: spacing.sm,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    marginBottom: spacing.xs,
  },
  label: {
    textTransform: 'uppercase',
  },
  slider: {
    width: '100%',
    height: 32,
  },
  tickRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: -spacing.xs,
    paddingHorizontal: 2,
  },
  tick: {
    fontWeight: '500',
  },
  endpointRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: spacing.xs,
  },
});
