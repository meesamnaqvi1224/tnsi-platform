import { StyleSheet, View } from 'react-native';
import { ThemedText } from './ThemedText';
import { colors, spacing } from '@/theme';

interface SectionLabelProps {
  children: string;
  style?: { marginTop?: number };
}

/** A section heading treatment: uppercase label over a thin divider rule,
 * so sections read as visually distinct blocks rather than bare text
 * floating in the page. Used for "Today", "Explore", etc. */
export function SectionLabel({ children, style }: SectionLabelProps) {
  return (
    <View style={[styles.container, style]}>
      <ThemedText variant="label" color={colors.charcoal} style={styles.label}>
        {children}
      </ThemedText>
      <View style={styles.rule} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: spacing.lg,
  },
  label: {
    textTransform: 'uppercase',
    marginBottom: spacing.sm,
  },
  rule: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.border,
  },
});
