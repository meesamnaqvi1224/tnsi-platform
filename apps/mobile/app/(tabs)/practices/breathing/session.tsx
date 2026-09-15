import { useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, Alert, BackHandler, Pressable, StyleSheet, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ThemedText } from '@/components';
import { BreathingCircle } from '@/components/breathing/BreathingCircle';
import { useBreathingTimer } from '@/hooks/useBreathingTimer';
import {
  BREATHING_DURATIONS_SECONDS,
  DEFAULT_BREATHING_DURATION_SECONDS,
  formatMMSS,
  type BreathingDurationSeconds,
} from '@/lib/breathing';
import { colors, spacing } from '@/theme';

function parseDuration(raw: string | undefined): BreathingDurationSeconds {
  const n = Number(raw);
  return (BREATHING_DURATIONS_SECONDS as readonly number[]).includes(n)
    ? (n as BreathingDurationSeconds)
    : DEFAULT_BREATHING_DURATION_SECONDS;
}

/**
 * The immersive session screen. A deep, uncluttered surface - no cards, no
 * nav chrome - with the breathing circle as the only real content. The
 * countdown, phase text and circle are all read from `useBreathingTimer`,
 * which is the single source of truth for elapsed time; this screen only
 * renders what that hook reports and forwards Pause/Resume/End intents to
 * it. Swipe-back is disabled for this route (see the practices layout) so
 * the only way out is the explicit, confirmed End action - matching the
 * spec's requirement that ending always asks first.
 */
export default function BreathingSessionScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ duration?: string }>();
  const totalSeconds = parseDuration(params.duration);

  const { runState, remaining, cycle, pause, resume } = useBreathingTimer(totalSeconds);
  const [reduceMotion, setReduceMotion] = useState(false);
  // A ref, not state: setting it doesn't schedule a render, so guarding
  // the replace() below with it avoids a setState-in-effect (the render
  // this effect belongs to doesn't need to know about the guard itself,
  // only the navigation needs to happen at most once).
  const navigatedAwayRef = useRef(false);

  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled()
      .then(setReduceMotion)
      .catch(() => undefined);
    const sub = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduceMotion);
    return () => sub.remove();
  }, []);

  // Fires exactly once: `runState` transitions to 'complete' exactly once
  // (see useBreathingTimer), and `navigatedAwayRef` guards against this
  // effect re-firing on any incidental re-render while the replace is in
  // flight.
  useEffect(() => {
    if (runState === 'complete' && !navigatedAwayRef.current) {
      navigatedAwayRef.current = true;
      router.replace({
        pathname: '/practices/breathing/complete',
        params: { duration: String(totalSeconds) },
      });
    }
  }, [runState, router, totalSeconds]);

  function confirmEnd() {
    // Remembers whether the session was already paused (the user tapped
    // Pause, then End) so cancelling restores exactly that state, rather
    // than always resuming - which would silently undo a pause the user
    // asked for on their own.
    const wasAlreadyPaused = runState === 'paused';
    if (!wasAlreadyPaused) pause();
    Alert.alert('End this session?', 'Your progress in this session will not be saved.', [
      {
        text: 'Continue Breathing',
        style: 'cancel',
        onPress: () => {
          if (!wasAlreadyPaused) resume();
        },
      },
      { text: 'End Session', style: 'destructive', onPress: () => router.back() },
    ]);
  }

  // Android hardware back is the same escape hatch a swipe-back gesture
  // would be on iOS - route it through the same confirmation instead of
  // letting it silently exit the session.
  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      confirmEnd();
      return true;
    });
    return () => sub.remove();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [runState]);

  const phaseLabel = cycle.phase === 'inhale' ? 'Inhale' : 'Exhale';
  const phaseHint = cycle.phase === 'inhale' ? 'Through your nose' : 'Slowly, through your mouth';

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right', 'bottom']}>
      <View style={styles.header}>
        <Pressable
          onPress={confirmEnd}
          accessibilityRole="button"
          accessibilityLabel="Close breathing session"
          hitSlop={12}
          style={styles.closeButton}
        >
          <Ionicons name="close" size={26} color={colors.cream} />
        </Pressable>
        <ThemedText variant="label" color={colors.cream} style={styles.headerTitle}>
          Breathing Exercise
        </ThemedText>
        <View style={styles.headerSpacer} />
      </View>

      <View style={styles.center}>
        <ThemedText
          variant="display"
          color={colors.cream}
          style={styles.phase}
          accessibilityLiveRegion="polite"
        >
          {phaseLabel}
        </ThemedText>
        <ThemedText variant="body" color={colors.creamMuted} style={styles.phaseHint}>
          {phaseHint}
        </ThemedText>

        <View style={styles.circleWrap}>
          <BreathingCircle cycle={cycle} reduceMotion={reduceMotion} />
        </View>

        <ThemedText variant="heading" color={colors.cream} style={styles.timer}>
          {formatMMSS(remaining)}{' '}
          <ThemedText color={colors.creamMuted}>/ {formatMMSS(totalSeconds)}</ThemedText>
        </ThemedText>
        <ThemedText variant="caption" color={colors.creamMuted} style={styles.caption}>
          Follow the pace. Nothing to force.
        </ThemedText>
      </View>

      <View style={styles.controls}>
        <Pressable
          onPress={runState === 'paused' ? resume : pause}
          accessibilityRole="button"
          accessibilityLabel={
            runState === 'paused' ? 'Resume breathing session' : 'Pause breathing session'
          }
          style={styles.controlButton}
        >
          <View style={styles.controlCircle}>
            <Ionicons
              name={runState === 'paused' ? 'play' : 'pause'}
              size={22}
              color={colors.cream}
            />
          </View>
          <ThemedText variant="caption" color={colors.creamMuted}>
            {runState === 'paused' ? 'Resume' : 'Pause'}
          </ThemedText>
        </Pressable>

        <Pressable
          onPress={confirmEnd}
          accessibilityRole="button"
          accessibilityLabel="End breathing session"
          style={styles.controlButton}
        >
          <View style={styles.controlCircle}>
            <Ionicons name="square" size={18} color={colors.cream} />
          </View>
          <ThemedText variant="caption" color={colors.creamMuted}>
            End
          </ThemedText>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.navyDark,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
  },
  closeButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: -spacing.sm,
  },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    marginRight: 44,
    textTransform: 'uppercase',
  },
  headerSpacer: {
    width: 44,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
  },
  phase: {
    marginBottom: spacing.xs,
  },
  phaseHint: {
    marginBottom: spacing.xxl,
  },
  circleWrap: {
    marginBottom: spacing.xxl,
  },
  timer: {
    marginBottom: spacing.sm,
  },
  caption: {
    textAlign: 'center',
  },
  controls: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing.xxl,
    paddingBottom: spacing.xl,
  },
  controlButton: {
    alignItems: 'center',
    gap: spacing.xs,
  },
  controlCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    borderWidth: 1,
    borderColor: colors.cream + '4D',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
