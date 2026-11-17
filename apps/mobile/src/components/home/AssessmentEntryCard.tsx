import { Pressable, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { ThemedText } from '@/components/ThemedText';
import { home, homeCardStyle } from '@/components/home/homeTheme';
import { spacing } from '@/theme';

/**
 * A way into the Capacity Assessment from Home. The assessment itself lives under Profile (it is a
 * standalone screen that takes an email, not a daily action), so this is only an entry point.
 * The sentence is the Institute's existing approved description of the assessment.
 */
export function AssessmentEntryCard() {
  const router = useRouter();
  return (
    <Pressable
      onPress={() => router.push('/profile/assessment')}
      accessibilityRole="button"
      accessibilityLabel="Capacity Assessment. Understand where you are today and what might help."
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}
    >
      <View style={styles.text}>
        <ThemedText variant="label" color={home.bronze} style={styles.eyebrow}>
          Capacity Assessment
        </ThemedText>
        <ThemedText variant="heading" color={home.navy}>
          Where are you today?
        </ThemedText>
        <ThemedText variant="body" color={home.ink} style={styles.body}>
          Understand where you are today and what might help.
        </ThemedText>
      </View>
      <View style={styles.chevron}>
        <Ionicons name="chevron-forward" size={20} color={home.page} />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    ...homeCardStyle,
    backgroundColor: home.page,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.lg,
    marginBottom: spacing.xl,
  },
  pressed: { opacity: 0.85 },
  text: { flex: 1 },
  eyebrow: { textTransform: 'uppercase', letterSpacing: 1.2, marginBottom: spacing.xs },
  body: { marginTop: spacing.xs },
  chevron: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: home.bronze,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
