import { Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing } from '@/theme';

/**
 * A fixed "Home" header button (a house icon, not a back arrow: it is not the previous screen) for a tab's own root screen. Tab
 * roots don't get a back button from React Navigation by default (there's
 * nothing in that tab's own stack history to return to - switching tabs
 * is the normal way to move between sections), but a persistent,
 * explicit way back to Home is still worth having on every section for
 * anyone not relying on the tab bar itself. Same navigation-icon pattern
 * as the Practices tab's `BackToPracticesButton`.
 */
/** `inset` adds the left margin a navigation bar normally supplies itself, for a header (the tab bar's own) that does not. */
export function HomeHeaderButton({ inset = false }: { inset?: boolean }) {
  const router = useRouter();
  return (
    <Pressable
      onPress={() => router.push('/')}
      hitSlop={12}
      style={inset ? { marginLeft: spacing.md } : undefined}
      accessibilityRole="button"
      accessibilityLabel="Home"
    >
      <Ionicons name="home-outline" size={24} color={colors.navy} />
    </Pressable>
  );
}
