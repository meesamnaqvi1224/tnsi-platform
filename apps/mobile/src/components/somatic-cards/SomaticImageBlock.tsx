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
import type { SomaticImage as SomaticImageType } from '@/api/types';

interface SomaticImageBlockProps {
  image: SomaticImageType | null;
  /** Fallback label shown when there's no image (or it fails to load) - never a broken-image icon, never invented stock art. Mirrors PowerDropThumbnail. */
  fallbackLabel: string;
  /** Width/height ratio - 9/16 for card artwork, 16/9 for a landscape hero. Lets the container's width drive its height so the real image is never awkwardly cropped. */
  aspectRatio: number;
  style?: StyleProp<ViewStyle>;
}

/**
 * Shared image-with-fallback treatment for all four Somatic Card asset
 * types (cardArtwork, heroImage, and each supportingImages/
 * demonstrationSequence item) - real accessible alt text from the API is
 * always attached, never invented when the API has none. Reuses plain
 * React Native `Image` (the existing convention throughout this app -
 * see PowerDropThumbnail.tsx - no new image library needed).
 */
export function SomaticImageBlock({
  image,
  fallbackLabel,
  aspectRatio,
  style,
}: SomaticImageBlockProps) {
  const [failed, setFailed] = useState(false);
  const showImage = image?.url && !failed;

  if (showImage) {
    return (
      <Image
        source={{ uri: image.url }}
        style={[styles.image, { aspectRatio }, style] as StyleProp<ImageStyle>}
        resizeMode="cover"
        onError={() => setFailed(true)}
        accessible
        accessibilityLabel={image.alt || fallbackLabel}
        accessibilityIgnoresInvertColors
      />
    );
  }

  return (
    <View
      style={[styles.surface, { aspectRatio }, style]}
      accessible
      accessibilityLabel={fallbackLabel}
    >
      <ThemedText
        variant="label"
        color={colors.bronzeMuted}
        style={styles.surfaceLabel}
        numberOfLines={2}
      >
        {fallbackLabel}
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
