import Animated, { useAnimatedStyle, type SharedValue } from 'react-native-reanimated';
import { rp } from './palette';

/** The breathing orb: it grows on the in-breath and shrinks on the out-breath. Driven by shared values so it never re-renders React. */
export function BreathOrb({
  size,
  scale,
  opacity,
}: {
  size: number;
  scale: SharedValue<number>;
  opacity: SharedValue<number>;
}) {
  const style = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));
  return (
    <Animated.View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={[
        { width: size, height: size, borderRadius: size / 2, backgroundColor: rp.orb },
        style,
      ]}
    />
  );
}
