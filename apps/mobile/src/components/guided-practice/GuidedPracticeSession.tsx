import { useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, Animated, AppState, Pressable, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { setAudioModeAsync, useAudioPlayer, useAudioPlayerStatus } from 'expo-audio';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Circle } from 'react-native-svg';
import { PrimaryButton, ThemedText } from '@/components';
import {
  formatClock,
  guidedPracticeRoutes,
  progressAt,
  remainingSeconds,
  stageIndexAt,
  type GuidedPractice,
} from '@/lib/guided-practices';
import { colors, spacing } from '@/theme';
import { GUIDED_PRACTICE_AUDIO } from './audio';

const RING = { size: 224, radius: 100, stroke: 5 } as const;
const CIRCUMFERENCE = 2 * Math.PI * RING.radius;

/**
 * Screen 2: the guided practice, driven by the real recording.
 *
 * The player's position is the only clock. The ring, elapsed and remaining time and
 * the stage are all read from it, so what is shown can never differ from what is
 * heard. Completion opens only when the player reports the recording has finished.
 * Leaving the screen by any route (Exit, back, the system) releases the player and
 * stops the sound. Nothing is recorded or saved from here.
 */
export function GuidedPracticeSession({ practice }: { practice: GuidedPractice }) {
  const router = useRouter();
  const routes = guidedPracticeRoutes(practice.slug);
  const source = GUIDED_PRACTICE_AUDIO[practice.slug];
  const player = useAudioPlayer(source, { updateInterval: 250 });
  const status = useAudioPlayerStatus(player);

  /** Whether play has ever been pressed, so completion can never fire before the practice began. */
  const [started, setStarted] = useState(false);
  const finishedRef = useRef(false);
  const [reduceMotion, setReduceMotion] = useState(false);
  const [fade] = useState(() => new Animated.Value(1));

  // Voice recordings should be heard with the ringer switch on silent, and should not keep playing once the app is left.
  useEffect(() => {
    setAudioModeAsync({
      playsInSilentMode: true,
      shouldPlayInBackground: false,
      interruptionMode: 'doNotMix',
    }).catch(() => undefined);
  }, []);

  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled()
      .then(setReduceMotion)
      .catch(() => undefined);
    const sub = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduceMotion);
    return () => sub.remove();
  }, []);

  // Leaving the practice stops the sound: unmounting (exit, back, any navigation) and the app going to the background.
  // On unmount `useAudioPlayer` has already released the player (which itself stops the sound), so a late pause()
  // finds no native object and throws; it is harmless to ignore.
  useEffect(() => {
    const pause = () => {
      try {
        player.pause();
      } catch {
        // Already released.
      }
    };
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'background') pause();
    });
    return () => {
      sub.remove();
      pause();
    };
  }, [player]);

  // The recording finished: the one and only way to the completion screen.
  useEffect(() => {
    if (status.didJustFinish && started && !finishedRef.current) {
      finishedRef.current = true;
      router.replace(routes.complete);
    }
  }, [status.didJustFinish, started, router, routes.complete]);

  const duration = status.duration > 0 ? status.duration : practice.durationSeconds;
  const elapsed = started ? status.currentTime : 0;
  const stageIndex = stageIndexAt(practice.stages, elapsed);
  const stage = started ? practice.stages[stageIndex]! : null;
  const progress = progressAt(elapsed, duration);
  const failed = Boolean(status.error);

  // A stage change: the new words ease in. For people who ask for reduced motion they simply swap.
  const stageKey = stage?.key ?? 'ready';
  useEffect(() => {
    if (reduceMotion) {
      fade.setValue(1);
      return;
    }
    fade.setValue(0);
    Animated.timing(fade, { toValue: 1, duration: 650, useNativeDriver: true }).start();
  }, [stageKey, reduceMotion, fade]);

  function toggle() {
    if (failed) {
      player.replace(source);
      setStarted(true);
      player.play();
      return;
    }
    if (status.playing) {
      player.pause();
    } else {
      setStarted(true);
      player.play();
    }
  }

  const label = status.playing ? 'Pause' : started ? 'Resume' : 'Play';

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right', 'bottom']}>
      <View style={styles.header}>
        <Pressable
          onPress={() => router.dismissTo('/practices')}
          accessibilityRole="button"
          accessibilityLabel="Exit practice"
          hitSlop={8}
          style={styles.exit}
        >
          <Ionicons name="close" size={20} color={colors.charcoal} />
          <ThemedText variant="body" color={colors.charcoal}>
            Exit practice
          </ThemedText>
        </Pressable>
      </View>

      <View style={styles.center}>
        <View
          style={styles.ringWrap}
          accessible
          accessibilityRole="progressbar"
          accessibilityLabel={practice.title}
          accessibilityValue={{
            min: 0,
            max: Math.round(duration),
            now: Math.round(elapsed),
            text: `${formatClock(elapsed)} of ${formatClock(Math.ceil(duration))}`,
          }}
        >
          <Svg width={RING.size} height={RING.size} viewBox={`0 0 ${RING.size} ${RING.size}`}>
            <Circle
              cx={RING.size / 2}
              cy={RING.size / 2}
              r={RING.radius}
              fill="none"
              stroke={colors.border}
              strokeWidth={RING.stroke}
            />
            <Circle
              cx={RING.size / 2}
              cy={RING.size / 2}
              r={RING.radius}
              fill="none"
              stroke={colors.bronze}
              strokeWidth={RING.stroke}
              strokeLinecap="round"
              strokeDasharray={CIRCUMFERENCE}
              strokeDashoffset={CIRCUMFERENCE * (1 - progress)}
              transform={`rotate(-90 ${RING.size / 2} ${RING.size / 2})`}
            />
          </Svg>
          <Animated.View style={[styles.ringLabel, { opacity: fade }]}>
            <ThemedText variant="label" color={colors.charcoal} style={styles.stageCount}>
              {stage ? `Stage ${stageIndex + 1} of ${practice.stages.length}` : practice.title}
            </ThemedText>
            {stage ? (
              <ThemedText variant="heading" style={styles.stageName}>
                {stage.name}
              </ThemedText>
            ) : null}
          </Animated.View>
        </View>

        <View style={styles.times}>
          <ThemedText variant="caption" color={colors.charcoal}>
            {formatClock(elapsed)} elapsed
          </ThemedText>
          <ThemedText variant="caption" color={colors.charcoal}>
            {formatClock(remainingSeconds(elapsed, duration))} remaining
          </ThemedText>
        </View>

        <Animated.View style={[styles.cueWrap, { opacity: fade }]}>
          <ThemedText variant="display" style={styles.cue} accessibilityLiveRegion="polite">
            {stage ? stage.cue : 'Press play when you’re ready.'}
          </ThemedText>
        </Animated.View>
      </View>

      <View style={styles.controls}>
        <Pressable
          onPress={toggle}
          accessibilityRole="button"
          accessibilityLabel={label}
          disabled={!status.isLoaded && !failed}
          style={({ pressed }) => [styles.playButton, pressed && styles.pressed]}
        >
          <Ionicons
            name={status.playing ? 'pause' : 'play'}
            size={32}
            color={colors.cream}
            style={status.playing ? undefined : styles.playIcon}
          />
        </Pressable>
        <ThemedText variant="label" color={colors.charcoal}>
          {label}
        </ThemedText>

        <View style={styles.stages} accessibilityLabel="Stages" accessibilityRole="list">
          {practice.stages.map((s, i) => (
            <View
              key={s.key}
              accessible
              accessibilityRole="text"
              accessibilityLabel={s.name}
              accessibilityState={{ selected: started && i === stageIndex }}
              style={[styles.stageBar, started && i <= stageIndex && styles.stageBarReached]}
            />
          ))}
        </View>

        {failed ? (
          <View accessibilityRole="alert" style={styles.notice}>
            <ThemedText variant="caption" color={colors.charcoal} style={styles.noticeText}>
              The audio couldn’t be played. Check your connection, then try again.
            </ThemedText>
            <PrimaryButton label="Try again" variant="secondary" onPress={toggle} />
          </View>
        ) : status.isBuffering && status.playing ? (
          <ThemedText variant="caption" color={colors.charcoal} style={styles.noticeText}>
            Loading the audio…
          </ThemedText>
        ) : null}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.cream },
  header: { paddingHorizontal: spacing.lg, paddingTop: spacing.sm },
  exit: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    alignSelf: 'flex-start',
    marginLeft: -spacing.sm,
    paddingHorizontal: spacing.sm,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
  },
  ringWrap: { width: RING.size, height: RING.size, alignItems: 'center', justifyContent: 'center' },
  ringLabel: {
    position: 'absolute',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
  },
  stageCount: { textTransform: 'uppercase', textAlign: 'center', marginBottom: spacing.xs },
  stageName: { textAlign: 'center' },
  times: {
    width: RING.size,
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: spacing.sm,
  },
  cueWrap: { marginTop: spacing.lg, minHeight: 112, justifyContent: 'center' },
  cue: { textAlign: 'center', maxWidth: 340 },
  controls: { alignItems: 'center', gap: spacing.sm, paddingBottom: spacing.lg },
  playButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.navy,
    alignItems: 'center',
    justifyContent: 'center',
  },
  playIcon: { marginLeft: 4 },
  pressed: { opacity: 0.85 },
  stages: { flexDirection: 'row', gap: 6, width: 240, marginTop: spacing.md },
  stageBar: { flex: 1, height: 4, borderRadius: 2, backgroundColor: colors.border },
  stageBarReached: { backgroundColor: colors.bronze },
  notice: { alignItems: 'center', gap: spacing.sm, marginTop: spacing.sm },
  noticeText: { textAlign: 'center', maxWidth: 280 },
});
