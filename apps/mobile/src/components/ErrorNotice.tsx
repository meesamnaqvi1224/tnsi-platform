import { StyleSheet } from 'react-native';
import { colors, spacing } from '@/theme';
import { Card } from './Card';
import { ThemedText } from './ThemedText';
import { PrimaryButton } from './PrimaryButton';

interface ErrorNoticeProps {
  message: string;
  onRetry?: () => void;
}

/** Calm, human error display with an optional retry action - never shows raw backend text. */
export function ErrorNotice({ message, onRetry }: ErrorNoticeProps) {
  return (
    <Card>
      <ThemedText variant="body" color={colors.error}>
        {message}
      </ThemedText>
      {onRetry ? (
        <PrimaryButton
          label="Try Again"
          variant="secondary"
          onPress={onRetry}
          style={styles.retryButton}
        />
      ) : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  retryButton: {
    marginTop: spacing.md,
  },
});
