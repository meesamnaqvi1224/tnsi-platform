import { Stack } from 'expo-router';
import { HomeHeaderButton } from '@/components';
import { colors, typography } from '@/theme';

/** Human Expansion Theory tab: the overview at the root, one condition page pushed on top. */
export default function TheoryLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: '#FFFFFF' },
        headerTintColor: colors.navy,
        headerTitleStyle: { fontFamily: typography.heading.fontFamily },
        headerShadowVisible: false,
      }}
    >
      <Stack.Screen
        name="index"
        options={{
          title: 'Human Expansion Theory',
          headerTitle: '',
          headerLeft: () => <HomeHeaderButton />,
        }}
      />
      <Stack.Screen name="[condition]" options={{ title: '', headerTitle: '' }} />
    </Stack>
  );
}
