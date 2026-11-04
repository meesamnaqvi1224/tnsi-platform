import type { PropsWithChildren } from 'react';
import { ScrollView, StyleSheet, View, type ViewStyle } from 'react-native';
import { SafeAreaView, type Edge } from 'react-native-safe-area-context';
import { colors, spacing } from '@/theme';

interface ScreenContainerProps extends PropsWithChildren {
  scroll?: boolean;
  /** Set when a navigation header already sits above this screen, so the top safe-area inset is not added a second time. */
  underHeader?: boolean;
  /** Set when the tab bar already sits below this screen, so the bottom safe-area inset is not added a second time. */
  inTabs?: boolean;
  style?: ViewStyle;
}

/**
 * Standard screen chrome: cream background, safe-area aware, consistent
 * horizontal padding. Every Phase 1 screen wraps its content in this.
 */
export function ScreenContainer({
  children,
  scroll = false,
  underHeader = false,
  inTabs = false,
  style,
}: ScreenContainerProps) {
  const edges: Edge[] = ['left', 'right'];
  if (!underHeader) edges.push('top');
  if (!inTabs) edges.push('bottom');

  return (
    <SafeAreaView style={styles.safeArea} edges={edges}>
      {scroll ? (
        <ScrollView contentContainerStyle={[styles.content, style]}>{children}</ScrollView>
      ) : (
        <View style={[styles.content, style]}>{children}</View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.cream,
  },
  content: {
    flexGrow: 1,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    // The safe-area inset alone is 0 on some layouts (e.g. non-scrolling
    // screens, or devices without a home indicator) - this extra padding
    // guarantees bottom content/buttons always have breathing room above
    // the edge, not just flush against it.
    paddingBottom: spacing.lg,
  },
});
