import { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useAudioPlayer, useAudioPlayerStatus } from 'expo-audio';
import { ThemedText } from '@/components/ThemedText';
import { colors, radius, spacing } from '@/theme';

interface AudioPlayerProps {
  uri: string;
  /** Called once, the first time playback reaches the end. */
  onComplete: () => void;
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
export function AudioPlayer({ uri, onComplete }: AudioPlayerProps) {
  const player = useAudioPlayer(uri);
  const status = useAudioPlayerStatus(player);
  const [trackWidth, setTrackWidth] = useState(0);
  const hasCompletedRef = useRef(false);

  useEffect(() => {
    if (status.didJustFinish && !hasCompletedRef.current) {
      hasCompletedRef.current = true;
      onComplete();
    }
  }, [status.didJustFinish, onComplete]);

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
        <ThemedText variant="body" color={colors.error}>
          This audio couldn&apos;t be loaded. Please try again.
        </ThemedText>
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
});
