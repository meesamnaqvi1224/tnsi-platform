import { useEffect, type ReactNode } from 'react';
import { StyleSheet, View, type GestureResponderEvent } from 'react-native';
import Animated, {
  Easing,
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Circle, Path } from 'react-native-svg';
import {
  VIEWBOX,
  headPoint,
  pointAtLength,
  type Checkpoint,
  type LabyrinthGeometry,
} from '@tnsi/core';
import { rp } from './palette';

interface LabyrinthCanvasProps {
  geometry: LabyrinthGeometry;
  checkpoints: Checkpoint[];
  /** 0 .. 2L, see the engine. */
  progress: number;
  /** Side of the square stage, in pixels. */
  size: number;
  reduceMotion: boolean;
  onTouchStart: (x: number, y: number) => void;
  onTouchMove: (x: number, y: number) => void;
  onTouchEnd: () => void;
  /** Rendered above the labyrinth (the breathing overlay). */
  children?: ReactNode;
}

/**
 * Margin (in viewBox units) drawn around the labyrinth. The entrance and its
 * glow sit on the very edge of the 400 x 400 square, and react-native-svg
 * clips to its own bounds (the web version relies on `overflow: visible`), so
 * the drawing is made larger than the stage and offset back. Coordinates are
 * unchanged: the labyrinth is still 0..400 and touches map exactly as before.
 */
const PAD = 30;

/** Dash pattern that reveals the first `len` units of a path. */
const dash = (len: number, g: LabyrinthGeometry) => [len, g.L * 2];

/**
 * The labyrinth and the finger tracking. The drawing is `react-native-svg`
 * with `pointerEvents="none"`, so every touch lands on the touch-area View and
 * its `locationX/Y` are relative to the stage; scrolling and system gestures
 * never fight the trace because the View claims the responder and refuses to
 * give it up (the web version's `touch-action: none`).
 */
export function LabyrinthCanvas({
  geometry: g,
  checkpoints,
  progress,
  size,
  reduceMotion,
  onTouchStart,
  onTouchMove,
  onTouchEnd,
  children,
}: LabyrinthCanvasProps) {
  const scale = size / VIEWBOX;
  const inLen = Math.min(progress, g.L);
  const outLen = Math.max(0, progress - g.L);
  const head = headPoint(g, progress);
  const returning = progress > g.L;
  const markers = checkpoints.filter((cp) => cp.kind === 'in' || cp.kind === 'out');
  const centre = VIEWBOX / 2;

  const haloRadius = Math.max(14, g.w * 0.95) * scale;
  const pulse = useSharedValue(1);
  useEffect(() => {
    if (reduceMotion) {
      cancelAnimation(pulse);
      pulse.value = 1;
      return;
    }
    pulse.value = withRepeat(
      withSequence(
        withTiming(1.35, { duration: 1200, easing: Easing.inOut(Easing.ease) }),
        withTiming(1, { duration: 1200, easing: Easing.inOut(Easing.ease) }),
      ),
      -1,
    );
    return () => cancelAnimation(pulse);
  }, [reduceMotion, pulse]);
  const haloStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulse.value }],
    opacity: reduceMotion ? 0.9 : 1.1 - (pulse.value - 1) * 1.2,
  }));

  const point = (event: GestureResponderEvent) =>
    [event.nativeEvent.locationX, event.nativeEvent.locationY] as const;

  return (
    <View style={{ width: size, height: size }}>
      <View
        style={StyleSheet.absoluteFill}
        accessible
        accessibilityRole="image"
        accessibilityLabel="Labyrinth path to trace"
        accessibilityHint="Trace it with your finger, or turn on Guide me to follow it with your eyes."
        onStartShouldSetResponder={() => true}
        onMoveShouldSetResponder={() => true}
        onResponderTerminationRequest={() => false}
        onResponderGrant={(event) => onTouchStart(...point(event))}
        onResponderMove={(event) => onTouchMove(...point(event))}
        onResponderRelease={onTouchEnd}
        onResponderTerminate={onTouchEnd}
      >
        <Animated.View
          pointerEvents="none"
          style={[
            styles.halo,
            {
              left: head[0] * scale - haloRadius,
              top: head[1] * scale - haloRadius,
              width: haloRadius * 2,
              height: haloRadius * 2,
              borderRadius: haloRadius,
            },
            haloStyle,
          ]}
        />
        <Svg
          width={(VIEWBOX + PAD * 2) * scale}
          height={(VIEWBOX + PAD * 2) * scale}
          viewBox={`${-PAD} ${-PAD} ${VIEWBOX + PAD * 2} ${VIEWBOX + PAD * 2}`}
          pointerEvents="none"
          style={[styles.svg, { left: -PAD * scale, top: -PAD * scale }]}
        >
          <Path
            d={g.d}
            fill="none"
            stroke={rp.channel}
            strokeWidth={g.w * 0.62}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <Circle
            cx={centre}
            cy={centre}
            r={Math.max(10, g.centreR * 0.55)}
            fill={rp.centreFill}
            stroke={rp.trace}
            strokeWidth={1.5}
          />
          {/* Only drawn once they have length: a zero-length dash with a round cap would still paint a dot. */}
          {inLen > 0 ? (
            <Path
              d={g.d}
              fill="none"
              stroke={rp.trace}
              strokeWidth={g.w * 0.3}
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeDasharray={dash(inLen, g)}
            />
          ) : null}
          {outLen > 0 ? (
            <Path
              d={g.dRev}
              fill="none"
              stroke={rp.returnTrace}
              strokeWidth={g.w * 0.3}
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeDasharray={dash(outLen, g)}
            />
          ) : null}
          {markers.map((cp) => {
            const [x, y] = pointAtLength(g, cp.kind === 'out' ? 2 * g.L - cp.p : cp.p);
            const done = progress >= cp.p - 0.01;
            const colour = cp.kind === 'out' ? rp.returnTrace : rp.trace;
            return (
              <Circle
                key={cp.p}
                cx={x}
                cy={y}
                r={Math.max(4.5, g.w * 0.36)}
                fill={done ? colour : rp.marker}
                fillOpacity={done ? 0.45 : 1}
                stroke={colour}
                strokeWidth={2}
              />
            );
          })}
          <Circle
            cx={head[0]}
            cy={head[1]}
            r={Math.max(6, g.w * 0.42)}
            fill={returning ? rp.returnTrace : rp.trace}
          />
        </Svg>
      </View>

      {/* A sibling of the touch area, so its controls stay reachable by a screen reader. */}
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  svg: {
    position: 'absolute',
  },
  halo: {
    position: 'absolute',
    backgroundColor: rp.glow,
  },
});
