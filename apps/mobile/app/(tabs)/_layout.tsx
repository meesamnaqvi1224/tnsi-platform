import { Ionicons } from '@expo/vector-icons';
import { Tabs, usePathname } from 'expo-router';
import type { ColorValue } from 'react-native';
import { HomeHeaderButton } from '@/components';
import { colors, typography } from '@/theme';

/** The one route that should feel like a dedicated full-screen experience
 * rather than a tab of the app - everywhere else (including breathing's
 * own setup and completion screens) keeps the normal tab bar. Kept as an
 * exact-path check rather than a prefix match so this stays scoped to
 * exactly the immersive session screen, not the whole breathing flow. */
const TAB_BAR_HIDDEN_ROUTES = new Set(['/practices/breathing/session']);

/** Outline when inactive, filled when active - standard, restrained icon
 * treatment rather than a bespoke set (no brand icon set exists yet). */
function tabIcon(outline: keyof typeof Ionicons.glyphMap, filled: keyof typeof Ionicons.glyphMap) {
  function TabIcon({
    color,
    size,
    focused,
  }: {
    color: ColorValue;
    size: number;
    focused: boolean;
  }) {
    return <Ionicons name={focused ? filled : outline} size={size} color={color as string} />;
  }
  return TabIcon;
}

export default function TabsLayout() {
  const pathname = usePathname();
  const hideTabBar = TAB_BAR_HIDDEN_ROUTES.has(pathname);

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.navy,
        tabBarInactiveTintColor: colors.charcoal + '80',
        // `display: 'none'` rather than unmounting anything - the tab bar
        // is still the same persistent React Navigation component, just
        // not drawn while the session route is active, so nothing about
        // the tab state (active tab, navigation stack) is disturbed and
        // it reappears exactly as it was the moment the pathname changes
        // again (leaving the session, e.g. via End or natural completion).
        tabBarStyle: hideTabBar
          ? { display: 'none' }
          : { backgroundColor: colors.cream, borderTopColor: colors.border },
        tabBarLabelStyle: { fontFamily: typography.caption.fontFamily, fontSize: 11 },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{ title: 'Home', tabBarIcon: tabIcon('home-outline', 'home') }}
      />
      <Tabs.Screen
        name="practices"
        options={{ title: 'Practices', tabBarIcon: tabIcon('leaf-outline', 'leaf') }}
      />
      <Tabs.Screen
        name="my-learning"
        options={{
          title: 'My Learning',
          tabBarIcon: tabIcon('school-outline', 'school'),
          // The only tab with no nested Stack of its own (a single flat
          // screen), so unlike Practices/Resources/Profile it never had a
          // header at all under the shared `headerShown: false` above -
          // opted back in here specifically so it can carry the same
          // Home button the other three tab roots now have.
          headerShown: true,
          headerStyle: { backgroundColor: colors.cream },
          headerTintColor: colors.navy,
          headerTitleStyle: { fontFamily: typography.heading.fontFamily },
          headerShadowVisible: false,
          headerLeft: () => <HomeHeaderButton />,
        }}
      />
      <Tabs.Screen
        name="resources"
        options={{ title: 'Resources', tabBarIcon: tabIcon('book-outline', 'book') }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: tabIcon('person-circle-outline', 'person-circle'),
        }}
      />
    </Tabs>
  );
}
