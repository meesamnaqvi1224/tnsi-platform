import { Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '@/theme';

/**
 * A fixed "back to Home" header button for a tab's own root screen. Tab
 * roots don't get a back button from React Navigation by default (there's
 * nothing in that tab's own stack history to return to - switching tabs
 * is the normal way to move between sections), but a persistent,
 * explicit way back to Home is still worth having on every section for
 * anyone not relying on the tab bar itself. Same navigation-icon pattern
 * as the Practices tab's `BackToPracticesButton`.
 */
export function HomeHeaderButton() {
  const router = useRouter();
  return (
    <Pressable
      onPress={() => router.push('/')}
      hitSlop={12}
      accessibilityRole="button"
      accessibilityLabel="Back to Home"
    >
      <Ionicons name="chevron-back" size={26} color={colors.navy} />
    </Pressable>
  );
}
