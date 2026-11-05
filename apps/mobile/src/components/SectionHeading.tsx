import { StyleSheet } from 'react-native';
import { ThemedText } from './ThemedText';
import { home } from './home/homeTheme';
import { fontFamily, spacing } from '@/theme';

/** A section heading in the redesigned screens: serif navy, the same size as Home's section titles. */
export function SectionHeading({ children }: { children: string }) {
  return (
    <ThemedText
      variant="display"
      color={home.navy}
      style={styles.heading}
      accessibilityRole="header"
    >
      {children}
    </ThemedText>
  );
}

const styles = StyleSheet.create({
  heading: {
    fontFamily: fontFamily.serif,
    fontSize: 24,
    lineHeight: 30,
    marginBottom: spacing.md,
  },
});
