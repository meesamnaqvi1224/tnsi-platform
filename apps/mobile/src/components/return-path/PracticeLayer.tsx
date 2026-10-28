import { useEffect } from 'react';
import { Pressable, StyleSheet, View, useWindowDimensions } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  LEVELS,
  type Checkpoint,
  type LabyrinthGeometry,
  type LevelId,
  type Point,
} from '@tnsi/core';
import { ThemedText } from '@/components/ThemedText';
import { colors, radius, spacing } from '@/theme';
import type { ReturnPathContent } from '@/api/types';
import { touchToViewBox } from '@/lib/return-path/touch';
import { BreathOrb } from './BreathOrb';
import { LabyrinthCanvas } from './LabyrinthCanvas';
import { rp } from './palette';

export interface PauseOverlay {
  cue: string;
  count: string;
  line: string;
}

interface PracticeLayerProps {
  content: ReturnPathContent;
  level: LevelId;
  geometry: LabyrinthGeometry;
  checkpoints: Checkpoint[];
  progress: number;
  /** Fraction of the whole practice, 0..1. */
  fraction: number;
  hint: string;
  guide: boolean;
  overlay: PauseOverlay | null;
  orbScale: SharedValue<number>;
  orbOpacity: SharedValue<number>;
  reduceMotion: boolean;
  onStop: () => void;
  onToggleGuide: () => void;
  onSkip: () => void;
  /** Touches, already converted to the labyrinth's 400 x 400 viewBox. */
  onTraceStart: (point: Point) => void;
  onTraceMove: (point: Point) => void;
  onTraceEnd: () => void;
}

/** Vertical space taken by the header, progress line and hint around the stage. */
const CHROME_HEIGHT = 260;

/** The full-screen practice: tracing, the breathing pauses at each marker and the centre, and the return. */
export function PracticeLayer({
  content,
  level,
  geometry,
  checkpoints,
  progress,
  fraction,
  hint,
  guide,
  overlay,
  orbScale,
  orbOpacity,
  reduceMotion,
  onStop,
  onToggleGuide,
  onSkip,
  onTraceStart,
  onTraceMove,
  onTraceEnd,
}: PracticeLayerProps) {
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const size = Math.max(
    200,
    Math.min(width - spacing.md * 2, height - insets.top - insets.bottom - CHROME_HEIGHT),
  );
  const orbSize = Math.min(150, size * 0.36);

  const overlayOpacity = useSharedValue(0);
  useEffect(() => {
    overlayOpacity.value = withTiming(overlay ? 1 : 0, { duration: reduceMotion ? 0 : 600 });
  }, [overlay, reduceMotion, overlayOpacity]);
  const overlayStyle = useAnimatedStyle(() => ({ opacity: overlayOpacity.value }));

  return (
    <View
      style={[
        styles.root,
        { paddingTop: Math.max(insets.top, 12), paddingBottom: Math.max(insets.bottom, 16) },
      ]}
    >
      <View style={styles.header}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Stop the practice"
          onPress={onStop}
          hitSlop={8}
          style={styles.stopButton}
        >
          <ThemedText variant="heading" color={colors.charcoal}>
            ✕
          </ThemedText>
        </Pressable>
        <ThemedText variant="label" color={colors.charcoal} style={styles.levelName}>
          {LEVELS[level].name}
        </ThemedText>
        <Pressable
          accessibilityRole="button"
          accessibilityState={{ selected: guide }}
          onPress={onToggleGuide}
          hitSlop={8}
          style={[styles.guideButton, guide && styles.guideButtonOn]}
        >
          <ThemedText variant="body" color={guide ? colors.cream : colors.charcoal}>
            Guide me
          </ThemedText>
        </Pressable>
      </View>

      <View style={styles.progressTrack} accessibilityElementsHidden>
        <View style={[styles.progressFill, { width: `${Math.round(fraction * 1000) / 10}%` }]} />
      </View>

      <View style={styles.stageWrap}>
        <LabyrinthCanvas
          geometry={geometry}
          checkpoints={checkpoints}
          progress={progress}
          size={size}
          reduceMotion={reduceMotion}
          onTouchStart={(x, y) => {
            const point = touchToViewBox(x, y, size);
            if (point) onTraceStart(point);
          }}
          onTouchMove={(x, y) => {
            const point = touchToViewBox(x, y, size);
            if (point) onTraceMove(point);
          }}
          onTouchEnd={onTraceEnd}
        >
          <Animated.View
            pointerEvents={overlay ? 'auto' : 'none'}
            accessibilityElementsHidden={!overlay}
            importantForAccessibility={overlay ? 'auto' : 'no-hide-descendants'}
            style={[styles.overlay, { borderRadius: size / 2 }, overlayStyle]}
          >
            {overlay ? (
              <View style={styles.overlayContent}>
                <BreathOrb size={orbSize} scale={orbScale} opacity={orbOpacity} />
                <ThemedText variant="heading" style={styles.cue} accessibilityLiveRegion="polite">
                  {overlay.cue}
                </ThemedText>
                <ThemedText variant="caption" color={colors.charcoal} style={styles.count}>
                  {overlay.count}
                </ThemedText>
                <ThemedText variant="body" style={styles.line} accessibilityLiveRegion="polite">
                  {overlay.line}
                </ThemedText>
                <Pressable
                  accessibilityRole="button"
                  onPress={onSkip}
                  hitSlop={12}
                  style={styles.continueButton}
                >
                  <ThemedText variant="body" color={colors.charcoal} style={styles.continueText}>
                    {content.checkpoints.continueLabel}
                  </ThemedText>
                </Pressable>
              </View>
            ) : null}
          </Animated.View>
        </LabyrinthCanvas>
      </View>

      <ThemedText
        variant="body"
        color={colors.charcoal}
        style={styles.hint}
        accessibilityLiveRegion="polite"
      >
        {hint}
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.cream,
    paddingHorizontal: spacing.md,
    gap: spacing.sm,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  stopButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  levelName: {
    textTransform: 'uppercase',
    flexShrink: 1,
    textAlign: 'center',
  },
  guideButton: {
    minHeight: 44,
    paddingHorizontal: spacing.md,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  guideButtonOn: {
    backgroundColor: colors.navy,
    borderColor: colors.navy,
  },
  progressTrack: {
    height: 3,
    borderRadius: 2,
    overflow: 'hidden',
    backgroundColor: rp.channel,
  },
  progressFill: {
    height: '100%',
    backgroundColor: rp.trace,
  },
  stageWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: rp.overlay,
  },
  overlayContent: {
    maxWidth: '82%',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.md,
  },
  cue: {
    fontSize: 24,
    textAlign: 'center',
  },
  count: {
    minHeight: 18,
    textAlign: 'center',
    fontVariant: ['tabular-nums'],
  },
  line: {
    textAlign: 'center',
  },
  continueButton: {
    minHeight: 44,
    justifyContent: 'center',
  },
  continueText: {
    textDecorationLine: 'underline',
  },
  hint: {
    // Room for three lines (the longest hint), so the labyrinth never shifts as the hint changes.
    minHeight: 80,
    textAlign: 'center',
    paddingHorizontal: spacing.sm,
  },
});
