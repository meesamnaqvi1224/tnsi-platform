import { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet } from 'react-native';
import { useSSO } from '@clerk/clerk-expo';
import { useRouter } from 'expo-router';
import * as AuthSession from 'expo-auth-session';
import * as WebBrowser from 'expo-web-browser';
import { Ionicons } from '@expo/vector-icons';
import { ThemedText } from './ThemedText';
import { extractClerkErrorMessage } from '@/lib/clerk-errors';
import { colors, radius, spacing } from '@/theme';

// Completes an in-flight auth session if the app was reopened by the OAuth redirect.
WebBrowser.maybeCompleteAuthSession();

/**
 * Where Google sends the member back to the app. It is passed explicitly so it
 * is the same value in every build, and it must also be listed under
 * "Allowlist for mobile SSO redirect" in the Clerk Dashboard (Native
 * applications). It matches the `tnsi` scheme in app.config.ts.
 */
const SSO_REDIRECT_URL = AuthSession.makeRedirectUri({ scheme: 'tnsi', path: 'sso-callback' });

interface GoogleSignInButtonProps {
  onError: (message: string) => void;
}

/**
 * Same Google account works whether it was created via this button or via
 * the web dashboard's own Google option - Clerk resolves both to the one
 * user record for that email, since it's the same Clerk instance either
 * way. Handles both sign-in (existing account) and sign-up (new account)
 * with the one flow, matching how Clerk's own hosted Google button behaves.
 */
export function GoogleSignInButton({ onError }: GoogleSignInButtonProps) {
  const { startSSOFlow } = useSSO();
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);

  async function handlePress() {
    if (submitting) return;
    setSubmitting(true);

    try {
      const { createdSessionId, setActive } = await startSSOFlow({
        strategy: 'oauth_google',
        redirectUrl: SSO_REDIRECT_URL,
      });

      if (createdSessionId && setActive) {
        await setActive({ session: createdSessionId });
        router.replace('/(tabs)');
      }
      // No createdSessionId with no error means the user closed the Google
      // sheet before completing it - nothing to report, just stop loading.
    } catch (err) {
      onError(extractClerkErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Continue with Google"
      disabled={submitting}
      onPress={handlePress}
      style={({ pressed }) => [styles.button, pressed && styles.pressed]}
    >
      {submitting ? (
        <ActivityIndicator color={colors.navy} />
      ) : (
        <>
          <Ionicons name="logo-google" size={18} color={colors.navy} style={styles.icon} />
          <ThemedText variant="label" color={colors.navy}>
            Continue with Google
          </ThemedText>
        </>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 52,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.cream,
    paddingHorizontal: spacing.lg,
  },
  pressed: {
    opacity: 0.85,
  },
  icon: {
    marginRight: spacing.sm,
  },
});
