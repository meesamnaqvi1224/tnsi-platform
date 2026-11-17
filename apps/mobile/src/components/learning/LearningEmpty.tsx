import { StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { PrimaryButton } from '@/components/PrimaryButton';
import { ThemedText } from '@/components/ThemedText';
import { home } from '@/components/home/homeTheme';
import { spacing } from '@/theme';

interface LearningEmptyProps {
  title: string;
  description: string;
}

/** A compact empty state: what is not here yet, why, and one way to the practice library. */
export function LearningEmpty({ title, description }: LearningEmptyProps) {
  const router = useRouter();
  return (
    <View style={styles.wrap}>
      <ThemedText variant="heading" color={home.navy} style={styles.title}>
        {title}
      </ThemedText>
      <ThemedText variant="body" color={home.ink} style={styles.description}>
        {description}
      </ThemedText>
      <PrimaryButton
        label="Explore Practices"
        variant="secondary"
        onPress={() => router.push('/practices')}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    paddingVertical: spacing.md,
  },
  title: {
    marginBottom: spacing.xs,
  },
  description: {
    marginBottom: spacing.lg,
  },
});
