import { Pressable, StyleSheet, TextInput, View } from 'react-native';
import { ThemedText } from '@/components/ThemedText';
import { colors, radius, spacing, typography } from '@/theme';

interface PracticeSearchFieldProps {
  value: string;
  onChangeText: (text: string) => void;
}

/**
 * Search over what the Practices screen has already loaded (see src/lib/practice-library.ts).
 * Nothing is sent anywhere, so it filters as the member types. The Clear control is a real
 * 48 dp target and only appears once there is something to clear.
 */
export function PracticeSearchField({ value, onChangeText }: PracticeSearchFieldProps) {
  return (
    <View style={styles.container}>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder="Search practices"
        placeholderTextColor={colors.charcoal + '80'}
        accessibilityLabel="Search practices"
        returnKeyType="search"
        autoCapitalize="none"
        autoCorrect={false}
        clearButtonMode="never"
        style={styles.input}
      />
      {value.length > 0 ? (
        <Pressable
          onPress={() => onChangeText('')}
          accessibilityRole="button"
          accessibilityLabel="Clear search"
          style={({ pressed }) => [styles.clear, pressed && styles.pressed]}
        >
          <ThemedText variant="label" color={colors.charcoal}>
            Clear
          </ThemedText>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    justifyContent: 'center',
    marginBottom: spacing.lg,
  },
  input: {
    minHeight: 52,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingLeft: spacing.md,
    // Room for the Clear control, so typed text never runs under it.
    paddingRight: 80,
    paddingVertical: spacing.sm,
    fontSize: typography.body.fontSize,
    color: colors.charcoal,
    backgroundColor: colors.white,
  },
  clear: {
    position: 'absolute',
    right: spacing.xs,
    minWidth: 48,
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.sm,
  },
  pressed: {
    opacity: 0.6,
  },
});
