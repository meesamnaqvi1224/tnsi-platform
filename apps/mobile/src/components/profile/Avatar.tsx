import { useState } from 'react';
import { Image, StyleSheet, View } from 'react-native';
import { ThemedText } from '@/components/ThemedText';
import { colors } from '@/theme';

interface AvatarProps {
  imageUrl: string | null;
  /** Has a real, user-set photo - Clerk's `imageUrl` is always some URL (a generated default when the user hasn't set one), so this flag (Clerk's own `hasImage`) is what actually distinguishes "real photo" from "nothing set". */
  hasImage: boolean;
  /** Shown when there's no real photo, or it fails to load. */
  initials: string;
  size?: number;
}

/** Real profile photo when the user has set one; otherwise (or on load failure) a calm initials surface - same real-image/branded-fallback philosophy as PracticeThumbnail/ArticleThumbnail. */
export function Avatar({ imageUrl, hasImage, initials, size = 72 }: AvatarProps) {
  const [failed, setFailed] = useState(false);
  const showImage = hasImage && imageUrl && !failed;
  const dimension = { width: size, height: size, borderRadius: size / 2 };

  if (showImage) {
    return (
      <Image
        source={{ uri: imageUrl }}
        style={[styles.image, dimension]}
        onError={() => setFailed(true)}
        accessible={false}
      />
    );
  }

  return (
    <View style={[styles.surface, dimension]} accessible={false}>
      <ThemedText variant="heading" color={colors.cream}>
        {initials}
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  image: {
    backgroundColor: colors.creamMuted,
  },
  surface: {
    backgroundColor: colors.navy,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
