import { Stack } from 'expo-router';
import { colors, typography } from '@/theme';

/**
 * Resources tab's own stack: library at the root. The detail route
 * ([slug]) is added in Phase 4.3 - not registered here yet since it
 * doesn't exist.
 */
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
    </Stack>
  );
}
