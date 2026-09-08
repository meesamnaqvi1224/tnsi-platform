import { Stack } from 'expo-router';
import { colors, typography } from '@/theme';

/** Profile tab's own stack: account at the root, Capacity Assessment pushed on top. */
export default function ProfileLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: colors.cream },
        headerTintColor: colors.navy,
        headerTitleStyle: { fontFamily: typography.heading.fontFamily },
        headerShadowVisible: false,
      }}
    >
      <Stack.Screen name="index" options={{ title: 'Profile' }} />
      {/*
       * `headerBackButtonMenuEnabled: false` disables iOS's long-press-back-
       * button menu, which can pop multiple screens at once outside the
       * `beforeRemove` listener's knowledge - exactly the caveat React
       * Navigation's own warning names for this exact "confirm before
       * leaving" pattern on native-stack. This screen has an in-progress-
       * answers confirmation (see assessment.tsx's `beforeRemove` listener)
       * that depends on every removal going through that single-tap path.
       */}
      <Stack.Screen name="assessment" options={{ title: '', headerBackButtonMenuEnabled: false }} />
    </Stack>
  );
}
