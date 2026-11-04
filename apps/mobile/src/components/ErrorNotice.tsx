import { StyleSheet } from 'react-native';
import { colors, spacing } from '@/theme';
import { Card } from './Card';
import { ThemedText } from './ThemedText';
import { PrimaryButton } from './PrimaryButton';

interface ErrorNoticeProps {
  message: string;
  onRetry?: () => void;
  /** When the session has ended, retrying cannot help: offer signing in again instead. */
  onSignInAgain?: () => void;
}

/** Calm, human error display with an optional retry action - never shows raw backend text. */
export function ErrorNotice({ message, onRetry, onSignInAgain }: ErrorNoticeProps) {
  return (
    <Card>
      <ThemedText variant="body" color={colors.error}>
        {message}
      </ThemedText>
      {onSignInAgain ? (
        <PrimaryButton
          label="Sign In Again"
          variant="secondary"
          onPress={onSignInAgain}
          style={styles.retryButton}
        />
      ) : onRetry ? (
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
