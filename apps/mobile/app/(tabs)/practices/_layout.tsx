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
    </Stack>
  );
}
