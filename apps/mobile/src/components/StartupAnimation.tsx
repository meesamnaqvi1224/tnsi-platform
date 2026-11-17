import { useEffect, useState } from 'react';
import { AccessibilityInfo, Image, Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Circle, Defs, RadialGradient, Stop } from 'react-native-svg';
import * as SplashScreen from 'expo-splash-screen';
import { colors, fontFamily } from '@/theme';
import { STARTUP, STARTUP_FADE_START_MS, STARTUP_TOTAL_MS } from '@/lib/startup-timing';

/** The splash colour set in app.config.ts, so the hand-off from the native splash has no flash. */
const NAVY = '#0D141C';
const GOLD = colors.bronzeMuted;
const LOTUS_SIZE = 168;

const ease = Easing.inOut(Easing.ease);

/**
 * The start-up sequence: one slow breath. It sits over the app on the same
 * navy as the native splash, so the hand-off is seamless; the native splash is
 * only dismissed once this has been laid out. The lotus rises, breathes in and
 * out, the wordmark settles beneath it, and the whole screen dissolves into
 * whatever is underneath (the app keeps loading meanwhile). Tapping skips it.
 * With reduced motion it is only a short dissolve.
 */
export function StartupAnimation({ onDone }: { onDone: () => void }) {
  // null until we know whether the member prefers reduced motion.
  const [reduceMotion, setReduceMotion] = useState<boolean | null>(null);
  const [skipped, setSkipped] = useState(false);

  const overlay = useSharedValue(1);
  const lotusOpacity = useSharedValue(0);
  const lotusScale = useSharedValue(0.9);
  const glowOpacity = useSharedValue(0);
  const glowScale = useSharedValue(0.85);
  const wordmark = useSharedValue(0);
  const tagline = useSharedValue(0);

  useEffect(() => {
    let cancelled = false;
    AccessibilityInfo.isReduceMotionEnabled()
      .then((value) => {
        if (!cancelled) setReduceMotion(value);
      })
      .catch(() => {
        if (!cancelled) setReduceMotion(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // Start once the preference is known; only then is the native splash dismissed,
  // so there is never a frame with neither on screen.
  useEffect(() => {
    if (reduceMotion === null) return;
    const hideNativeSplash = () => {
      SplashScreen.hideAsync().catch(() => undefined);
    };

    // Tapping skips straight to a quick dissolve.
    if (skipped) {
      overlay.value = withTiming(0, { duration: STARTUP.skipFade });
      const timer = setTimeout(onDone, STARTUP.skipFade);
      return () => clearTimeout(timer);
    }

    if (reduceMotion) {
      lotusOpacity.value = 1;
      lotusScale.value = 1;
      wordmark.value = 1;
      tagline.value = 1;
      hideNativeSplash();
      overlay.value = withDelay(350, withTiming(0, { duration: STARTUP.skipFade }));
      const timer = setTimeout(onDone, 350 + STARTUP.skipFade);
      return () => clearTimeout(timer);
    }

    lotusOpacity.value = withTiming(1, { duration: STARTUP.lotusIn, easing: ease });
    lotusScale.value = withSequence(
      withTiming(1, { duration: STARTUP.lotusIn, easing: ease }),
      withTiming(1.06, { duration: STARTUP.inhale, easing: ease }),
      withTiming(1, { duration: STARTUP.exhale, easing: ease }),
    );
    glowOpacity.value = withSequence(
      withTiming(0, { duration: STARTUP.lotusIn }),
      withTiming(1, { duration: STARTUP.inhale, easing: ease }),
      withTiming(0, { duration: STARTUP.exhale, easing: ease }),
    );
    glowScale.value = withSequence(
      withTiming(0.85, { duration: STARTUP.lotusIn }),
      withTiming(1.2, { duration: STARTUP.inhale, easing: ease }),
      withTiming(0.9, { duration: STARTUP.exhale, easing: ease }),
    );
    wordmark.value = withDelay(
      STARTUP.wordmarkDelay,
      withTiming(1, { duration: STARTUP.wordmarkIn, easing: ease }),
    );
    tagline.value = withDelay(
      STARTUP.taglineDelay,
      withTiming(1, { duration: STARTUP.taglineIn, easing: ease }),
    );
    overlay.value = withDelay(
      STARTUP_FADE_START_MS,
      withTiming(0, { duration: STARTUP.fadeOut, easing: Easing.out(Easing.ease) }),
    );
    hideNativeSplash();
    const timer = setTimeout(onDone, STARTUP_TOTAL_MS);
    return () => clearTimeout(timer);
  }, [
    reduceMotion,
    skipped,
    onDone,
    overlay,
    lotusOpacity,
    lotusScale,
    glowOpacity,
    glowScale,
    wordmark,
    tagline,
  ]);

  const overlayStyle = useAnimatedStyle(() => ({ opacity: overlay.value }));
  const lotusStyle = useAnimatedStyle(() => ({
    opacity: lotusOpacity.value,
    transform: [{ scale: lotusScale.value }],
  }));
  const glowStyle = useAnimatedStyle(() => ({
    opacity: glowOpacity.value,
    transform: [{ scale: glowScale.value }],
  }));
  const wordmarkStyle = useAnimatedStyle(() => ({
    opacity: wordmark.value,
    transform: [{ translateY: (1 - wordmark.value) * 8 }],
  }));
  const taglineStyle = useAnimatedStyle(() => ({
    opacity: tagline.value,
    transform: [{ translateY: (1 - tagline.value) * 8 }],
  }));

  return (
    <Animated.View style={[styles.root, overlayStyle]} pointerEvents="auto">
      <Pressable
        style={styles.fill}
        onPress={() => setSkipped(true)}
        accessibilityRole="button"
        accessibilityLabel="The Nervous System Institute. Tap to skip the introduction."
      >
        <View style={styles.column}>
          <View style={styles.lotusWrap}>
            <Animated.View style={[styles.glow, glowStyle]} pointerEvents="none">
              {/* A soft radial falloff, not a flat disc: light, not a shape. */}
              <Svg width="100%" height="100%" viewBox="0 0 100 100">
                <Defs>
                  <RadialGradient
                    id="startupGlow"
                    cx="50"
                    cy="50"
                    r="50"
                    gradientUnits="userSpaceOnUse"
                  >
                    <Stop offset="0" stopColor={GOLD} stopOpacity="0.5" />
                    <Stop offset="0.55" stopColor={GOLD} stopOpacity="0.14" />
                    <Stop offset="1" stopColor={GOLD} stopOpacity="0" />
                  </RadialGradient>
                </Defs>
                <Circle cx="50" cy="50" r="50" fill="url(#startupGlow)" />
              </Svg>
            </Animated.View>
            <Animated.View style={lotusStyle}>
              <Image
                source={require('../../assets/images/logo-mark.png')}
                style={styles.lotus}
                accessibilityIgnoresInvertColors
              />
            </Animated.View>
          </View>
          <Animated.View style={wordmarkStyle}>
            <Text style={styles.wordmark}>THE NERVOUS SYSTEM</Text>
            <Text style={styles.wordmark}>INSTITUTE</Text>
          </Animated.View>
          <Animated.View style={taglineStyle}>
            <Text style={styles.tagline}>REGULATION · CAPACITY · LEADERSHIP</Text>
          </Animated.View>
        </View>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  root: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: NAVY,
    zIndex: 1000,
    elevation: 1000,
  },
  fill: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  column: {
    alignItems: 'center',
    gap: 22,
    marginBottom: 40,
  },
  lotusWrap: {
    width: LOTUS_SIZE,
    height: LOTUS_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  glow: {
    position: 'absolute',
    width: LOTUS_SIZE * 1.7,
    height: LOTUS_SIZE * 1.7,
  },
  lotus: {
    width: LOTUS_SIZE,
    height: LOTUS_SIZE,
    resizeMode: 'contain',
  },
  wordmark: {
    fontFamily: fontFamily.serif,
    fontSize: 17,
    lineHeight: 26,
    letterSpacing: 3.2,
    color: GOLD,
    textAlign: 'center',
  },
  tagline: {
    fontFamily: fontFamily.system,
    fontSize: 11,
    letterSpacing: 2.4,
    color: GOLD,
    opacity: 0.85,
    textAlign: 'center',
  },
});
