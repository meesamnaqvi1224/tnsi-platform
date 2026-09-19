import { StyleSheet } from 'react-native';
import { PrimaryButton } from '@/components/PrimaryButton';
import { spacing } from '@/theme';

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
  button: {
    marginTop: spacing.lg,
  },
});
