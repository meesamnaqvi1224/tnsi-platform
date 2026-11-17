import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ClerkProvider, useAuth } from '@clerk/clerk-expo';
import { Slot, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import { StartupAnimation } from '@/components/StartupAnimation';
import { env } from '@/lib/env';
import { tokenCache } from '@/lib/token-cache';
import { colors } from '@/theme';

// Keep the native splash up until the start-up animation has taken over (see StartupAnimation).
SplashScreen.preventAutoHideAsync().catch(() => undefined);

/**
 * Redirects between the (auth) and (tabs) route groups based on Clerk's
 * session state. Renders nothing but a loading indicator until Clerk has
 * finished initializing, so there's no flash of the wrong route group.
 */
function AuthGate() {
  const { isLoaded, isSignedIn } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (!isLoaded) return;

    const inAuthGroup = segments[0] === '(auth)';

    if (isSignedIn && inAuthGroup) {
      router.replace('/(tabs)');
    } else if (!isSignedIn && !inAuthGroup) {
      router.replace('/(auth)/sign-in');
    }
  }, [isLoaded, isSignedIn, segments, router]);

  if (!isLoaded) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator color={colors.navy} />
      </View>
    );
  }

  return <Slot />;
}

export default function RootLayout() {
  const [introDone, setIntroDone] = useState(false);
  const finishIntro = useCallback(() => setIntroDone(true), []);

  return (
    <ClerkProvider publishableKey={env.clerkPublishableKey} tokenCache={tokenCache}>
      <SafeAreaProvider>
        {/* Light status-bar icons over the dark start-up screen, dark over the app. */}
        <StatusBar style={introDone ? 'dark' : 'light'} />
        <AuthGate />
        {introDone ? null : <StartupAnimation onDone={finishIntro} />}
      </SafeAreaProvider>
    </ClerkProvider>
  );
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.cream,
  },
});
