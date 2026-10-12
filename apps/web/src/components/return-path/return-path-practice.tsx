'use client';

import * as React from 'react';
import { createPortal } from 'react-dom';
import NextLink from 'next/link';
import { Alert, Button, Checkbox, Eyebrow, Heading, Input, Label, Text } from '@tnsi/ui';
import { cn } from '@/lib/utils';
import { getUtmParams, trackEvent, type AnalyticsParams } from '@/lib/analytics';
import type { ReturnPathContent } from './content';
import {
  LEVELS,
  LEVEL_IDS,
  VIEWBOX,
  buildCheckpoints,
  followPointer,
  geometryFor,
  grabRadius,
  headPoint,
  pointAtLength,
  type Checkpoint,
  type LabyrinthGeometry,
  type LevelId,
  type Point,
} from './geometry';
import styles from './return-path.module.css';

/**
 * The Return Path - a short labyrinth breathing practice. One component for
 * both contexts (build brief, Scope and access): only the wrapper, the
 * levels allowed and the ending differ.
 *
 * - `public`: no sign-in, completions never stored, ending offers the Flowi
 *   email form, the Capacity Assessment and Practise again.
 * - `member`: completion is saved through the existing
 *   `POST /api/v1/practices/[id]/complete`, like any other practice.
 *
 * Flow: intro -> choose a labyrinth -> full-screen practice (tracing,
 * checkpoint pauses, centre, return) -> ending. Stop works at any moment,
 * with no confirmation, and leaves no timers running.
 */
export interface ReturnPathPracticeProps {
  context: 'public' | 'member';
  content: ReturnPathContent;
  /** Levels this visitor may start; the rest are shown locked. */
  allowedLevels: LevelId[];
  /** Member context only - the `practices` row the completion is saved against. */
  practiceId?: string;
}

type Screen = 'intro' | 'choose' | 'practice' | 'end';
type Phase = 'idle' | 'trace' | 'pause';
type SaveState = 'idle' | 'saving' | 'saved' | 'failed';

interface Settings {
  pause: boolean;
  noBreath: boolean;
}

interface Overlay {
  cue: string;
  count: string;
  line: string;
  orbScale: number;
  orbOpacity: number;
  orbSeconds: number;
}

const SETTINGS_STORAGE_KEY = 'trp-settings';
const GUIDE_SPEED = 70; // SVG units per second
const LOCKED_LEVEL_HREF = '/programs/regulation-suite';
const ASSESSMENT_HREF = '/assessment';
const DASHBOARD_HREF = '/dashboard';
const CX = VIEWBOX / 2;

/**
 * Dash pattern that reveals the first `len` units of a path. Rounded so
 * server and browser render identical strings - their Math.sin/cos can
 * differ in the last digit, which would otherwise break hydration.
 */
const dash = (len: number, g: LabyrinthGeometry) => `${len.toFixed(2)} ${(g.L * 2).toFixed(2)}`;

function readSettings(): Settings {
  try {
    const raw = JSON.parse(localStorage.getItem(SETTINGS_STORAGE_KEY) ?? '{}') as Partial<Settings>;
    return { pause: !!raw.pause, noBreath: !!raw.noBreath };
  } catch {
    return { pause: false, noBreath: false };
  }
}

function writeSettings(settings: Settings) {
  try {
    localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings));
  } catch {
    // Private mode / storage blocked: settings just aren't remembered.
  }
}

interface WakeLockSentinelLike {
  release: () => Promise<void>;
}

export function ReturnPathPractice({
  context,
  content,
  allowedLevels,
  practiceId,
}: ReturnPathPracticeProps) {
  const [screen, setScreen] = React.useState<Screen>('intro');
  // Lazy read is hydration-safe here: settings only render once the
  // Settings panel is opened, never in the server-rendered intro.
  const [settings, setSettings] = React.useState<Settings>(() =>
    typeof window === 'undefined' ? { pause: false, noBreath: false } : readSettings(),
  );
  const [settingsOpen, setSettingsOpen] = React.useState(false);
  const [level, setLevel] = React.useState<LevelId>(1);
  const [lockedLevel, setLockedLevel] = React.useState<LevelId | null>(null);
  const [progress, setProgress] = React.useState(0);
  const [hint, setHint] = React.useState('');
  const [guide, setGuide] = React.useState(false);
  const [overlay, setOverlay] = React.useState<Overlay | null>(null);
  const [saveState, setSaveState] = React.useState<SaveState>('idle');
  const [run, setRun] = React.useState<{
    geometry: LabyrinthGeometry;
    checkpoints: Checkpoint[];
  } | null>(null);

  // Mutable practice state lives in refs: pointer and timer callbacks must
  // always see the current values, never a stale render's.
  const geoRef = React.useRef<LabyrinthGeometry | null>(null);
  const cpsRef = React.useRef<Checkpoint[]>([]);
  const nextRef = React.useRef(0);
  const pRef = React.useRef(0);
  const phaseRef = React.useRef<Phase>('idle');
  const draggingRef = React.useRef(false);
  const guideRef = React.useRef(false);
  const markerCountRef = React.useRef(0);
  const timersRef = React.useRef<ReturnType<typeof setTimeout>[]>([]);
  const rafRef = React.useRef(0);
  const wakeRef = React.useRef<WakeLockSentinelLike | null>(null);
  const settingsRef = React.useRef(settings);
  const levelRef = React.useRef(level);
  const svgRef = React.useRef<SVGSVGElement | null>(null);
  const stopButtonRef = React.useRef<HTMLButtonElement | null>(null);
  const endHeadingRef = React.useRef<HTMLHeadingElement | null>(null);

  React.useEffect(() => {
    settingsRef.current = settings;
  }, [settings]);

  const track = React.useCallback(
    (name: string, params: AnalyticsParams = {}) => trackEvent(name, params),
    [],
  );

  React.useEffect(() => {
    getUtmParams(); // capture UTM from the landing URL before it can change
  }, []);

  const updateSettings = (patch: Partial<Settings>) => {
    const next = { ...settingsRef.current, ...patch };
    settingsRef.current = next;
    writeSettings(next);
    setSettings(next);
  };

  /* ---------- timers, wake lock, cleanup ---------- */

  const later = (fn: () => void, ms: number) => {
    timersRef.current.push(setTimeout(fn, ms));
  };

  const clearTimers = () => {
    timersRef.current.forEach(clearTimeout);
    timersRef.current = [];
  };

  const stopEverything = React.useCallback(() => {
    timersRef.current.forEach(clearTimeout);
    timersRef.current = [];
    cancelAnimationFrame(rafRef.current);
    guideRef.current = false;
    draggingRef.current = false;
    phaseRef.current = 'idle';
    wakeRef.current?.release().catch(() => undefined);
    wakeRef.current = null;
  }, []);

  React.useEffect(() => stopEverything, [stopEverything]);

  // The practice is a full-screen layer portaled to <body>: no page scroll
  // behind it, and everything else is inert so keyboard focus can't land
  // on the (covered) site header or menus.
  React.useEffect(() => {
    if (screen !== 'practice') return;
    const html = document.documentElement;
    const previous = html.style.overflow;
    html.style.overflow = 'hidden';
    const layer = stopButtonRef.current?.closest('[data-return-path-layer]');
    const siblings = Array.from(document.body.children).filter(
      (el): el is HTMLElement => el instanceof HTMLElement && el !== layer && !el.inert,
    );
    siblings.forEach((el) => (el.inert = true));
    stopButtonRef.current?.focus();
    return () => {
      html.style.overflow = previous;
      siblings.forEach((el) => (el.inert = false));
    };
  }, [screen]);

  React.useEffect(() => {
    if (screen === 'end') endHeadingRef.current?.focus();
  }, [screen]);

  /* ---------- practice lifecycle ---------- */

  const startPractice = (id: LevelId) => {
    stopEverything();
    const g = geometryFor(id);
    const checkpoints = buildCheckpoints(id, g);
    geoRef.current = g;
    cpsRef.current = checkpoints;
    levelRef.current = id;
    setRun({ geometry: g, checkpoints });
    nextRef.current = 0;
    pRef.current = 0;
    markerCountRef.current = 0;
    phaseRef.current = 'trace';
    setLevel(id);
    setProgress(0);
    setGuide(false);
    setOverlay(null);
    setSaveState('idle');
    setLockedLevel(null);
    setHint(content.practice.firstHint);
    setScreen('practice');
    track('practice_started', {
      level: id,
      context,
      pause: settingsRef.current.pause,
      noBreath: settingsRef.current.noBreath,
      ...getUtmParams(),
    });
    const wakeLock = (
      navigator as Navigator & {
        wakeLock?: { request: (type: 'screen') => Promise<WakeLockSentinelLike> };
      }
    ).wakeLock;
    wakeLock
      ?.request('screen')
      .then((sentinel) => {
        wakeRef.current = sentinel;
      })
      .catch(() => undefined);
  };

  const exitPractice = () => {
    const g = geoRef.current;
    track('practice_exited', {
      level: levelRef.current,
      progress_pct: g ? Math.round((pRef.current / (2 * g.L)) * 100) : 0,
    });
    stopEverything();
    setOverlay(null);
    setGuide(false);
    setScreen('choose');
  };

  const saveCompletion = async () => {
    if (context !== 'member' || !practiceId) return;
    setSaveState('saving');
    try {
      const response = await fetch(`/api/v1/practices/${practiceId}/complete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ completed: true, progressPct: 1 }),
      });
      setSaveState(response.ok ? 'saved' : 'failed');
    } catch {
      setSaveState('failed');
    }
  };

  const completePractice = () => {
    stopEverything();
    setOverlay(null);
    setGuide(false);
    track('practice_completed', { level: levelRef.current, context });
    setScreen('end');
    void saveCompletion();
  };

  /* ---------- checkpoints and breathing ---------- */

  const resume = (isCentre: boolean) => {
    clearTimers();
    setOverlay(null);
    phaseRef.current = 'trace';
    if (isCentre) setHint(content.practice.returnHint);
    else
      setHint(guideRef.current ? content.practice.guideFollowHint : content.practice.tracingHint);
  };

  const runPause = (cycles: number, line: string, isCentre: boolean) => {
    phaseRef.current = 'pause';
    const { timings, checkpoints } = content;

    if (settingsRef.current.noBreath) {
      setOverlay({
        cue: checkpoints.noBreathCue,
        count: '',
        line,
        orbScale: 0.7,
        orbOpacity: 0.55,
        orbSeconds: 0,
      });
      const seconds = isCentre ? timings.noBreathCentreSeconds : timings.noBreathMarkerSeconds;
      later(() => resume(isCentre), seconds * 1000);
      return;
    }

    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    type BreathPhase = { cue: string; seconds: number; grow: boolean | null; cycle: number };
    const phases: BreathPhase[] = [];
    for (let c = 0; c < cycles; c++) {
      phases.push({ cue: checkpoints.cueIn, seconds: timings.inhaleSeconds, grow: true, cycle: c });
      if (settingsRef.current.pause)
        phases.push({
          cue: checkpoints.cuePause,
          seconds: timings.pauseSeconds,
          grow: null,
          cycle: c,
        });
      phases.push({
        cue: checkpoints.cueOut,
        seconds: timings.exhaleSeconds,
        grow: false,
        cycle: c,
      });
    }

    const countLabel = (secondsLeft: number, cycle: number) =>
      cycles > 1 ? `${secondsLeft}  ·  breath ${cycle + 1} of ${cycles}` : `${secondsLeft}`;

    let k = 0;
    const runPhase = () => {
      const phase = phases[k++];
      if (!phase) {
        resume(isCentre);
        return;
      }
      setOverlay((prev) => {
        const base = prev ?? {
          cue: '',
          count: '',
          line,
          orbScale: 0.45,
          orbOpacity: 1,
          orbSeconds: 0,
        };
        // Reduced motion: the orb fades instead of scaling.
        const orb =
          phase.grow === null
            ? {}
            : reduceMotion
              ? { orbScale: 0.75, orbOpacity: phase.grow ? 1 : 0.45 }
              : { orbScale: phase.grow ? 1 : 0.45, orbOpacity: 1 };
        return {
          ...base,
          ...orb,
          line,
          cue: phase.cue,
          count: countLabel(phase.seconds, phase.cycle),
          orbSeconds: phase.seconds,
        };
      });
      for (let s = 1; s < phase.seconds; s++) {
        later(
          () =>
            setOverlay((prev) =>
              prev ? { ...prev, count: countLabel(phase.seconds - s, phase.cycle) } : prev,
            ),
          s * 1000,
        );
      }
      later(runPhase, phase.seconds * 1000);
    };

    // Start the orb small with no transition, then animate from there.
    setOverlay({
      cue: checkpoints.cueIn,
      count: '',
      line,
      orbScale: reduceMotion ? 0.75 : 0.45,
      orbOpacity: reduceMotion ? 0.45 : 1,
      orbSeconds: 0,
    });
    later(runPhase, 50);
  };

  const reach = (cp: Checkpoint) => {
    draggingRef.current = false;
    nextRef.current += 1;
    if (cp.kind === 'end') {
      completePractice();
      return;
    }
    if (cp.kind === 'centre') {
      track('centre_reached', { level: levelRef.current });
      runPause(content.timings.centreCycles, content.practice.centreLine, true);
      return;
    }
    markerCountRef.current += 1;
    const n = markerCountRef.current;
    track('checkpoint_reached', { n, kind: cp.kind });
    const lines = settingsRef.current.noBreath
      ? content.checkpoints.noBreathLines
      : content.checkpoints.breathLines;
    runPause(1, lines[(n - 1) % lines.length] ?? '', false);
  };

  const advanceTo = (target: number) => {
    const cp = cpsRef.current[nextRef.current];
    if (!cp || phaseRef.current !== 'trace') return;
    const p = Math.min(target, cp.p);
    pRef.current = p;
    setProgress(p);
    if (p >= cp.p - 0.01) reach(cp);
  };

  const skipPause = () => {
    track('pause_skipped', { n: markerCountRef.current });
    const previous = cpsRef.current[nextRef.current - 1];
    resume(previous?.kind === 'centre');
  };

  /* ---------- guide me ---------- */

  const toggleGuide = () => {
    const on = !guideRef.current;
    guideRef.current = on;
    setGuide(on);
    track('guide_mode', { on });
    cancelAnimationFrame(rafRef.current);
    if (!on) {
      setHint(content.practice.startHint);
      return;
    }
    draggingRef.current = false;
    if (phaseRef.current === 'trace') setHint(content.practice.guideHint);
    let last = performance.now();
    const step = (t: number) => {
      if (!guideRef.current) return;
      const dt = Math.min(0.1, (t - last) / 1000);
      last = t;
      if (phaseRef.current === 'trace') advanceTo(pRef.current + GUIDE_SPEED * dt);
      rafRef.current = requestAnimationFrame(step);
    };
    rafRef.current = requestAnimationFrame(step);
  };

  /* ---------- pointer tracing ---------- */

  const toSvgPoint = (event: React.PointerEvent): Point | null => {
    const matrix = svgRef.current?.getScreenCTM();
    if (!matrix) return null;
    const pt = new DOMPoint(event.clientX, event.clientY).matrixTransform(matrix.inverse());
    return [pt.x, pt.y];
  };

  const follow = (point: Point) => {
    const g = geoRef.current;
    const cp = cpsRef.current[nextRef.current];
    if (!g || !cp) return;
    const next = followPointer(g, pRef.current, cp.p, point);
    if (next !== null) advanceTo(next);
  };

  const onPointerDown = (event: React.PointerEvent<SVGSVGElement>) => {
    const g = geoRef.current;
    if (!g || phaseRef.current !== 'trace' || guideRef.current) return;
    const point = toSvgPoint(event);
    if (!point) return;
    const head = headPoint(g, pRef.current);
    if (Math.hypot(point[0] - head[0], point[1] - head[1]) < grabRadius(g)) {
      draggingRef.current = true;
      try {
        event.currentTarget.setPointerCapture(event.pointerId);
      } catch {
        // Capture is best-effort; tracing still works without it.
      }
      event.preventDefault();
      follow(point);
    } else {
      setHint(content.practice.startHint);
    }
  };

  const onPointerMove = (event: React.PointerEvent<SVGSVGElement>) => {
    if (!draggingRef.current || phaseRef.current !== 'trace') return;
    event.preventDefault();
    const point = toSvgPoint(event);
    if (point) follow(point);
  };

  const onPointerUp = () => {
    draggingRef.current = false;
  };

  /* ---------- render ---------- */

  const onChooseLevel = (id: LevelId) => {
    if (!allowedLevels.includes(id)) {
      track('locked_level_tapped', { level: id });
      setLockedLevel(id);
      return;
    }
    startPractice(id);
  };

  return (
    <div className={cn(styles.root, 'text-foreground')}>
      {screen === 'intro' ? (
        <IntroScreen
          context={context}
          content={content}
          settings={settings}
          settingsOpen={settingsOpen}
          onToggleSettings={() => setSettingsOpen((open) => !open)}
          onChangeSettings={updateSettings}
          onBegin={() => {
            track('begin_clicked', { context });
            setScreen('choose');
          }}
        />
      ) : null}

      {screen === 'choose' ? (
        <ChooseScreen
          content={content}
          context={context}
          allowedLevels={allowedLevels}
          lockedLevel={lockedLevel}
          onBack={() => {
            setLockedLevel(null);
            setScreen('intro');
          }}
          onChoose={onChooseLevel}
        />
      ) : null}

      {screen === 'practice' && run
        ? createPortal(
            <PracticeScreen
              content={content}
              level={level}
              geometry={run.geometry}
              checkpoints={run.checkpoints}
              progress={progress}
              hint={hint}
              guide={guide}
              overlay={overlay}
              svgRef={svgRef}
              stopButtonRef={stopButtonRef}
              onStop={exitPractice}
              onToggleGuide={toggleGuide}
              onSkip={skipPause}
              onPointerDown={onPointerDown}
              onPointerMove={onPointerMove}
              onPointerUp={onPointerUp}
            />,
            document.body,
          )
        : null}

      {screen === 'end' ? (
        <EndScreen
          context={context}
          content={content}
          level={level}
          saveState={saveState}
          headingRef={endHeadingRef}
          onPractiseAgain={() => {
            track('practise_again', { level });
            startPractice(level);
          }}
          onTryAnother={() => setScreen('choose')}
          onAssessmentClick={() => track('assessment_clicked', { level })}
        />
      ) : null}
    </div>
  );
}

/* ================= screens ================= */

function LabyrinthThumb({
  level,
  traced = 0,
  className,
}: {
  level: LevelId;
  traced?: number;
  className?: string;
}) {
  const g = geometryFor(level);
  return (
    <svg viewBox={`0 0 ${VIEWBOX} ${VIEWBOX}`} aria-hidden="true" className={className}>
      <path d={g.d} className={styles.channel} strokeWidth={g.w * 0.62} />
      {traced > 0 ? (
        <path
          d={g.d}
          className={styles.trace}
          strokeWidth={g.w * 0.3}
          strokeDasharray={dash(g.L * traced, g)}
        />
      ) : null}
      <circle cx={CX} cy={CX} r={Math.max(10, g.centreR * 0.55)} className={styles.centre} />
    </svg>
  );
}

function SettingToggle({
  id,
  label,
  help,
  checked,
  onChange,
}: {
  id: string;
  label: string;
  help: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label
      htmlFor={id}
      className="flex cursor-pointer items-start justify-between gap-(--space-sm)"
    >
      <span className="min-w-0">
        <span className="block font-medium">{label}</span>
        <span className="text-muted-foreground block text-sm">{help}</span>
      </span>
      <input
        id={id}
        type="checkbox"
        role="switch"
        aria-checked={checked}
        className={styles.switch}
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
      />
    </label>
  );
}

function IntroScreen({
  context,
  content,
  settings,
  settingsOpen,
  onToggleSettings,
  onChangeSettings,
  onBegin,
}: {
  context: 'public' | 'member';
  content: ReturnPathContent;
  settings: Settings;
  settingsOpen: boolean;
  onToggleSettings: () => void;
  onChangeSettings: (patch: Partial<Settings>) => void;
  onBegin: () => void;
}) {
  const { intro } = content;
  return (
    <div className="flex flex-col gap-(--space-xl)">
      {context === 'public' ? (
        <div className="grid items-center gap-(--space-lg) md:grid-cols-[1fr_240px]">
          <div className="flex flex-col gap-(--space-md)">
            <Eyebrow>{intro.eyebrow}</Eyebrow>
            <Heading as="h1" size="2xl">
              {intro.title}
            </Heading>
            <Text size="lg" className="max-w-[34em]">
              {intro.description}
            </Text>
          </div>
          <LabyrinthThumb
            level={2}
            traced={0.38}
            className="row-start-1 mx-auto w-[min(240px,64vw)] md:col-start-2 md:row-start-auto"
          />
        </div>
      ) : null}

      <ul className="flex max-w-[34em] flex-col gap-(--space-xs)">
        {intro.instructions.map((instruction) => (
          <li key={instruction} className="flex gap-(--space-xs)">
            <span aria-hidden="true">·</span>
            <span>{instruction}</span>
          </li>
        ))}
      </ul>

      <div className="flex flex-wrap items-center gap-(--space-sm)">
        <Button size="lg" onClick={onBegin} className="rounded-full px-8">
          {intro.beginLabel}
        </Button>
        <Button
          size="lg"
          variant="outline"
          className="rounded-full"
          aria-expanded={settingsOpen}
          aria-controls="return-path-settings"
          onClick={onToggleSettings}
        >
          Settings
        </Button>
      </div>

      {settingsOpen ? (
        <div
          id="return-path-settings"
          className="border-border bg-card flex max-w-[34em] flex-col gap-(--space-md) rounded-md border p-(--space-md)"
        >
          <SettingToggle
            id="return-path-pause"
            label={content.settings.gentlePauseLabel}
            help={content.settings.gentlePauseHelp}
            checked={settings.pause}
            onChange={(pause) => onChangeSettings({ pause })}
          />
          <SettingToggle
            id="return-path-no-breath"
            label={content.settings.noBreathLabel}
            help={content.settings.noBreathHelp}
            checked={settings.noBreath}
            onChange={(noBreath) => onChangeSettings({ noBreath })}
          />
        </div>
      ) : null}

      <Text size="sm" tone="muted" className="max-w-[40em]">
        {intro.safetyNote}
      </Text>
    </div>
  );
}

function ChooseScreen({
  content,
  context,
  allowedLevels,
  lockedLevel,
  onBack,
  onChoose,
}: {
  content: ReturnPathContent;
  context: 'public' | 'member';
  allowedLevels: LevelId[];
  lockedLevel: LevelId | null;
  onBack: () => void;
  onChoose: (level: LevelId) => void;
}) {
  return (
    <div className="flex flex-col gap-(--space-lg)">
      <div className="flex items-center justify-between gap-(--space-sm)">
        <Heading as={context === 'public' ? 'h1' : 'h2'} size="lg">
          {content.choose.heading}
        </Heading>
        <Button variant="outline" size="sm" className="rounded-full" onClick={onBack}>
          Back
        </Button>
      </div>

      <ul className="flex flex-col gap-(--space-sm)">
        {LEVEL_IDS.map((id) => {
          const config = LEVELS[id];
          const locked = !allowedLevels.includes(id);
          const tag = locked ? 'Members' : id === 1 ? 'Free' : 'Included';
          return (
            <li key={id}>
              <button
                type="button"
                onClick={() => onChoose(id)}
                className={cn(
                  'border-border bg-card grid w-full grid-cols-[64px_1fr_auto] items-center gap-(--space-sm) rounded-md border p-(--space-sm) text-left',
                  'focus-visible:ring-ring focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none',
                  locked && 'opacity-75',
                )}
              >
                <LabyrinthThumb level={id} className="size-16" />
                <span className="min-w-0">
                  <span className="font-heading block text-xl font-semibold">{config.name}</span>
                  <span className="text-muted-foreground block text-sm">
                    {config.subtitle} · {config.time}
                  </span>
                </span>
                <span
                  className={cn(
                    'rounded-full px-(--space-xs) py-0.5 text-xs font-semibold whitespace-nowrap',
                    locked ? 'border-border text-muted-foreground border' : styles.tag,
                  )}
                >
                  {tag}
                </span>
              </button>
            </li>
          );
        })}
      </ul>

      {lockedLevel ? (
        <div
          role="status"
          className="border-border flex flex-col gap-(--space-xs) rounded-md border p-(--space-md)"
        >
          <Text size="sm">
            {content.choose.lockedMessage.replace('{level}', LEVELS[lockedLevel].name)}
          </Text>
          <NextLink
            href={LOCKED_LEVEL_HREF}
            className="interaction-text-link-underline w-fit text-sm"
          >
            {content.choose.lockedLinkLabel}
          </NextLink>
        </div>
      ) : null}
    </div>
  );
}

function PracticeScreen({
  content,
  level,
  geometry: g,
  checkpoints,
  progress,
  hint,
  guide,
  overlay,
  svgRef,
  stopButtonRef,
  onStop,
  onToggleGuide,
  onSkip,
  onPointerDown,
  onPointerMove,
  onPointerUp,
}: {
  content: ReturnPathContent;
  level: LevelId;
  geometry: LabyrinthGeometry;
  checkpoints: Checkpoint[];
  progress: number;
  hint: string;
  guide: boolean;
  overlay: Overlay | null;
  svgRef: React.RefObject<SVGSVGElement | null>;
  stopButtonRef: React.RefObject<HTMLButtonElement | null>;
  onStop: () => void;
  onToggleGuide: () => void;
  onSkip: () => void;
  onPointerDown: (event: React.PointerEvent<SVGSVGElement>) => void;
  onPointerMove: (event: React.PointerEvent<SVGSVGElement>) => void;
  onPointerUp: () => void;
}) {
  const inLen = Math.min(progress, g.L);
  const outLen = Math.max(0, progress - g.L);
  const head = headPoint(g, progress);
  const returning = progress > g.L;
  const markers = checkpoints.filter((cp) => cp.kind === 'in' || cp.kind === 'out');

  React.useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onStop();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onStop]);

  return (
    <div
      data-return-path-layer=""
      role="dialog"
      aria-modal="true"
      aria-label={LEVELS[level].name}
      className={cn(
        styles.root,
        'bg-background text-foreground fixed inset-0 z-(--z-modal) flex flex-col gap-(--space-xs) px-(--space-md) pt-[max(env(safe-area-inset-top),12px)] pb-[max(env(safe-area-inset-bottom),16px)]',
      )}
    >
      <div className="mx-auto flex w-full max-w-[720px] items-center justify-between gap-(--space-sm)">
        <button
          ref={stopButtonRef}
          type="button"
          onClick={onStop}
          aria-label="Stop the practice"
          className="border-border bg-card focus-visible:ring-ring grid size-10 place-items-center rounded-full border text-lg leading-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
        >
          ✕
        </button>
        <span className="text-muted-foreground text-xs font-semibold tracking-[0.08em] uppercase">
          {LEVELS[level].name}
        </span>
        <button
          type="button"
          onClick={onToggleGuide}
          aria-pressed={guide}
          className={cn(
            'border-border focus-visible:ring-ring rounded-full border px-(--space-sm) py-1.5 text-sm focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none',
            guide ? 'bg-primary text-primary-foreground border-primary' : 'bg-card',
          )}
        >
          Guide me
        </button>
      </div>

      <div
        className={cn(
          styles.progressTrack,
          'mx-auto h-[3px] w-full max-w-[720px] overflow-hidden rounded',
        )}
      >
        <div
          className={cn(styles.progressFill, 'h-full')}
          style={{ width: `${((progress / (2 * g.L)) * 100).toFixed(1)}%` }}
        />
      </div>

      <div className="grid min-h-0 flex-1 place-items-center">
        <div className="relative aspect-square w-[min(100%,calc(100dvh-210px))] max-w-full">
          <svg
            ref={svgRef}
            viewBox={`0 0 ${VIEWBOX} ${VIEWBOX}`}
            role="img"
            aria-label="Labyrinth path to trace"
            className={styles.stage}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerCancel={onPointerUp}
          >
            <path d={g.d} className={styles.channel} strokeWidth={g.w * 0.62} />
            <circle cx={CX} cy={CX} r={Math.max(10, g.centreR * 0.55)} className={styles.centre} />
            {/* Only drawn once they have length: a zero-length dash with a
                round cap would still paint a dot. */}
            {inLen > 0 ? (
              <path
                d={g.d}
                className={styles.trace}
                strokeWidth={g.w * 0.3}
                strokeDasharray={dash(inLen, g)}
              />
            ) : null}
            {outLen > 0 ? (
              <path
                d={g.dRev}
                className={styles.returnTrace}
                strokeWidth={g.w * 0.3}
                strokeDasharray={dash(outLen, g)}
              />
            ) : null}
            {markers.map((cp) => {
              const [x, y] = pointAtLength(g, cp.kind === 'out' ? 2 * g.L - cp.p : cp.p);
              return (
                <circle
                  key={cp.p}
                  cx={x}
                  cy={y}
                  r={Math.max(4.5, g.w * 0.36)}
                  className={cn(
                    styles.marker,
                    cp.kind === 'out' && styles.markerOut,
                    progress >= cp.p - 0.01 && styles.markerDone,
                  )}
                />
              );
            })}
            <circle
              cx={head[0]}
              cy={head[1]}
              r={Math.max(14, g.w * 0.95)}
              className={styles.halo}
            />
            <circle
              cx={head[0]}
              cy={head[1]}
              r={Math.max(6, g.w * 0.42)}
              className={returning ? styles.headReturning : styles.head}
            />
          </svg>

          <div
            className={cn(
              styles.overlay,
              'absolute inset-0 grid place-items-center rounded-full',
              overlay ? 'pointer-events-auto opacity-100' : 'pointer-events-none opacity-0',
            )}
            aria-hidden={!overlay}
          >
            {overlay ? (
              <div className="flex max-w-[80%] flex-col items-center gap-(--space-sm) p-(--space-md) text-center">
                <div className="grid aspect-square w-[min(150px,36vw)] place-items-center">
                  <div
                    className={styles.orb}
                    style={{
                      transform: `scale(${overlay.orbScale})`,
                      opacity: overlay.orbOpacity,
                      transitionDuration: `${overlay.orbSeconds}s`,
                    }}
                  />
                </div>
                <p className="font-heading text-2xl" aria-live="polite">
                  {overlay.cue}
                </p>
                <p
                  className="text-muted-foreground min-h-[1.4em] text-sm tabular-nums"
                  aria-hidden="true"
                >
                  {overlay.count}
                </p>
                <p className="max-w-[22em] text-[15px]" aria-live="polite">
                  {overlay.line}
                </p>
                <button
                  type="button"
                  onClick={onSkip}
                  className="text-muted-foreground p-1 text-sm underline underline-offset-4"
                >
                  {content.checkpoints.continueLabel}
                </button>
              </div>
            ) : null}
          </div>
        </div>
      </div>

      <p
        className="text-muted-foreground mx-auto min-h-[3.2em] max-w-[30em] text-center text-[15px]"
        aria-live="polite"
      >
        {hint}
      </p>
    </div>
  );
}

function EndScreen({
  context,
  content,
  level,
  saveState,
  headingRef,
  onPractiseAgain,
  onTryAnother,
  onAssessmentClick,
}: {
  context: 'public' | 'member';
  content: ReturnPathContent;
  level: LevelId;
  saveState: SaveState;
  headingRef: React.RefObject<HTMLHeadingElement | null>;
  onPractiseAgain: () => void;
  onTryAnother: () => void;
  onAssessmentClick: () => void;
}) {
  const { ending } = content;
  const linkRow =
    'border-border bg-card text-foreground flex items-center justify-between gap-(--space-sm) rounded-md border px-(--space-md) py-(--space-sm) text-left text-[15px] no-underline focus-visible:ring-ring focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none';

  const memberStatus =
    saveState === 'saved'
      ? ` · ${ending.memberSavedLabel}`
      : saveState === 'saving'
        ? ' · Saving…'
        : '';

  return (
    <div className="flex max-w-[34em] flex-col gap-(--space-lg)">
      <Eyebrow>
        {ending.eyebrow}
        {context === 'member' ? memberStatus : ''}
      </Eyebrow>
      <Heading as="h2" size="lg" ref={headingRef} tabIndex={-1} className="outline-none">
        {ending.heading}
      </Heading>
      <Text tone="muted">{ending.line}</Text>

      {context === 'member' && saveState === 'failed' ? (
        <Alert variant="destructive">{ending.memberSaveFailedLabel}</Alert>
      ) : null}

      {context === 'public' ? <EmailCapture content={content} level={level} /> : null}

      <div className="flex flex-col gap-(--space-xs)">
        {context === 'public' ? (
          <>
            <NextLink href={ASSESSMENT_HREF} className={linkRow} onClick={onAssessmentClick}>
              <span>{ending.assessmentLabel}</span>
              <span aria-hidden="true">→</span>
            </NextLink>
            <button type="button" className={linkRow} onClick={onPractiseAgain}>
              <span>{ending.practiseAgainLabel}</span>
              <span aria-hidden="true">→</span>
            </button>
          </>
        ) : (
          <>
            <button type="button" className={linkRow} onClick={onTryAnother}>
              <span>{ending.tryAnotherLabel}</span>
              <span aria-hidden="true">→</span>
            </button>
            <NextLink href={DASHBOARD_HREF} className={linkRow}>
              <span>{ending.backToDashboardLabel}</span>
              <span aria-hidden="true">→</span>
            </NextLink>
          </>
        )}
      </div>
    </div>
  );
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function EmailCapture({ content, level }: { content: ReturnPathContent; level: LevelId }) {
  const { email: copy } = content;
  const [email, setEmail] = React.useState('');
  const [consent, setConsent] = React.useState(false);
  const [status, setStatus] = React.useState<'idle' | 'submitting' | 'done'>('idle');
  const [error, setError] = React.useState<string | null>(null);

  const onSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const value = email.trim();
    if (!EMAIL_PATTERN.test(value)) {
      setError(copy.invalidEmail);
      return;
    }
    if (!consent) {
      setError(copy.consentRequired);
      return;
    }
    setError(null);
    setStatus('submitting');
    const utm = getUtmParams();
    try {
      const response = await fetch('/api/the-return-path/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: value, consent: true, level, utm }),
      });
      if (!response.ok) throw new Error(`status ${response.status}`);
      setStatus('done');
      trackEvent('email_submitted', { source: 'the_return_path', level, ...utm });
    } catch {
      setStatus('idle');
      setError(copy.failure);
    }
  };

  if (status === 'done') {
    return (
      <div role="status" className={cn(styles.tag, 'rounded-md p-(--space-md) text-sm')}>
        {copy.success}
      </div>
    );
  }

  return (
    <form
      noValidate
      onSubmit={onSubmit}
      className="border-border bg-card flex flex-col gap-(--space-sm) rounded-md border p-(--space-md)"
    >
      <p className="font-semibold">{copy.offer}</p>
      <div className="flex flex-col gap-(--space-2xs)">
        <Label htmlFor="return-path-email">{copy.fieldLabel}</Label>
        <Input
          id="return-path-email"
          type="email"
          autoComplete="email"
          inputMode="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          aria-invalid={error === copy.invalidEmail}
          aria-describedby={error ? 'return-path-email-error' : undefined}
        />
      </div>
      <label className="text-muted-foreground flex cursor-pointer items-start gap-(--space-xs) text-sm">
        <Checkbox
          className="mt-0.5"
          checked={consent}
          onCheckedChange={(checked) => setConsent(checked === true)}
          aria-labelledby="return-path-consent"
        />
        <span id="return-path-consent">{copy.consent}</span>
      </label>
      {error ? (
        <p id="return-path-email-error" role="alert" className="text-destructive text-sm">
          {error}
        </p>
      ) : null}
      <Button
        type="submit"
        size="lg"
        className="w-fit rounded-full"
        disabled={status === 'submitting'}
      >
        {status === 'submitting' ? 'Sending…' : copy.buttonLabel}
      </Button>
    </form>
  );
}
