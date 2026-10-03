import { StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { Card } from '@/components/Card';
import { PrimaryButton } from '@/components/PrimaryButton';
import { ThemedText } from '@/components/ThemedText';
import { colors, spacing } from '@/theme';

/**
 * Shown in place of a player when the server reports a practice as
 * `locked` (the paid Regulation Suite™ library, for a member without paid
 * access). The server has already withheld the media — this is only the
 * prompt. It points at the existing Membership & Access screen, which hands
 * membership management off to the website exactly as it already does; no
 * purchase flow lives in the app.
 */
export function MembershipLockedNotice() {
  const router = useRouter();

  return (
    <Card style={styles.card}>
      <ThemedText variant="body" color={colors.charcoal} style={styles.body}>
        This practice is part of the full Regulation Suite™ library, available with a membership.
      </ThemedText>
      <PrimaryButton
        label="View Membership"
        variant="secondary"
        onPress={() => router.push('/profile/membership')}
      />
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    marginTop: spacing.md,
  },
  body: {
    marginBottom: spacing.md,
  },
});
