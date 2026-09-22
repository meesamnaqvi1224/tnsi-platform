import { Stack } from 'expo-router';
import { colors, typography } from '@/theme';

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
      <Stack.Screen name="index" options={{ title: 'Practices' }} />
      <Stack.Screen name="[id]" options={{ title: '' }} />
      <Stack.Screen name="powerdrops/index" options={{ title: 'PowerDrops' }} />
      <Stack.Screen name="powerdrops/[slug]" options={{ title: '' }} />
      <Stack.Screen name="somatic-cards/index" options={{ title: 'Somatic Cards' }} />
      <Stack.Screen name="somatic-cards/[seriesSlug]" options={{ title: '' }} />
      <Stack.Screen name="somatic-cards/card/[cardSlug]" options={{ title: '' }} />
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
