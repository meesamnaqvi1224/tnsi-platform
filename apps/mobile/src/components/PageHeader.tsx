import { StyleSheet } from 'react-native';
import { Card } from './Card';
import { ThemedText } from './ThemedText';
import { colors, spacing } from '@/theme';

interface PageHeaderProps {
  eyebrow: string;
  title: string;
  description?: string;
}

/** A consistent, boxed title treatment for every sub-screen: eyebrow label
 * + heading-weight tagline, optionally a longer description, inside the
 * same accent-stripe card used for secondary entry points elsewhere - so
 * every screen's title reads as one visual family instead of a bare
 * heading that just repeats the nav bar's own title. */
export function PageHeader({ eyebrow, title, description }: PageHeaderProps) {
  return (
    <Card variant="accent" style={styles.card}>
      <ThemedText variant="label" color={colors.bronze} style={styles.eyebrow}>
        {eyebrow.toUpperCase()}
      </ThemedText>
      <ThemedText variant="heading" style={styles.title}>
        {title}
      </ThemedText>
      {description ? (
        <ThemedText variant="body" color={colors.charcoal} style={styles.description}>
          {description}
        </ThemedText>
      ) : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    marginBottom: spacing.lg,
  },
  eyebrow: {
    textTransform: 'uppercase',
    marginBottom: spacing.xs,
  },
  title: {
    marginBottom: 0,
  },
  description: {
    marginTop: spacing.sm,
  },
});
