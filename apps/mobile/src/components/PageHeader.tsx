import { StyleSheet, View } from 'react-native';
import { Card } from './Card';
import { ThemedText } from './ThemedText';
import { colors, spacing } from '@/theme';

interface PageHeaderProps {
  eyebrow: string;
  title: string;
  description?: string;
  /** 'plain' is a quiet lead-in line for a tab's own root screen, where the nav bar already names the screen: no card, no eyebrow. */
  variant?: 'card' | 'plain';
}

/** A consistent, boxed title treatment for every sub-screen: eyebrow label
 * + heading-weight tagline, optionally a longer description, inside the
 * same accent-stripe card used for secondary entry points elsewhere - so
 * every screen's title reads as one visual family instead of a bare
 * heading that just repeats the nav bar's own title. */
export function PageHeader({ eyebrow, title, description, variant = 'card' }: PageHeaderProps) {
  if (variant === 'plain') {
    return (
      <View style={styles.plain}>
        <ThemedText variant="body" color={colors.charcoal}>
          {title}
        </ThemedText>
        {description ? (
          <ThemedText variant="body" color={colors.charcoal} style={styles.description}>
            {description}
          </ThemedText>
        ) : null}
      </View>
    );
  }

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
  plain: {
    marginBottom: spacing.lg,
  },
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
