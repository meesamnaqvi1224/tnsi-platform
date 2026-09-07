import { useEvent, useEventListener } from 'expo';
import { useVideoPlayer, VideoView } from 'expo-video';
import { useRef } from 'react';
import { StyleSheet, View } from 'react-native';
import { ThemedText } from '@/components/ThemedText';
import { colors, radius } from '@/theme';

interface VideoPlayerProps {
  uri: string;
  /** Called once, the first time playback reaches the end. */
  onComplete: () => void;
}

/**
 * A native video player using expo-video's own native controls (play,
 * pause, seek, fullscreen) rather than a custom transport bar - the
 * platform chrome is already accessible and battle-tested, and building a
 * second one would be over-engineering for Phase 3.
 */
export function VideoPlayer({ uri, onComplete }: VideoPlayerProps) {
  const player = useVideoPlayer(uri, (p) => {
    p.loop = false;
  });
  const { status } = useEvent(player, 'statusChange', { status: player.status });
  const hasCompletedRef = useRef(false);

  useEventListener(player, 'playToEnd', () => {
    if (!hasCompletedRef.current) {
      hasCompletedRef.current = true;
      onComplete();
    }
  });

  if (status === 'error') {
    return (
      <View style={styles.errorContainer}>
        <ThemedText variant="body" color={colors.error}>
          This video couldn&apos;t be loaded. Please try again.
        </ThemedText>
      </View>
    );
  }

  return (
    <View style={styles.wrapper}>
      <VideoView
        player={player}
        style={styles.video}
        nativeControls
        contentFit="contain"
        accessibilityLabel="Practice video"
      />
      {status === 'loading' ? (
        <View style={[StyleSheet.absoluteFill, styles.loadingOverlay]} pointerEvents="none">
          <ThemedText variant="label" color={colors.cream}>
            Loading...
          </ThemedText>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    width: '100%',
    aspectRatio: 16 / 9,
    borderRadius: radius.md,
    overflow: 'hidden',
    backgroundColor: colors.navyDark,
  },
  video: {
    width: '100%',
    height: '100%',
  },
  loadingOverlay: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorContainer: {
    width: '100%',
    aspectRatio: 16 / 9,
    borderRadius: radius.md,
    backgroundColor: colors.creamMuted,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
  },
});
