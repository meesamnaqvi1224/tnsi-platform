import { useState } from 'react';
import { KeyboardAvoidingView, Platform, StyleSheet, View } from 'react-native';
import { useSignIn } from '@clerk/clerk-expo';
import { Link, useRouter } from 'expo-router';
import { PrimaryButton, ScreenContainer, TextField, ThemedText } from '@/components';
import { extractClerkErrorMessage } from '@/lib/clerk-errors';
import { colors, spacing } from '@/theme';

export default function ForgotPasswordScreen() {
  const { signIn, setActive, isLoaded } = useSignIn();
  const router = useRouter();

  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [codeSent, setCodeSent] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  async function handleRequestCode() {
    if (!isLoaded || submitting) return;
    setErrorMessage(null);
    setSubmitting(true);

    try {
      await signIn.create({
        strategy: 'reset_password_email_code',
        identifier: email,
      });
      setCodeSent(true);
      setSuccessMessage(`We sent a reset code to ${email}.`);
    } catch (err) {
      setErrorMessage(extractClerkErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  }

  async function handleResetPassword() {
    if (!isLoaded || submitting) return;
    setErrorMessage(null);
    setSubmitting(true);

    try {
      const attempt = await signIn.attemptFirstFactor({
        strategy: 'reset_password_email_code',
        code,
        password: newPassword,
      });

      if (attempt.status === 'complete') {
        await setActive({ session: attempt.createdSessionId });
        router.replace('/(tabs)');
      } else {
        setErrorMessage('Reset incomplete. Please try again.');
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
          <ThemedText variant="display">Reset password</ThemedText>
          {successMessage ? (
            <ThemedText variant="body" color={colors.charcoal} style={styles.subtitle}>
              {successMessage}
            </ThemedText>
          ) : (
            <ThemedText variant="body" color={colors.charcoal} style={styles.subtitle}>
              We&apos;ll email you a reset code.
            </ThemedText>
          )}
        </View>

        {!codeSent ? (
          <>
            <TextField
              label="Email"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              textContentType="emailAddress"
              autoComplete="email"
              errorMessage={errorMessage}
            />
            <PrimaryButton label="Send Code" onPress={handleRequestCode} loading={submitting} />
          </>
        ) : (
          <>
            <TextField
              label="Reset code"
              value={code}
              onChangeText={setCode}
              keyboardType="number-pad"
            />
            <TextField
              label="New password"
              value={newPassword}
              onChangeText={setNewPassword}
              secureTextEntry
              textContentType="newPassword"
              errorMessage={errorMessage}
            />
            <PrimaryButton
              label="Reset Password"
              onPress={handleResetPassword}
              loading={submitting}
            />
          </>
        )}

        <View style={styles.footer}>
          <Link href="/(auth)/sign-in">
            <ThemedText variant="body" color={colors.bronze}>
              Back to sign in
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
