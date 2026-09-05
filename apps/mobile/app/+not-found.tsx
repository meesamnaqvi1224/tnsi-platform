import { StyleSheet } from 'react-native';
import { Link } from 'expo-router';
import { ScreenContainer, ThemedText } from '@/components';
import { colors, spacing } from '@/theme';

export default function NotFoundScreen() {
  return (
    <ScreenContainer>
      <ThemedText variant="heading">This screen doesn&apos;t exist.</ThemedText>
      <Link href="/" style={styles.link}>
        <ThemedText variant="body" color={colors.bronze}>
          Go to home
        </ThemedText>
      </Link>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  link: {
    marginTop: spacing.lg,
  },
});
