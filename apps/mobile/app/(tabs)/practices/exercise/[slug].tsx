import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { isExerciseSlug } from '@tnsi/core';
import { ErrorNotice, PrimaryButton, ThemedText } from '@/components';
import { ExerciseRunner } from '@/components/exercise/ExerciseRunner';
import { useExercise } from '@/hooks/useExercise';
import { colors, spacing } from '@/theme';

/**
 * A guided exercise: the reusable exercise screen, drawn from the exercise's CMS content. It draws
 * its own chrome (the stack header is off for this route).
 */
export default function ExerciseScreen() {
  const { slug: rawSlug } = useLocalSearchParams<{ slug: string }>();
  const slug = isExerciseSlug(rawSlug) ? rawSlug : '';
  const router = useRouter();
  const { state, reload } = useExercise(slug);

  if (!slug) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.centered}>
          <ThemedText variant="heading">This exercise isn&apos;t available.</ThemedText>
          <PrimaryButton
            label="Back to Practices"
            onPress={() => router.dismissTo('/practices')}
            style={styles.button}
          />
        </View>
      </SafeAreaView>
    );
  }

  if (state.status === 'loading') {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.centered}>
          <ActivityIndicator color={colors.bronze} />
        </View>
      </SafeAreaView>
    );
  }

  if (state.status === 'error') {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.centered}>
          <ErrorNotice message={state.message} onRetry={reload} />
          <PrimaryButton
            label="Back to Practices"
            variant="secondary"
            onPress={() => router.dismissTo('/practices')}
            style={styles.button}
          />
        </View>
      </SafeAreaView>
    );
  }

  return <ExerciseRunner exercise={state.data.exercise} />;
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.cream },
  centered: { flex: 1, justifyContent: 'center', padding: spacing.lg },
  button: { marginTop: spacing.lg },
});
