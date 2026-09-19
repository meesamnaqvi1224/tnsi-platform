import { useState } from 'react';
import {
  Image,
  StyleSheet,
  View,
  type ImageSourcePropType,
  type ImageStyle,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
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
 * Generic (not practice-specific) stock photo per content type, shown only
 * when a practice has no real `thumbnailUrl` of its own. Explicitly approved
 * as a stand-in for visual polish - same reasoning as Home's hero photo in
 * WelcomeHeader.tsx - swap for real photography per practice as Caroline
 * supplies it. content-video.jpg is CC BY 2.0 "Woman working on laptop while
 * sitting on couch" by nenad53 (flickr.com/photos/202780880@N02/54582935863)
 * and needs attribution wherever image credits are shown; the rest are
 * Unsplash License (no attribution required).
 */
const CONTENT_TYPE_STOCK_IMAGES: Record<PracticeContentType, ImageSourcePropType> = {
  meditation: require('../../../assets/images/content-meditation.jpg'),
  movement: require('../../../assets/images/content-movement.jpg'),
  journal: require('../../../assets/images/content-journal.jpg'),
  breathwork: require('../../../assets/images/content-breathwork.jpg'),
  audio: require('../../../assets/images/content-audio.jpg'),
  video: require('../../../assets/images/content-video.jpg'),
};

/**
 * Real per-practice thumbnail when one exists; otherwise (or if it fails to
 * load) a generic stock photo for the content type, labeled so it's never
 * mistaken for that specific practice's own photography.
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
      <Image
        source={CONTENT_TYPE_STOCK_IMAGES[contentType]}
        style={styles.stockImage as StyleProp<ImageStyle>}
        accessibilityIgnoresInvertColors
        accessible={false}
      />
      <LinearGradient colors={['transparent', 'rgba(11,21,38,0.75)']} style={styles.gradient}>
        <ThemedText variant="label" color={colors.cream} style={styles.surfaceLabel}>
          {capitalize(contentType)}
        </ThemedText>
      </LinearGradient>
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
    overflow: 'hidden',
  },
  stockImage: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  gradient: {
    flex: 1,
    justifyContent: 'flex-end',
    padding: 12,
  },
  surfaceLabel: {
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
});
