import { StyleSheet, TextInput, View, type TextInputProps } from 'react-native';
import { colors, radius, spacing, typography } from '@/theme';
import { ThemedText } from './ThemedText';

interface TextFieldProps extends TextInputProps {
  label: string;
  errorMessage?: string | null;
}

export function TextField({ label, errorMessage, style, ...inputProps }: TextFieldProps) {
  return (
    <View style={styles.container}>
      <ThemedText variant="label" color={colors.charcoal} style={styles.label}>
        {label}
      </ThemedText>
      <TextInput
        placeholderTextColor={colors.charcoal + '80'}
        style={[styles.input, style]}
        autoCapitalize="none"
        autoCorrect={false}
        {...inputProps}
      />
      {errorMessage ? (
        <ThemedText variant="caption" color={colors.error} style={styles.error}>
          {errorMessage}
        </ThemedText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: spacing.md,
  },
  label: {
    marginBottom: spacing.xs,
    textTransform: 'uppercase',
  },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 4,
    fontSize: typography.body.fontSize,
    color: colors.charcoal,
    backgroundColor: colors.white,
  },
  error: {
    marginTop: spacing.xs,
  },
});
