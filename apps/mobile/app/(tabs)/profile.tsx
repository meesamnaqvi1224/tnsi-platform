import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useAuth, useUser } from '@clerk/clerk-expo';
import { Card, PrimaryButton, ScreenContainer, ThemedText } from '@/components';
import { colors, spacing } from '@/theme';

export default function ProfileScreen() {
  const { user } = useUser();
  const { signOut } = useAuth();
  const [signingOut, setSigningOut] = useState(false);

  async function handleSignOut() {
    if (signingOut) return;
    setSigningOut(true);
    try {
      // Clears the Clerk session; RootLayout's AuthGate then redirects to
      // (auth) automatically once `isSignedIn` flips to false.
      await signOut();
    } finally {
      setSigningOut(false);
    }
  }

  return (
    <ScreenContainer>
      <ThemedText variant="display">Profile</ThemedText>

      <Card style={styles.card}>
        <View style={styles.field}>
          <ThemedText variant="caption" color={colors.charcoal}>
            Email
          </ThemedText>
          <ThemedText variant="body">{user?.primaryEmailAddress?.emailAddress ?? '—'}</ThemedText>
        </View>
        <View style={styles.field}>
          <ThemedText variant="caption" color={colors.charcoal}>
            Name
          </ThemedText>
          <ThemedText variant="body">{user?.fullName ?? '—'}</ThemedText>
        </View>
      </Card>

      <PrimaryButton
        label="Sign Out"
        variant="secondary"
        onPress={handleSignOut}
        loading={signingOut}
      />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  card: {
    marginTop: spacing.xl,
    marginBottom: spacing.lg,
  },
  field: {
    marginBottom: spacing.sm,
  },
});
