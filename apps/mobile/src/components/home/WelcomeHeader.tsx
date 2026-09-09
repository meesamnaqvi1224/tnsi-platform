import { StyleSheet } from 'react-native';
import { ThemedText } from '@/components/ThemedText';
import { colors, spacing } from '@/theme';

interface WelcomeHeaderProps {
  firstName?: string | null;
}

/** "Tuesday, 9 September" - the real current date, for orientation only (never a fabricated read on how the member is doing). */
function todayLabel(): string {
  return new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' });
}

/** Restrained greeting - first name and today's date only, no streaks/stats/badges. */
export function WelcomeHeader({ firstName }: WelcomeHeaderProps) {
  return (
    <>
      <ThemedText variant="label" color={colors.bronze} style={styles.date}>
        {todayLabel()}
      </ThemedText>
      <ThemedText variant="display" style={styles.heading}>
        {firstName ? `Welcome back, ${firstName}.` : 'Welcome back.'}
      </ThemedText>
    </>
  );
}

const styles = StyleSheet.create({
  date: {
    textTransform: 'uppercase',
    marginBottom: spacing.sm,
  },
  heading: {
    marginBottom: spacing.xl,
  },
});
