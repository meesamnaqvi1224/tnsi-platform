import { ActivityIndicator, Pressable, StyleSheet } from 'react-native';
import { ThemedText } from '@/components/ThemedText';
import { colors, radius, spacing } from '@/theme';

interface RemoveSavedButtonProps {
  title: string;
  pending: boolean;
  /** Another removal is in flight: this one waits. */
  disabled: boolean;
  onPress: () => void;
}

/**
 * The "Saved" pill in the Saved view. It looks like the Save toggle elsewhere (a navy "Saved" pill)
 * but does not flip on its own: it asks to remove, shows a spinner while the server answers, and the
 * row goes only once that succeeds. Drawn 32 dp tall with 8 dp of touch slop each side (48 dp).
 */
export function RemoveSavedButton({ title, pending, disabled, onPress }: RemoveSavedButtonProps) {
  return (
    <Pressable
      onPress={onPress}
      disabled={pending || disabled}
      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      accessibilityRole="button"
      accessibilityLabel={`Remove ${title.trim()} from saved`}
      accessibilityState={{ busy: pending, disabled: pending || disabled }}
      style={({ pressed }) => [
        styles.pill,
        pressed && !pending && styles.pressed,
        (pending || disabled) && styles.dim,
      ]}
    >
      {pending ? (
        <ActivityIndicator size="small" color={colors.cream} />
      ) : (
        <ThemedText variant="label" color={colors.cream}>
          Saved
        </ThemedText>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  pill: {
    minHeight: 32,
    minWidth: 72,
    paddingHorizontal: spacing.md,
    borderRadius: radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.navy,
    borderWidth: 1,
    borderColor: colors.navy,
  },
  pressed: {
    opacity: 0.8,
  },
  dim: {
    opacity: 0.7,
  },
});
