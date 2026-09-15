import type { PropsWithChildren } from 'react';
import { Platform, StyleSheet, View, type ViewStyle } from 'react-native';
import { colors, radius, spacing } from '@/theme';

interface CardProps extends PropsWithChildren {
  style?: ViewStyle;
  /** 'inverted' is a deliberately rare accent (navy fill, no border) for
   * the one or two most distinctive features on a screen - not a general
   * dark-card option. 'accent' is a quieter alternative: a bronze edge
   * stripe on an otherwise-white card, for secondary entry points that
   * still deserve some visual distinction. 'warm' trades the white fill
   * and shadow for a flat warm-sand surface with no shadow at all - for
   * the one or two sections (Daily Check-In) that should read as part of
   * the page rather than a raised panel sitting on top of it. Default
   * 'default' is the standard white card - a soft shadow and a larger
   * radius rather than a hard border, so a stack of cards reads as gently
   * layered rather than boxed/blocky. */
  variant?: 'default' | 'inverted' | 'accent' | 'warm';
}

export function Card({ children, style, variant = 'default' }: CardProps) {
  return (
    <View
      style={[
        styles.card,
        variant === 'inverted' && styles.cardInverted,
        variant === 'accent' && styles.cardAccent,
        variant === 'warm' && styles.cardWarm,
        style,
      ]}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.white,
    borderRadius: radius.xl,
    padding: spacing.lg,
    ...Platform.select({
      ios: {
        shadowColor: colors.navyDark,
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.08,
        shadowRadius: 16,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  cardInverted: {
    backgroundColor: colors.navy,
  },
  cardAccent: {
    borderLeftWidth: 3,
    borderLeftColor: colors.bronze,
    borderTopLeftRadius: 0,
    borderBottomLeftRadius: 0,
  },
  cardWarm: {
    backgroundColor: colors.creamMuted,
    ...Platform.select({
      ios: { shadowOpacity: 0, shadowRadius: 0 },
      android: { elevation: 0 },
    }),
  },
});
