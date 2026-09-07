import { Stack } from 'expo-router';
import { colors, typography } from '@/theme';

/** Resources tab's own stack: library at the root, article detail pushed on top. */
export default function ResourcesLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: colors.cream },
        headerTintColor: colors.navy,
        headerTitleStyle: { fontFamily: typography.heading.fontFamily },
        headerShadowVisible: false,
      }}
    >
      <Stack.Screen name="index" options={{ title: 'Resources' }} />
      <Stack.Screen name="[slug]" options={{ title: '' }} />
    </Stack>
  );
}
