import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { ErrorNotice } from '@/components/ErrorNotice';
import { useReturnPath } from '@/hooks/useReturnPath';
import { colors, spacing } from '@/theme';
import { ReturnPathPractice } from './ReturnPathPractice';

/**
 * The Return Path on the practice detail screen: loads its copy and the levels
 * this member may start, then hands over to the practice. Only rendered for an
 * `interactive` practice with the Return Path's key that the member can open.
 */
export function ReturnPathSection({ onComplete }: { onComplete: () => Promise<unknown> }) {
  const { state, reload } = useReturnPath();

  if (state.status === 'loading') {
    return (
      <View style={styles.loading} accessibilityLabel="Loading the practice">
        <ActivityIndicator color={colors.bronze} />
      </View>
    );
  }
  if (state.status === 'error') {
    return <ErrorNotice message={state.message} onRetry={reload} />;
  }
  return (
    <ReturnPathPractice
      content={state.data.content}
      allowedLevels={state.data.allowedLevels}
      onComplete={onComplete}
    />
  );
}

const styles = StyleSheet.create({
  loading: {
    paddingVertical: spacing.xl,
    alignItems: 'center',
  },
});
