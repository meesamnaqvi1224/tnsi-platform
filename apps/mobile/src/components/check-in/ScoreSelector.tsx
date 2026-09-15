import { StyleSheet, View } from 'react-native';
import Slider from '@react-native-community/slider';
import { ThemedText } from '@/components/ThemedText';
import { colors, spacing } from '@/theme';

const TICKS = [1, 2, 3, 4, 5] as const;

interface ScoreSelectorProps {
  label: string;
  value: number | null;
  onChange: (value: number) => void;
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
 * always named in words, not just a number, in the readout above and via
 * `accessibilityIncrements`, so nobody has to guess what "4" means - no
 * separate 1-5 tick row or "Very low"/"Very good" captions underneath as
 * well, which read as dense form-control chrome the editorial direction
 * explicitly avoids; the two bare endpoint numerals are the only other
 * numbers left on screen.
 */
export function ScoreSelector({
  label,
  value,
  onChange,
  valueLabels,
  disabled = false,
}: ScoreSelectorProps) {
  const touched = value !== null;
  const current = value ?? 3;

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <ThemedText variant="body" color={colors.charcoal} style={styles.label}>
          {label}
        </ThemedText>
        <ThemedText variant="body" color={touched ? colors.bronze : colors.charcoal}>
          {touched ? `${current}/5 · ${valueLabels[current - 1]}` : 'Slide to select'}
        </ThemedText>
      </View>

      <View style={styles.sliderRow}>
        <ThemedText variant="caption" color={colors.charcoal} style={styles.endpoint}>
          {TICKS[0]}
        </ThemedText>
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
        <ThemedText variant="caption" color={colors.charcoal} style={styles.endpoint}>
          {TICKS[TICKS.length - 1]}
        </ThemedText>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: spacing.md,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    marginBottom: spacing.xs,
  },
  label: {},
  sliderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  slider: {
    flex: 1,
    height: 32,
  },
  endpoint: {
    width: 12,
    textAlign: 'center',
  },
});
