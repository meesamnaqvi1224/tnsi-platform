import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { colors } from '@/theme';
import type { BreathingCycleState } from '@/lib/breathing';

const MIN_SCALE = 0.72;
const MAX_SCALE = 1;
/** Must match the session timer's tick interval (`useBreathingTimer`'s
 * `TICK_MS`) - each tick nudges the shared value toward a freshly
 * computed, elapsed-time-true scale over exactly one tick's duration, so
 * the animation is a chain of short, self-correcting ramps rather than a
 * single long-running animation that could drift from the real clock. */
const TICK_MS = 200;

interface BreathingCircleProps {
  cycle: BreathingCycleState;
  size?: number;
  /** Skips the eased ramp and snaps directly to the target scale, for
   * `AccessibilityInfo.isReduceMotionEnabled()`. */
  reduceMotion?: boolean;
}

/** Inhale 0->1 grows the circle; exhale 1->0 (phaseProgress) shrinks it back - so `t` is always "how expanded should the circle be right now", independent of which phase we're in. */
function expansionFor(cycle: BreathingCycleState): number {
  return cycle.phase === 'inhale' ? cycle.phaseProgress : 1 - cycle.phaseProgress;
}

function scaleFor(cycle: BreathingCycleState): number {
  return MIN_SCALE + (MAX_SCALE - MIN_SCALE) * expansionFor(cycle);
}

/**
 * The large soft circular form from the mockup: three concentric,
 * decreasingly-opaque layers that scale together, giving a glow-like
 * effect without a radial-gradient dependency. Purely presentational -
 * `cycle` (from `cycleStateAt`, elapsed-time-derived) is the only input
 * that decides its size; it holds no timer of its own.
 */
export function BreathingCircle({ cycle, size = 220, reduceMotion = false }: BreathingCircleProps) {
  const scale = useSharedValue(scaleFor(cycle));

  useEffect(() => {
    const target = scaleFor(cycle);
    scale.value = reduceMotion
      ? target
      : withTiming(target, { duration: TICK_MS, easing: Easing.linear });
  }, [cycle, reduceMotion, scale]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const outerSize = size;
  const midSize = size * 0.78;
  const coreSize = size * 0.56;

  return (
    <View style={[styles.container, { width: outerSize, height: outerSize }]}>
      <Animated.View
        style={[
          styles.layer,
          styles.outer,
          { width: outerSize, height: outerSize, borderRadius: outerSize / 2 },
          animatedStyle,
        ]}
      />
      <Animated.View
        style={[
          styles.layer,
          styles.mid,
          { width: midSize, height: midSize, borderRadius: midSize / 2 },
          animatedStyle,
        ]}
      />
      <Animated.View
        style={[
          styles.layer,
          styles.core,
          { width: coreSize, height: coreSize, borderRadius: coreSize / 2 },
          animatedStyle,
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  layer: {
    position: 'absolute',
  },
  outer: {
    backgroundColor: colors.cream + '1A',
  },
  mid: {
    backgroundColor: colors.cream + '33',
  },
  core: {
    backgroundColor: colors.cream + '80',
  },
});
