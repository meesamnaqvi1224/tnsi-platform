import { useState } from 'react';
import { KeyboardAvoidingView, Platform, StyleSheet, View } from 'react-native';
import { useSignUp } from '@clerk/clerk-expo';
import { Link, useRouter } from 'expo-router';
import { PrimaryButton, ScreenContainer, TextField, ThemedText } from '@/components';
import { extractClerkErrorMessage } from '@/lib/clerk-errors';
import { colors, spacing } from '@/theme';

export default function SignUpScreen() {
  const { signUp, setActive, isLoaded } = useSignUp();
  const router = useRouter();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [pendingVerification, setPendingVerification] = useState(false);
  const [code, setCode] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function handleCreateAccount() {
    if (!isLoaded || submitting) return;
    setErrorMessage(null);
    setSubmitting(true);

    try {
      await signUp.create({ emailAddress: email, password });
      await signUp.prepareEmailAddressVerification({ strategy: 'email_code' });
      setPendingVerification(true);
    } catch (err) {
      setErrorMessage(extractClerkErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  }

  async function handleVerify() {
    if (!isLoaded || submitting) return;
    setErrorMessage(null);
    setSubmitting(true);

    try {
      const attempt = await signUp.attemptEmailAddressVerification({ code });

      if (attempt.status === 'complete') {
        await setActive({ session: attempt.createdSessionId });
        router.replace('/(tabs)');
      } else {
        setErrorMessage('Verification incomplete. Please try again.');
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
          <ThemedText variant="display">Create your account</ThemedText>
          <ThemedText variant="body" color={colors.charcoal} style={styles.subtitle}>
            {pendingVerification
              ? `Enter the code we sent to ${email}.`
              : 'Begin your TNSI practice.'}
          </ThemedText>
        </View>

        {pendingVerification ? (
          <>
            <TextField
              label="Verification code"
              value={code}
              onChangeText={setCode}
              keyboardType="number-pad"
              errorMessage={errorMessage}
            />
            <PrimaryButton label="Verify" onPress={handleVerify} loading={submitting} />
          </>
        ) : (
          <>
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
              textContentType="newPassword"
              autoComplete="password-new"
              errorMessage={errorMessage}
            />
            <PrimaryButton
              label="Create Account"
              onPress={handleCreateAccount}
              loading={submitting}
            />
          </>
        )}

        <View style={styles.footer}>
          <ThemedText variant="body">Already have an account? </ThemedText>
          <Link href="/(auth)/sign-in">
            <ThemedText variant="body" color={colors.bronze}>
              Sign in
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
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: spacing.xl,
  },
});
