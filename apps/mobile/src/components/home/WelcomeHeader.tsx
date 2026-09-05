import { StyleSheet } from 'react-native';
import { ThemedText } from '@/components/ThemedText';
import { spacing } from '@/theme';

interface WelcomeHeaderProps {
  firstName?: string | null;
}

/** Restrained greeting - first name only, no streaks/stats/badges. */
export function WelcomeHeader({ firstName }: WelcomeHeaderProps) {
  return (
    <ThemedText variant="display" style={styles.heading}>
      {firstName ? `Welcome back, ${firstName}.` : 'Welcome back.'}
    </ThemedText>
  );
}

const styles = StyleSheet.create({
  heading: {
    marginBottom: spacing.xl,
  },
});
