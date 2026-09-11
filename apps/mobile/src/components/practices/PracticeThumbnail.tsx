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
import { capitalize } from '@/lib/format';
import { colors, radius } from '@/theme';
import type { PracticeContentType } from '@/api/types';

interface PracticeThumbnailProps {
  thumbnailUrl: string | null;
  contentType: PracticeContentType;
  height?: number;
  /** Only layout-affecting properties (margin, etc.) are expected here - shared across the <Image>/<View> fallback. */
  style?: StyleProp<ViewStyle>;
}

/**
 * Real thumbnail image when one exists; otherwise (or if it fails to
 * load) a plain branded surface naming the content type - never a broken-
 * image icon, never invented stock art.
 */
export function PracticeThumbnail({
  thumbnailUrl,
  contentType,
  height = 160,
  style,
}: PracticeThumbnailProps) {
  const [failed, setFailed] = useState(false);
  const showImage = thumbnailUrl && !failed;

  if (showImage) {
    return (
      <Image
        source={{ uri: thumbnailUrl }}
        style={[styles.image, { height }, style] as StyleProp<ImageStyle>}
        onError={() => setFailed(true)}
        accessibilityIgnoresInvertColors
      />
    );
  }

  return (
    <View style={[styles.surface, { height }, style]}>
      <ThemedText variant="label" color={colors.bronzeMuted} style={styles.surfaceLabel}>
        {capitalize(contentType)}
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
