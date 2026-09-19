import { StyleSheet } from 'react-native';
import { Card } from '@/components/Card';
import { ThemedText } from '@/components/ThemedText';
import { colors, spacing } from '@/theme';

/**
 * Shown when a practice's `contentType` says it should have audio or video
 * (audio/video/meditation/breathwork/movement) but `mediaUrl` is unset -
 * today, every practice in Sanity but one is placeholder content with no
 * recording attached yet (see packages/cms/src/schema/documents/practice.ts).
 * An honest "not ready" notice, not a silently empty space that could read
 * as broken - and never a fake player standing in for real content.
 */
export function MediaUnavailableNotice() {
  return (
    <Card style={styles.card}>
      <ThemedText variant="body" color={colors.charcoal}>
        This practice isn&apos;t available yet. Check back soon.
      </ThemedText>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    marginTop: spacing.md,
  },
});
