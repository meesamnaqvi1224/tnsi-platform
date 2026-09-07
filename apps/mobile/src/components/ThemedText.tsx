import type { PropsWithChildren } from 'react';
import { Text, type TextStyle } from 'react-native';
import { colors, typography } from '@/theme';

type Variant = keyof typeof typography;

interface ThemedTextProps extends PropsWithChildren {
  variant?: Variant;
  color?: string;
  style?: TextStyle;
  numberOfLines?: number;
}

export function ThemedText({
  children,
  variant = 'body',
  color = colors.charcoal,
  style,
  numberOfLines,
}: ThemedTextProps) {
  return (
    <Text style={[typography[variant], { color }, style]} numberOfLines={numberOfLines}>
      {children}
    </Text>
  );
}
