import { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useAudioPlayer, useAudioPlayerStatus } from 'expo-audio';
import { ThemedText } from '@/components/ThemedText';
import { PrimaryButton } from '@/components/PrimaryButton';
import { colors, radius, spacing } from '@/theme';

interface AudioPlayerProps {
  uri: string;
  /** Where to resume from, in seconds - the member's last saved position for this practice, if any. Ignored if it doesn't fall meaningfully within the track. */
  initialPositionSeconds?: number;
  /** Called once, the first time playback reaches the end. */
  onComplete: () => void;
  /** Called on unmount (leaving the screen) with the last known position - lets the practice be resumed later. Never called after `onComplete` has already fired. */
  onProgress?: (positionSeconds: number, durationSeconds: number) => void;
  /** Called when the member taps "Try Again" after a load error. */
  onRetry?: () => void;
}

/** "125" -> "2:05". */
function formatTime(seconds: number): string {
  const total = Math.max(0, Math.floor(seconds));
  const mins = Math.floor(total / 60);
  const secs = total % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

/**
 * A restrained native audio player: play/pause, a tap-to-seek track,
 * elapsed/total time, and completion detection via `didJustFinish`. No
 * custom slider dependency - the track is a plain Pressable measuring its
 * own width, matching the calm/restrained direction rather than a
 * Spotify-style transport bar.
 */
export function AudioPlayer({
  uri,
  initialPositionSeconds = 0,
  onComplete,
  onProgress,
  onRetry,
}: AudioPlayerProps) {
  const player = useAudioPlayer(uri);
  const status = useAudioPlayerStatus(player);
  const [trackWidth, setTrackWidth] = useState(0);
  const hasCompletedRef = useRef(false);
  const hasResumedRef = useRef(false);

  useEffect(() => {
    if (status.didJustFinish && !hasCompletedRef.current) {
      hasCompletedRef.current = true;
      onComplete();
    }
  }, [status.didJustFinish, onComplete]);

  // Resume from the last saved position, once, the first time the player
  // reports it's actually loaded (seeking before then has no effect).
  // Skipped for a position that's effectively the start or already past
  // the track's own duration (e.g. stale data from a shorter re-upload).
  useEffect(() => {
    if (!status.isLoaded || hasResumedRef.current) return;
    hasResumedRef.current = true;
    if (initialPositionSeconds > 1 && initialPositionSeconds < status.duration - 1) {
      player.seekTo(initialPositionSeconds);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- resume-once-on-load is intentional; re-running on every status tick would fight the member's own seeking.
  }, [status.isLoaded]);

  // Reports the last known position on unmount (navigating away) so the
  // practice can resume from here later - not on every pause, so this
  // never fires more often than once per visit. Read via refs rather than
  // effect deps so the cleanup always sees the latest values regardless of
  // how often the parent's `onProgress` identity changes.
  const latestStatusRef = useRef({ currentTime: 0, duration: 0 });
  useEffect(() => {
    latestStatusRef.current = { currentTime: status.currentTime, duration: status.duration };
  });
  const onProgressRef = useRef(onProgress);
  useEffect(() => {
    onProgressRef.current = onProgress;
  });
  useEffect(() => {
    return () => {
      const { currentTime, duration } = latestStatusRef.current;
      if (duration > 0 && !hasCompletedRef.current) {
        onProgressRef.current?.(currentTime, duration);
      }
    };
  }, []);

  const progress = status.duration > 0 ? status.currentTime / status.duration : 0;

  function handleSeek(locationX: number) {
    if (trackWidth <= 0 || status.duration <= 0) return;
    const ratio = Math.min(1, Math.max(0, locationX / trackWidth));
    // Unlike expo-video's VideoPlayer (where `currentTime` is a settable
    // property), expo-audio's AudioPlayer.currentTime is get-only at
    // runtime - confirmed live ("Cannot assign to property 'currentTime'
    // which has only a getter") during the Phase 3 media readiness audit.
    // seekTo() is the actual seek API here.
    player.seekTo(ratio * status.duration);
  }

  if (status.error) {
    return (
      <View style={styles.container}>
        <ThemedText variant="body" color={colors.error} style={styles.errorText}>
          This audio couldn&apos;t be loaded. Please check your connection and try again.
        </ThemedText>
        {onRetry ? <PrimaryButton label="Try Again" variant="secondary" onPress={onRetry} /> : null}
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.controlsRow}>
        <Pressable
          onPress={() => (status.playing ? player.pause() : player.play())}
          accessibilityRole="button"
          accessibilityLabel={status.playing ? 'Pause' : 'Play'}
          disabled={!status.isLoaded}
          style={({ pressed }) => [styles.playButton, pressed && styles.pressed]}
        >
          <ThemedText variant="label" color={colors.cream}>
            {!status.isLoaded ? '···' : status.playing ? 'Pause' : 'Play'}
          </ThemedText>
        </Pressable>

        {status.isLoaded ? (
          <View style={styles.timeGroup}>
            <Pressable
              onLayout={(e) => setTrackWidth(e.nativeEvent.layout.width)}
              onPress={(e) => handleSeek(e.nativeEvent.locationX)}
              accessibilityRole="adjustable"
              accessibilityLabel="Seek"
              accessibilityValue={{
                min: 0,
                max: Math.round(status.duration),
                now: Math.round(status.currentTime),
              }}
              style={styles.track}
            >
              <View style={styles.trackBackground} />
              <View style={[styles.trackFill, { width: `${progress * 100}%` }]} />
            </Pressable>
            <View style={styles.timeRow}>
              <ThemedText variant="caption" color={colors.charcoal}>
                {formatTime(status.currentTime)}
              </ThemedText>
              <ThemedText variant="caption" color={colors.charcoal}>
                {formatTime(status.duration)}
              </ThemedText>
            </View>
          </View>
        ) : (
          <ThemedText variant="caption" color={colors.charcoal} style={styles.loadingLabel}>
            Loading audio…
          </ThemedText>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: spacing.md,
  },
  controlsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  playButton: {
    width: 64,
    height: 64,
    borderRadius: radius.lg,
    backgroundColor: colors.navy,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: {
    opacity: 0.85,
  },
  timeGroup: {
    flex: 1,
  },
  loadingLabel: {
    flex: 1,
  },
  track: {
    height: 24,
    justifyContent: 'center',
  },
  trackBackground: {
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.border,
  },
  trackFill: {
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.bronze,
    position: 'absolute',
    left: 0,
  },
  timeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: spacing.xs,
  },
  errorText: {
    marginBottom: spacing.md,
  },
});
