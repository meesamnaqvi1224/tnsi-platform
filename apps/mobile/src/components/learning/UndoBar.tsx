import { Pressable, StyleSheet, View } from 'react-native';
import { ThemedText } from '@/components/ThemedText';
import { colors, radius, spacing } from '@/theme';

interface UndoBarProps {
  message: string;
  pending: boolean;
  onUndo: () => void;
}

/** A brief notice after a removal, with Undo. Sits at the bottom of the screen above the tab bar. */
export function UndoBar({ message, pending, onUndo }: UndoBarProps) {
  return (
    <View style={styles.wrap} pointerEvents="box-none">
      <View style={styles.bar} accessibilityLiveRegion="polite">
        <ThemedText variant="body" color={colors.cream} style={styles.message}>
          {message}
        </ThemedText>
        <Pressable
          onPress={onUndo}
          disabled={pending}
          accessibilityRole="button"
          accessibilityLabel="Undo remove from saved"
          style={({ pressed }) => [styles.undo, pressed && styles.pressed, pending && styles.dim]}
        >
          <ThemedText variant="label" color={colors.bronzeMuted}>
            UNDO
          </ThemedText>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    left: spacing.lg,
    right: spacing.lg,
    bottom: spacing.md,
  },
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingLeft: spacing.md,
    paddingRight: spacing.xs,
    borderRadius: radius.md,
    backgroundColor: colors.navy,
  },
  message: {
    flex: 1,
    minWidth: 0,
    paddingVertical: spacing.md,
  },
  undo: {
    minHeight: 48,
    minWidth: 64,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
  },
  pressed: {
    opacity: 0.7,
  },
  dim: {
    opacity: 0.5,
  },
});
