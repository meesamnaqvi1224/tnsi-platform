import type { PropsWithChildren } from 'react';
import { PixelRatio, Text, type TextStyle } from 'react-native';
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
  const variantStyle = typography[variant];
  // RN auto-scales fontSize for Dynamic Type but never the numeric
  // lineHeight next to it - at large accessibility text sizes the scaled
  // glyphs no longer fit the fixed line box and get visually clipped
  // top/bottom (confirmed device-side at accessibility-extra-extra-large).
  // Scaling lineHeight by the same font-scale factor keeps the box in
  // proportion to the text at every size, with no visible change at the
  // default 100% scale (factor is 1).
  const scaledLineHeight =
    'lineHeight' in variantStyle ? variantStyle.lineHeight * PixelRatio.getFontScale() : undefined;
  return (
    <Text
      style={[
        variantStyle,
        scaledLineHeight ? { lineHeight: scaledLineHeight } : null,
        { color },
        style,
      ]}
      numberOfLines={numberOfLines}
    >
      {children}
    </Text>
  );
}
