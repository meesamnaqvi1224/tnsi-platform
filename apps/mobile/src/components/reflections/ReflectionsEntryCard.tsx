import { StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { PrimaryButton } from '@/components/PrimaryButton';
import { ThemedText } from '@/components/ThemedText';
import { home, homeCardStyle } from '@/components/home/homeTheme';
import { HOME_INVITATION } from '@/lib/reflections-copy';
import { spacing } from '@/theme';

/**
 * Home's quiet invitation into My Reflections. It does not depend on today's check-in or on any
 * other data, and it shows nothing about what the member has written (no counts, no streaks).
 */
export function ReflectionsEntryCard() {
  const router = useRouter();
  return (
    <View style={styles.card}>
      <ThemedText variant="label" color={home.bronze} style={styles.eyebrow}>
        {HOME_INVITATION.eyebrow}
      </ThemedText>
      <ThemedText variant="body" color={home.ink} style={styles.body}>
        {HOME_INVITATION.body}
      </ThemedText>
      <PrimaryButton
        label={HOME_INVITATION.button}
        variant="secondary"
        onPress={() => router.push({ pathname: '/profile/reflection', params: { from: 'home' } })}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    ...homeCardStyle,
    backgroundColor: home.page,
    padding: spacing.lg,
    marginBottom: spacing.xl,
  },
  eyebrow: { textTransform: 'uppercase', letterSpacing: 1.2, marginBottom: spacing.sm },
  body: { marginBottom: spacing.md },
});
