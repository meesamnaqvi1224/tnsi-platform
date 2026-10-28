import { useCallback, useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, Modal, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Easing, useSharedValue, withTiming } from 'react-native-reanimated';
import { activateKeepAwakeAsync, deactivateKeepAwake } from 'expo-keep-awake';
import type { LevelId, Point } from '@tnsi/core';
import type { ReturnPathContent } from '@/api/types';
import {
  buildBreathPhases,
  checkpointLine,
  countLabel,
  noBreathSeconds,
} from '@/lib/return-path/breath';
import { ReturnPathEngine, type ReachedEvent } from '@/lib/return-path/engine';
import { DEFAULT_SETTINGS, type ReturnPathSettings } from '@/lib/return-path/settings';
import { loadSettings, saveSettings } from '@/lib/return-path/settings-storage';
import { PracticeLayer, type PauseOverlay } from './PracticeLayer';
import { ChooseScreen, EndScreen, IntroScreen, type SaveState } from './Screens';

/**
 * The Return Path, native. One flow: intro -> choose a labyrinth -> the
 * full-screen practice (tracing, breathing pauses at each marker, the centre,
 * the return) -> ending. The labyrinth geometry and tracing rules are
 * `@tnsi/core`, shared with the web practice; the copy and breath timings
 * come from the server. Stop works at any moment, with no confirmation, and
 * leaves no timers running. Completion is saved through the existing
 * completion endpoint, like any other practice.
 */
interface ReturnPathPracticeProps {
  content: ReturnPathContent;
  /** Levels this member may start; the rest are shown as members-only. */
  allowedLevels: LevelId[];
  /** Saves the finished practice. Rejects when it could not be saved. */
  onComplete: () => Promise<unknown>;
}

type Screen = 'intro' | 'choose' | 'practice' | 'end';

/** Labyrinth units per second that "Guide me" traces at. */
const GUIDE_SPEED = 70;
const KEEP_AWAKE_TAG = 'return-path';

export function ReturnPathPractice({
  content,
  allowedLevels,
  onComplete,
}: ReturnPathPracticeProps) {
  const router = useRouter();
  const [screen, setScreen] = useState<Screen>('intro');
  const [settings, setSettings] = useState<ReturnPathSettings>(DEFAULT_SETTINGS);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [level, setLevel] = useState<LevelId>(1);
  const [lockedLevel, setLockedLevel] = useState<LevelId | null>(null);
  const [engine, setEngine] = useState<ReturnPathEngine | null>(null);
  const [progress, setProgress] = useState(0);
  const [hint, setHint] = useState('');
  const [guide, setGuide] = useState(false);
  const [overlay, setOverlay] = useState<PauseOverlay | null>(null);
  const [saveState, setSaveState] = useState<SaveState>('idle');
  const [reduceMotion, setReduceMotion] = useState(false);

  // Mutable practice state lives in refs: touch and timer callbacks must always
  // see the current values, never a stale render's.
  const engineRef = useRef<ReturnPathEngine | null>(null);
  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  const frameRef = useRef<number | null>(null);
  const guideRef = useRef(false);
  const draggingRef = useRef(false);
  const settingsRef = useRef(settings);
  const orbScale = useSharedValue(0.45);
  const orbOpacity = useSharedValue(1);

  useEffect(() => {
    let cancelled = false;
    loadSettings().then((stored) => {
      if (cancelled) return;
      settingsRef.current = stored;
      setSettings(stored);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const updateSettings = (patch: Partial<ReturnPathSettings>) => {
    const next = { ...settingsRef.current, ...patch };
    settingsRef.current = next;
    setSettings(next);
    void saveSettings(next);
  };

  /* ---------- timers, keep-awake, cleanup ---------- */

  const later = (fn: () => void, ms: number) => {
    timersRef.current.push(setTimeout(fn, ms));
  };

  const clearTimers = () => {
    timersRef.current.forEach(clearTimeout);
    timersRef.current = [];
  };

  const stopEverything = useCallback(() => {
    timersRef.current.forEach(clearTimeout);
    timersRef.current = [];
    if (frameRef.current !== null) cancelAnimationFrame(frameRef.current);
    frameRef.current = null;
    guideRef.current = false;
    draggingRef.current = false;
    Promise.resolve(deactivateKeepAwake(KEEP_AWAKE_TAG)).catch(() => undefined);
  }, []);

  useEffect(() => stopEverything, [stopEverything]);

  /* ---------- practice lifecycle ---------- */

  const startPractice = (id: LevelId) => {
    stopEverything();
    const next = new ReturnPathEngine(id);
    engineRef.current = next;
    setEngine(next);
    setLevel(id);
    setProgress(0);
    setGuide(false);
    setOverlay(null);
    setSaveState('idle');
    setLockedLevel(null);
    setHint(content.practice.firstHint);
    setScreen('practice');
    activateKeepAwakeAsync(KEEP_AWAKE_TAG).catch(() => undefined);
    AccessibilityInfo.isReduceMotionEnabled()
      .then(setReduceMotion)
      .catch(() => undefined);
  };

  const exitPractice = () => {
    stopEverything();
    setOverlay(null);
    setGuide(false);
    setScreen('choose');
  };

  const saveCompletion = async () => {
    setSaveState('saving');
    try {
      await onComplete();
      setSaveState('saved');
    } catch {
      setSaveState('failed');
    }
  };

  const completePractice = () => {
    stopEverything();
    setOverlay(null);
    setGuide(false);
    setScreen('end');
    void saveCompletion();
  };

  /* ---------- checkpoints and breathing ---------- */

  const endPause = () => {
    const current = engineRef.current;
    if (!current) return;
    clearTimers();
    setOverlay(null);
    const { fromCentre } = current.resume();
    if (fromCentre) setHint(content.practice.returnHint);
    else
      setHint(guideRef.current ? content.practice.guideFollowHint : content.practice.tracingHint);
  };

  const runPause = (cycles: number, line: string, isCentre: boolean) => {
    const { timings, checkpoints } = content;
    AccessibilityInfo.announceForAccessibility(line);

    if (settingsRef.current.noBreath) {
      orbScale.value = 0.7;
      orbOpacity.value = 0.55;
      setOverlay({ cue: checkpoints.noBreathCue, count: '', line });
      later(endPause, noBreathSeconds(isCentre, timings) * 1000);
      return;
    }

    const phases = buildBreathPhases(cycles, settingsRef.current.pause, timings, checkpoints);
    // Start the orb small with no transition, then animate from there. Reduced
    // motion: the orb fades instead of scaling.
    orbScale.value = reduceMotion ? 0.75 : 0.45;
    orbOpacity.value = reduceMotion ? 0.45 : 1;
    setOverlay({ cue: checkpoints.cueIn, count: '', line });

    let k = 0;
    const runPhase = () => {
      const phase = phases[k++];
      if (!phase) {
        endPause();
        return;
      }
      setOverlay({ cue: phase.cue, count: countLabel(phase.seconds, phase.cycle, cycles), line });
      if (phase.grow !== null) {
        const duration = phase.seconds * 1000;
        if (reduceMotion) {
          orbScale.value = 0.75;
          orbOpacity.value = withTiming(phase.grow ? 1 : 0.45, { duration });
        } else {
          orbScale.value = withTiming(phase.grow ? 1 : 0.45, {
            duration,
            easing: Easing.inOut(Easing.ease),
          });
          orbOpacity.value = 1;
        }
      }
      for (let s = 1; s < phase.seconds; s++) {
        later(
          () =>
            setOverlay((prev) =>
              prev ? { ...prev, count: countLabel(phase.seconds - s, phase.cycle, cycles) } : prev,
            ),
          s * 1000,
        );
      }
      later(runPhase, phase.seconds * 1000);
    };
    later(runPhase, 50);
  };

  const handleReached = (events: ReachedEvent[]) => {
    for (const event of events) {
      draggingRef.current = false;
      const { kind } = event.checkpoint;
      if (kind === 'end') {
        completePractice();
      } else if (kind === 'centre') {
        runPause(content.timings.centreCycles, content.practice.centreLine, true);
      } else {
        runPause(
          1,
          checkpointLine(event.markerNumber, settingsRef.current.noBreath, content.checkpoints),
          false,
        );
      }
    }
  };

  /** Applies a move the engine accepted: redraw, then react to any marker it reached. */
  const applyMove = (events: ReachedEvent[]) => {
    const current = engineRef.current;
    if (!current) return;
    setProgress((previous) => (previous === current.progress ? previous : current.progress));
    handleReached(events);
  };

  /* ---------- guide me ---------- */

  const toggleGuide = () => {
    const on = !guideRef.current;
    guideRef.current = on;
    setGuide(on);
    if (frameRef.current !== null) cancelAnimationFrame(frameRef.current);
    frameRef.current = null;
    if (!on) {
      setHint(content.practice.startHint);
      return;
    }
    draggingRef.current = false;
    if (engineRef.current?.phase === 'trace') setHint(content.practice.guideHint);

    let last: number | null = null;
    const step = (now: number) => {
      if (!guideRef.current) return;
      const dt = last === null ? 0 : Math.min(0.1, (now - last) / 1000);
      last = now;
      const current = engineRef.current;
      if (current && current.phase === 'trace') {
        applyMove(current.advanceTo(current.progress + GUIDE_SPEED * dt));
      }
      if (guideRef.current) frameRef.current = requestAnimationFrame(step);
    };
    frameRef.current = requestAnimationFrame(step);
  };

  /* ---------- finger tracing ---------- */

  const onTraceStart = (point: Point) => {
    const current = engineRef.current;
    if (!current || current.phase !== 'trace' || guideRef.current) return;
    if (current.canGrab(point)) {
      draggingRef.current = true;
      applyMove(current.follow(point));
    } else {
      setHint(content.practice.startHint);
    }
  };

  const onTraceMove = (point: Point) => {
    const current = engineRef.current;
    if (!draggingRef.current || !current || current.phase !== 'trace') return;
    applyMove(current.follow(point));
  };

  const onTraceEnd = () => {
    draggingRef.current = false;
  };

  /* ---------- render ---------- */

  const onChooseLevel = (id: LevelId) => {
    if (!allowedLevels.includes(id)) {
      setLockedLevel(id);
      return;
    }
    startPractice(id);
  };

  return (
    <View>
      {screen === 'intro' ? (
        <IntroScreen
          content={content}
          settings={settings}
          settingsOpen={settingsOpen}
          onToggleSettings={() => setSettingsOpen((open) => !open)}
          onChangeSettings={updateSettings}
          onBegin={() => setScreen('choose')}
        />
      ) : null}

      {screen === 'choose' ? (
        <ChooseScreen
          content={content}
          allowedLevels={allowedLevels}
          lockedLevel={lockedLevel}
          onBack={() => {
            setLockedLevel(null);
            setScreen('intro');
          }}
          onChoose={onChooseLevel}
          onLearnMore={() => router.push('/profile/membership')}
        />
      ) : null}

      {screen === 'end' ? (
        <EndScreen
          content={content}
          saveState={saveState}
          onPractiseAgain={() => startPractice(level)}
          onTryAnother={() => setScreen('choose')}
          onAssessment={() => router.push('/profile/assessment')}
          onHome={() => router.navigate('/')}
        />
      ) : null}

      <Modal
        visible={screen === 'practice' && engine !== null}
        animationType="fade"
        presentationStyle="fullScreen"
        onRequestClose={exitPractice}
      >
        {engine ? (
          <PracticeLayer
            content={content}
            level={level}
            geometry={engine.geometry}
            checkpoints={engine.checkpoints}
            progress={progress}
            fraction={progress / (2 * engine.geometry.L)}
            hint={hint}
            guide={guide}
            overlay={overlay}
            orbScale={orbScale}
            orbOpacity={orbOpacity}
            reduceMotion={reduceMotion}
            onStop={exitPractice}
            onToggleGuide={toggleGuide}
            onSkip={endPause}
            onTraceStart={onTraceStart}
            onTraceMove={onTraceMove}
            onTraceEnd={onTraceEnd}
          />
        ) : null}
      </Modal>
    </View>
  );
}
