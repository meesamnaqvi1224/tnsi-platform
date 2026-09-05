import { useState } from 'react';
import { KeyboardAvoidingView, Platform, StyleSheet, View } from 'react-native';
import { useSignIn } from '@clerk/clerk-expo';
import { Link, useRouter } from 'expo-router';
import { PrimaryButton, ScreenContainer, TextField, ThemedText } from '@/components';
import { extractClerkErrorMessage } from '@/lib/clerk-errors';
import { colors, spacing } from '@/theme';

export default function SignInScreen() {
  const { signIn, setActive, isLoaded } = useSignIn();
  const router = useRouter();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function handleSignIn() {
    if (!isLoaded || submitting) return;
    setErrorMessage(null);
    setSubmitting(true);

    try {
      const attempt = await signIn.create({ identifier: email, password });

      if (attempt.status === 'complete') {
        await setActive({ session: attempt.createdSessionId });
        router.replace('/(tabs)');
      } else {
        // Additional steps (e.g. MFA) aren't handled in Phase 1.
        setErrorMessage('Additional verification is required but not yet supported.');
      }
    } catch (err) {
      setErrorMessage(extractClerkErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <ScreenContainer scroll>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.flex}
      >
        <View style={styles.header}>
          <ThemedText variant="display">Welcome back</ThemedText>
          <ThemedText variant="body" color={colors.charcoal} style={styles.subtitle}>
            Sign in to continue your practice.
          </ThemedText>
        </View>

        <TextField
          label="Email"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          textContentType="emailAddress"
          autoComplete="email"
        />
        <TextField
          label="Password"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          textContentType="password"
          autoComplete="password"
          errorMessage={errorMessage}
        />

        <PrimaryButton label="Sign In" onPress={handleSignIn} loading={submitting} />

        <Link href="/(auth)/forgot-password" style={styles.link}>
          <ThemedText variant="label" color={colors.bronze}>
            Forgot password?
          </ThemedText>
        </Link>

        <View style={styles.footer}>
          <ThemedText variant="body">Don&apos;t have an account? </ThemedText>
          <Link href="/(auth)/sign-up">
            <ThemedText variant="body" color={colors.bronze}>
              Sign up
            </ThemedText>
          </Link>
        </View>
      </KeyboardAvoidingView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  header: {
    marginBottom: spacing.xl,
  },
  subtitle: {
    marginTop: spacing.sm,
  },
  link: {
    marginTop: spacing.md,
    alignSelf: 'center',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: spacing.xl,
  },
});
