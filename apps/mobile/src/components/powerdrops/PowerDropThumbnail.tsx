import { useState } from 'react';
import {
  Image,
  StyleSheet,
  View,
  type ImageStyle,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { ThemedText } from '@/components/ThemedText';
import { colors, radius } from '@/theme';
import type { PowerDropImage } from '@/api/types';

interface PowerDropThumbnailProps {
  title: string;
  cardImage: PowerDropImage | null;
  height?: number;
  /** Only layout-affecting properties (margin, etc.) are expected here - shared across the <Image>/<View> fallback. */
  style?: StyleProp<ViewStyle>;
}

/**
 * The real card artwork when one exists; otherwise (or if it fails to
 * load) a plain branded surface naming the PowerDrop - never a broken-
 * image icon, never invented stock art. Mirrors PracticeThumbnail.
 */
export function PowerDropThumbnail({
  title,
  cardImage,
  height = 160,
  style,
}: PowerDropThumbnailProps) {
  const [failed, setFailed] = useState(false);
  const showImage = cardImage?.url && !failed;

  if (showImage) {
    return (
      <Image
        source={{ uri: cardImage.url }}
        style={[styles.image, { height }, style] as StyleProp<ImageStyle>}
        onError={() => setFailed(true)}
        accessible
        accessibilityLabel={cardImage.alt || `${title} card`}
        accessibilityIgnoresInvertColors
      />
    );
  }

  return (
    <View
      style={[styles.surface, { height }, style]}
      accessible
      accessibilityLabel={`${title} card`}
    >
      <ThemedText
        variant="label"
        color={colors.bronzeMuted}
        style={styles.surfaceLabel}
        numberOfLines={2}
      >
        {title}
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  image: {
    width: '100%',
    borderRadius: radius.md,
    backgroundColor: colors.creamMuted,
  },
  surface: {
    width: '100%',
    borderRadius: radius.md,
    backgroundColor: colors.navy,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
  },
  surfaceLabel: {
    textTransform: 'uppercase',
    letterSpacing: 1,
    textAlign: 'center',
  },
});
