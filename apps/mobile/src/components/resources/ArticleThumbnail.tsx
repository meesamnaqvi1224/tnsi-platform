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
import type { ArticleImage } from '@/api/types';

interface ArticleThumbnailProps {
  coverImage: ArticleImage | null;
  /** Shown on the branded fallback surface when there's no cover image - the article's category, or "Resource" when there isn't one either. Never invented stock art. */
  fallbackLabel: string;
  height?: number;
  style?: StyleProp<ViewStyle>;
}

/**
 * Real cover image when one exists; otherwise (or if it fails to load) a
 * plain branded surface - never a broken-image icon. A dedicated
 * component rather than reusing `PracticeThumbnail` directly: articles
 * have no `contentType` to label the fallback with, only an optional
 * category, so the two components' props genuinely differ even though
 * the visual philosophy (real image -> calm fallback) is the same.
 */
export function ArticleThumbnail({
  coverImage,
  fallbackLabel,
  height = 160,
  style,
}: ArticleThumbnailProps) {
  const [failed, setFailed] = useState(false);
  const showImage = coverImage && !failed;

  if (showImage) {
    return (
      <Image
        source={{ uri: coverImage.url }}
        style={[styles.image, { height }, style] as StyleProp<ImageStyle>}
        onError={() => setFailed(true)}
        accessibilityIgnoresInvertColors
        accessible={Boolean(coverImage.alt)}
        accessibilityLabel={coverImage.alt || undefined}
      />
    );
  }

  return (
    <View style={[styles.surface, { height }, style]} accessible={false}>
      <ThemedText variant="label" color={colors.bronzeMuted} style={styles.surfaceLabel}>
        {fallbackLabel}
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  image: {
    width: '100%',
    borderRadius: radius.lg,
    backgroundColor: colors.creamMuted,
  },
  surface: {
    width: '100%',
    borderRadius: radius.lg,
    backgroundColor: colors.navy,
    alignItems: 'center',
    justifyContent: 'center',
  },
  surfaceLabel: {
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
});
