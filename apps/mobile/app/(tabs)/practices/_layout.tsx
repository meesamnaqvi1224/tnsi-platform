import { Pressable } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { HomeHeaderButton } from '@/components';
import { colors, typography } from '@/theme';

/**
 * A fixed "back to Practices" header button, for screens that can be
 * reached via a cross-tab jump (Home's PowerDrops tile pushes
 * `/practices/powerdrops` directly, which re-roots the Practices tab's
 * own stack onto just that screen - there's nothing in that stack's own
 * history to go back to, so Expo Router's default back button never
 * appears there). Unlike a generic `router.back()`, this always lands
 * somewhere real regardless of how the screen was reached.
 */
function BackToPracticesButton() {
  const router = useRouter();
  return (
    <Pressable
      onPress={() => router.push('/practices')}
      hitSlop={12}
      accessibilityRole="button"
      accessibilityLabel="Back to Practices"
    >
      <Ionicons name="chevron-back" size={26} color={colors.navy} />
    </Pressable>
  );
}

/** Practices tab's own stack: library at the root, detail pushed on top. */
export default function PracticesLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: colors.cream },
        headerTintColor: colors.navy,
        headerTitleStyle: { fontFamily: typography.heading.fontFamily },
        headerShadowVisible: false,
      }}
    >
      <Stack.Screen
        name="index"
        options={{ title: 'Practices', headerLeft: () => <HomeHeaderButton /> }}
      />
      <Stack.Screen name="[id]" options={{ title: '' }} />
      <Stack.Screen name="history" options={{ title: 'Practice History' }} />
      <Stack.Screen name="journey" options={{ title: 'My Journey' }} />
      <Stack.Screen name="saved" options={{ title: 'Saved Practices' }} />
      <Stack.Screen
        name="powerdrops/index"
        options={{ title: 'PowerDrops', headerLeft: () => <BackToPracticesButton /> }}
      />
      <Stack.Screen name="powerdrops/[slug]" options={{ title: '' }} />
      {/* The breathing flow builds its own header/close controls to match
          its immersive, non-standard chrome (see each screen) - the stack
          header stays off for all three. The session screen also disables
          the swipe-back gesture: leaving mid-session must always go
          through its own confirmation, the same reason Android's hardware
          back button is intercepted inside that screen. */}
      <Stack.Screen name="breathing/index" options={{ headerShown: false }} />
      <Stack.Screen
        name="breathing/session"
        options={{ headerShown: false, gestureEnabled: false }}
      />
      <Stack.Screen name="breathing/complete" options={{ headerShown: false }} />
    </Stack>
  );
}
