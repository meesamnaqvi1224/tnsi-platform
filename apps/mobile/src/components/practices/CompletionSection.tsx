import { StyleSheet } from 'react-native';
import { Card } from '@/components/Card';
import { ThemedText } from '@/components/ThemedText';
import { PrimaryButton } from '@/components/PrimaryButton';
import { spacing } from '@/theme';

/** Calm completion confirmation - shown once, regardless of how completion happened. */
export function CompletionBanner() {
  return (
    <Card style={styles.card}>
      <ThemedText variant="heading">Practice complete.</ThemedText>
    </Card>
  );
}

interface MarkCompleteButtonProps {
  submitting: boolean;
  onPress: () => void;
}

/**
 * The explicit completion action for practices with no automatic
 * playback-end detection (journal/no-media, or media that only opens
 * externally - see ExternalMediaNotice). Never shown once already
 * completed - POST .../complete is idempotent-safe, but there's no reason
 * to invite a repeat submission.
 */
export function MarkCompleteButton({ submitting, onPress }: MarkCompleteButtonProps) {
  return (
    <PrimaryButton
      label="Mark as Complete"
      onPress={onPress}
      loading={submitting}
      style={styles.button}
    />
  );
}

const styles = StyleSheet.create({
  card: {
    marginTop: spacing.lg,
  },
  button: {
    marginTop: spacing.lg,
  },
});
