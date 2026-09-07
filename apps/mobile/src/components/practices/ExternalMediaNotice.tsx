import { Linking, StyleSheet } from 'react-native';
import { Card } from '@/components/Card';
import { ThemedText } from '@/components/ThemedText';
import { PrimaryButton } from '@/components/PrimaryButton';
import { colors, spacing } from '@/theme';

interface ExternalMediaNoticeProps {
  mediaUrl: string;
}

/**
 * Shown when a practice's media is hosted somewhere (currently Google
 * Drive) that only serves an HTML viewer page, not a direct media stream -
 * expo-video/expo-audio genuinely cannot play it, and an in-app iframe/
 * WebView wouldn't be real native playback. Opening it in the device's own
 * browser is an honest, non-broken fallback rather than a fake native
 * player. See PHASE3_REPORT.md for the underlying media-hosting
 * limitation this reflects.
 */
export function ExternalMediaNotice({ mediaUrl }: ExternalMediaNoticeProps) {
  return (
    <Card style={styles.card}>
      <ThemedText variant="body" color={colors.charcoal} style={styles.text}>
        This practice currently opens in your browser rather than playing directly in the app.
      </ThemedText>
      <PrimaryButton
        label="Open in Browser"
        variant="secondary"
        onPress={() => Linking.openURL(mediaUrl)}
      />
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    marginTop: spacing.md,
  },
  text: {
    marginBottom: spacing.md,
  },
});
