import { StyleSheet, View } from 'react-native';
import { colors, spacing } from '@/theme';
import { ScreenContainer } from './ScreenContainer';
import { ThemedText } from './ThemedText';

interface PlaceholderScreenProps {
  title: string;
  message: string;
}

/** Shared shell for the Phase 1 tab placeholders (Practices, My Learning, Resources). */
export function PlaceholderScreen({ title, message }: PlaceholderScreenProps) {
  return (
    <ScreenContainer>
      <ThemedText variant="display">{title}</ThemedText>
      <View style={styles.body}>
        <ThemedText variant="body" color={colors.charcoal}>
          {message}
        </ThemedText>
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  body: {
    marginTop: spacing.lg,
  },
});
