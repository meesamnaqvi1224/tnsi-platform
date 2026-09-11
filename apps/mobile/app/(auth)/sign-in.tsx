import { useState } from 'react';
import { Image, KeyboardAvoidingView, Platform, StyleSheet, View } from 'react-native';
import { useSignIn } from '@clerk/clerk-expo';
import { Link, useRouter } from 'expo-router';
import { PrimaryButton, ScreenContainer, TextField, ThemedText } from '@/components';
import { extractClerkErrorMessage } from '@/lib/clerk-errors';
import { colors, spacing } from '@/theme';

const logoMark = require('../../assets/images/logo-mark.png');

export default function SignInScreen() {
  const { signIn, setActive, isLoaded } = useSignIn();
  const router = useRouter();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [pendingEmailCode, setPendingEmailCode] = useState(false);
  const [code, setCode] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Completes a sign-in whose first factor (password) already succeeded but
  // which still needs a second/first-factor email code - e.g. an account
  // whose email verification was never finished at sign-up. Any other
  // required factor (authenticator app, SMS, etc.) isn't supported yet, so
  // we say so honestly rather than pretending to handle it.
  async function tryResumeWithEmailCode() {
    if (!isLoaded) return;
    const factors = [
      ...(signIn.supportedFirstFactors ?? []),
      ...(signIn.supportedSecondFactors ?? []),
    ];
    const emailFactor = factors.find(
      (f): f is typeof f & { emailAddressId: string } =>
        f.strategy === 'email_code' && 'emailAddressId' in f,
    );

    if (!emailFactor) {
      setErrorMessage(
        'This account needs a verification method this app doesn’t support yet. Please contact support.',
      );
      return;
    }

    try {
      if (signIn.status === 'needs_second_factor') {
        await signIn.prepareSecondFactor({
          strategy: 'email_code',
          emailAddressId: emailFactor.emailAddressId,
        });
      } else {
        await signIn.prepareFirstFactor({
          strategy: 'email_code',
          emailAddressId: emailFactor.emailAddressId,
        });
      }
      setPendingEmailCode(true);
    } catch (err) {
      setErrorMessage(extractClerkErrorMessage(err));
    }
  }

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
        await tryResumeWithEmailCode();
      }
    } catch (err) {
      setErrorMessage(extractClerkErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  }

  async function handleVerifyCode() {
    if (!isLoaded || submitting) return;
    setErrorMessage(null);
    setSubmitting(true);

    try {
      const attempt =
        signIn.status === 'needs_second_factor'
          ? await signIn.attemptSecondFactor({ strategy: 'email_code', code })
          : await signIn.attemptFirstFactor({ strategy: 'email_code', code });

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
          <Image source={logoMark} style={styles.logo} resizeMode="contain" />
          <ThemedText variant="display">Welcome back</ThemedText>
          <ThemedText variant="body" color={colors.charcoal} style={styles.subtitle}>
            {pendingEmailCode
              ? `Enter the code we sent to ${email}.`
              : 'Sign in to continue your practice.'}
          </ThemedText>
        </View>

        {pendingEmailCode ? (
          <>
            <TextField
              label="Verification code"
              value={code}
              onChangeText={setCode}
              keyboardType="number-pad"
              errorMessage={errorMessage}
            />
            <PrimaryButton label="Verify" onPress={handleVerifyCode} loading={submitting} />
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
          </>
        )}
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
    alignItems: 'center',
  },
  logo: {
    width: 72,
    height: 61,
    marginBottom: spacing.lg,
  },
  subtitle: {
    marginTop: spacing.sm,
    textAlign: 'center',
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
