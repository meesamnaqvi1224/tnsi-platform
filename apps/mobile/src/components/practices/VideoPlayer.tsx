import { useEvent, useEventListener } from 'expo';
import { useVideoPlayer, VideoView } from 'expo-video';
import { useEffect, useRef } from 'react';
import { StyleSheet, View } from 'react-native';
import { ThemedText } from '@/components/ThemedText';
import { PrimaryButton } from '@/components/PrimaryButton';
import { colors, radius } from '@/theme';

interface VideoPlayerProps {
  uri: string;
  /** Where to resume from, in seconds - the member's last saved position for this practice, if any. Ignored if it doesn't fall meaningfully within the video. */
  initialPositionSeconds?: number;
  /** Called once, the first time playback reaches the end. */
  onComplete: () => void;
  /** Called on unmount (leaving the screen) with the last known position - lets the practice be resumed later. Never called after `onComplete` has already fired. */
  onProgress?: (positionSeconds: number, durationSeconds: number) => void;
  /** Called when the member taps "Try Again" after a load error. */
  onRetry?: () => void;
}

/**
 * A native video player using expo-video's own native controls (play,
 * pause, seek, fullscreen) rather than a custom transport bar - the
 * platform chrome is already accessible and battle-tested, and building a
 * second one would be over-engineering for Phase 3.
 */
export function VideoPlayer({
  uri,
  initialPositionSeconds = 0,
  onComplete,
  onProgress,
  onRetry,
}: VideoPlayerProps) {
  const player = useVideoPlayer(uri, (p) => {
    p.loop = false;
  });
  const { status } = useEvent(player, 'statusChange', { status: player.status });
  const hasCompletedRef = useRef(false);
  const hasResumedRef = useRef(false);

  useEventListener(player, 'playToEnd', () => {
    if (!hasCompletedRef.current) {
      hasCompletedRef.current = true;
      onComplete();
    }
  });

  // Resume from the last saved position, once, the first time the player
  // reports it's ready to play (seeking before then has no effect).
  // Skipped for a position that's effectively the start or already past
  // the video's own duration (e.g. stale data from a shorter re-upload).
  // `player` is expo-video's imperative native handle - assigning
  // `currentTime` is its documented seek API (see expo-video's
  // VideoPlayer.types.d.ts), not a plain object mutation, so the
  // immutability rule (written for ordinary render-derived values) doesn't
  // apply to it.
  /* eslint-disable react-hooks/immutability */
  useEffect(() => {
    if (status !== 'readyToPlay' || hasResumedRef.current) return;
    hasResumedRef.current = true;
    if (initialPositionSeconds > 1 && initialPositionSeconds < player.duration - 1) {
      player.currentTime = initialPositionSeconds;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- resume-once-on-ready is intentional; re-running on every status change would fight the member's own seeking.
  }, [status]);
  /* eslint-enable react-hooks/immutability */

  // Tracks the latest known position/duration in a plain ref, kept current
  // via expo-video's own `timeUpdate` event while the player is alive -
  // never read from `player` directly at unmount. This matters because
  // `useVideoPlayer`'s own internal cleanup effect (registered earlier,
  // inside this hook) releases the native player before this component's
  // later-declared effects clean up (React runs effect cleanups in the
  // same order they were declared, confirmed against the installed
  // react-native reconciler). Reading `player.currentTime`/`player.duration`
  // directly from the final cleanup would therefore touch an
  // already-released native object, which expo-modules-core's
  // `SharedObject` documents as throwing. Reading `player.duration` inside
  // the `timeUpdate` handler itself is safe - the event only fires while
  // the player is genuinely alive.
  const latestPositionRef = useRef({ currentTime: 0, duration: 0 });
  useEventListener(player, 'timeUpdate', (payload) => {
    latestPositionRef.current = { currentTime: payload.currentTime, duration: player.duration };
  });

  // Reports the last known position on unmount (navigating away) so the
  // practice can resume from here later - not on every pause, so this
  // never fires more often than once per visit. Reads only from the ref
  // above, never from the native player handle.
  const onProgressRef = useRef(onProgress);
  useEffect(() => {
    onProgressRef.current = onProgress;
  });
  useEffect(() => {
    return () => {
      const { currentTime, duration } = latestPositionRef.current;
      if (duration > 0 && !hasCompletedRef.current) {
        onProgressRef.current?.(currentTime, duration);
      }
    };
  }, []);

  if (status === 'error') {
    return (
      <View style={styles.errorContainer}>
        <ThemedText variant="body" color={colors.error} style={styles.errorText}>
          This video couldn&apos;t be loaded. Please check your connection and try again.
        </ThemedText>
        {onRetry ? <PrimaryButton label="Try Again" variant="secondary" onPress={onRetry} /> : null}
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
  errorText: {
    marginBottom: 16,
    textAlign: 'center',
  },
});
