import { StyleSheet, View } from 'react-native';
import { ThemedText } from './ThemedText';
import { home } from './home/homeTheme';
import { fontFamily, spacing } from '@/theme';

interface PageTitleProps {
  title: string;
  /** One short supporting sentence. Smaller and lighter than the title. */
  subtitle?: string;
}

/**
 * The title block at the top of a redesigned screen: the page name large in serif navy, a short
 * bronze rule, then one quiet supporting line. The page name is always the biggest text in the header.
 */
export function PageTitle({ title, subtitle }: PageTitleProps) {
  return (
    <View style={styles.wrap}>
      <ThemedText
        variant="display"
        color={home.navy}
        style={styles.title}
        accessibilityRole="header"
      >
        {title}
      </ThemedText>
      <View style={styles.rule} />
      {subtitle ? (
        <ThemedText variant="body" color={home.ink} style={styles.subtitle}>
          {subtitle}
        </ThemedText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginBottom: spacing.lg,
  },
  title: {
    fontFamily: fontFamily.serif,
    fontSize: 34,
    lineHeight: 40,
  },
  rule: {
    width: 36,
    height: 2,
    backgroundColor: home.bronze,
    marginTop: spacing.sm,
    marginBottom: spacing.sm + 2,
  },
  subtitle: {
    fontSize: 14,
    lineHeight: 20,
  },
});
