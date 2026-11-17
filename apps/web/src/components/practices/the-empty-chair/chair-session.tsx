'use client';

import * as React from 'react';
import NextLink from 'next/link';
import { useRouter } from 'next/navigation';
import { Pause, Play, X } from 'lucide-react';
import { cn } from '@tnsi/ui';
import type { ResetRoutes } from '../ninety-second-reset/content';
import { ResetBrand, ResetShell } from '../ninety-second-reset/reset-shell';
import styles from '../ninety-second-reset/reset.module.css';
import { CHAIR_AUDIO_SRC, CHAIR_COPY, CHAIR_ROUTES } from './content';
import {
  CHAIR_AUDIO_DURATION_SECONDS,
  CHAIR_STAGES,
  chairProgressAt,
  chairRemainingSeconds,
  chairStageIndexAt,
  formatClock,
} from './timing';

type Status = 'ready' | 'playing' | 'paused';

/** What the browser is doing with the recording itself. */
type LoadState = 'loading' | 'ready' | 'buffering' | 'error';

const RING = { size: 320, radius: 148, stroke: 4 } as const;
const CIRCUMFERENCE = 2 * Math.PI * RING.radius;

/** How long the old words take to leave before the new ones arrive. Matches `.leaving` in reset.module.css. */
const LEAVE_MS = 220;

/** Where a stage boundary sits on the ring, starting at 12 o'clock and running clockwise. */
function pointOnRing(fraction: number) {
  const angle = fraction * Math.PI * 2 - Math.PI / 2;
  return {
    x: RING.size / 2 + RING.radius * Math.cos(angle),
    y: RING.size / 2 + RING.radius * Math.sin(angle),
  };
}

/**
 * Screen 2: the guided practice, driven by the real recording.
 *
 * The recording is the only clock. The ring, elapsed and remaining time and the stage
 * are all read from the audio element's own `currentTime`, so what is shown can never
 * differ from what is heard, whether the position changed by playing, pausing, a seek
 * (media keys, the lock screen) or a background tab catching up. The last stage
 * begins at "As we finish" and runs through the music-only outro. The completion
 * screen opens only when the browser reports that the recording has ENDED; no separate
 * timer can trigger it. Leaving the screen by any route stops the sound. Nothing is
 * recorded or saved from here, and the voice-over's words are not shown.
 */
export function ChairSession({
  routes = CHAIR_ROUTES,
  audioSrc = CHAIR_AUDIO_SRC,
}: {
  routes?: ResetRoutes;
  /** The recording to play. Only tests and previews pass this. */
  audioSrc?: string;
}) {
  const router = useRouter();
  /** The one audio element on the page (rendered below, never created in code), so there can never be two. */
  const audioRef = React.useRef<HTMLAudioElement | null>(null);
  const finished = React.useRef(false);
  /** Whether the recording has ever actually played, so a failed first attempt still reads "Play", not "Resume". */
  const hasPlayed = React.useRef(false);
  const [status, setStatus] = React.useState<Status>('ready');
  const [loadState, setLoadState] = React.useState<LoadState>('loading');
  const [position, setPosition] = React.useState(0);
  const [duration, setDuration] = React.useState(CHAIR_AUDIO_DURATION_SECONDS);

  /** Reads the recording's own clock. The only source of the position shown. */
  const syncPosition = React.useCallback(() => {
    const audio = audioRef.current;
    if (audio) setPosition(audio.currentTime);
  }, []);

  /** Takes the element on mount, and catches up if it loaded (or failed) before React attached its handlers. */
  const attachAudio = React.useCallback((audio: HTMLAudioElement | null) => {
    audioRef.current = audio;
    if (!audio) return;
    if (audio.error) {
      setLoadState('error');
    } else if (audio.readyState >= 1) {
      if (Number.isFinite(audio.duration)) setDuration(audio.duration);
      setLoadState('ready');
    }
  }, []);

  // While playing, follow the recording smoothly. (A background tab stops animation
  // frames but the recording carries on; `timeupdate` and the visibility handler below
  // keep the display honest, and it catches up the moment the tab is visible again.)
  React.useEffect(() => {
    if (status !== 'playing') return;
    let frame = 0;
    const tick = () => {
      syncPosition();
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [status, syncPosition]);

  // Leaving the practice stops the sound: unmounting (exit, back, any navigation) and
  // the page being hidden for good. Listeners are removed with it.
  React.useEffect(() => {
    const audio = audioRef.current;
    const onVisible = () => {
      if (document.visibilityState === 'visible') syncPosition();
    };
    const onPageHide = () => audio?.pause();
    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('pagehide', onPageHide);
    return () => {
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('pagehide', onPageHide);
      audio?.pause();
    };
  }, [syncPosition]);

  const failed = () => {
    setLoadState('error');
    setStatus(hasPlayed.current ? 'paused' : 'ready');
  };

  /** Starts again after an error, from wherever the recording had reached. */
  const retry = () => {
    const audio = audioRef.current;
    if (!audio) return;
    const resumeAt = audio.currentTime;
    setLoadState('loading');
    audio.addEventListener(
      'loadedmetadata',
      () => {
        audio.currentTime = resumeAt;
        void audio.play().catch(failed);
      },
      { once: true },
    );
    audio.load();
  };

  const toggle = async () => {
    const audio = audioRef.current;
    if (!audio || finished.current) return;
    if (loadState === 'error') {
      retry();
      return;
    }
    if (!audio.paused) {
      audio.pause();
      return;
    }
    try {
      await audio.play();
    } catch (error) {
      // A pause that lands while play() is still starting is not a failure.
      if ((error as DOMException | undefined)?.name !== 'AbortError') failed();
    }
  };

  /** The recording finished: the one and only way to the completion screen. */
  const handleEnded = () => {
    if (finished.current) return;
    finished.current = true;
    const audio = audioRef.current;
    setPosition(audio && Number.isFinite(audio.duration) ? audio.duration : duration);
    setStatus('paused');
    router.push(routes.complete);
  };

  const elapsed = position;
  const started = status !== 'ready';
  const stageIndex = chairStageIndexAt(elapsed);
  const progress = chairProgressAt(elapsed, duration);

  /**
   * What the words on screen are showing. It trails the clock by a beat on a stage
   * change: the old words ease out, then the new ones ease in, and a ripple leaves
   * the ring. For people who ask for reduced motion it simply swaps.
   */
  const targetKey = started ? CHAIR_STAGES[stageIndex]!.key : 'ready';
  const [shownKey, setShownKey] = React.useState<string>('ready');
  const [lastTargetKey, setLastTargetKey] = React.useState<string>('ready');
  const [leaving, setLeaving] = React.useState(false);
  const [ripples, setRipples] = React.useState(0);

  // The clock has moved on to a new stage: start the old words leaving (and one ripple).
  // Done while rendering, the pattern React recommends for state that follows a changed value.
  if (targetKey !== lastTargetKey) {
    setLastTargetKey(targetKey);
    setLeaving(true);
    if (targetKey !== 'ready') setRipples((n) => n + 1);
  }

  // ...then, a beat later, swap in the new words. With reduced motion there is no beat.
  React.useEffect(() => {
    if (!leaving) return;
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const timer = window.setTimeout(
      () => {
        setShownKey(targetKey);
        setLeaving(false);
      },
      reduce ? 0 : LEAVE_MS,
    );
    return () => window.clearTimeout(timer);
  }, [leaving, targetKey]);

  const shownIndex = CHAIR_STAGES.findIndex((s) => s.key === shownKey);
  const shownStage = shownIndex >= 0 ? CHAIR_STAGES[shownIndex]! : null;
  const motion = leaving ? styles.leaving : styles.arrive;

  const action = status === 'playing' ? 'pause' : status === 'paused' ? 'resume' : 'play';
  const actionLabel = CHAIR_COPY.session[action];
  const ActionIcon = status === 'playing' ? Pause : Play;

  return (
    <ResetShell>
      {/* The recording. Without `controls` it draws nothing; the screen's own controls drive it. */}
      <audio
        ref={attachAudio}
        src={audioSrc}
        preload="auto"
        onLoadedMetadata={(event) => {
          const length = event.currentTarget.duration;
          if (Number.isFinite(length)) setDuration(length);
          setLoadState('ready');
        }}
        onCanPlay={() => setLoadState('ready')}
        onPlaying={() => {
          hasPlayed.current = true;
          setLoadState('ready');
        }}
        onWaiting={() => setLoadState('buffering')}
        onPlay={() => setStatus('playing')}
        onPause={(event) => {
          // The element also pauses itself on reaching the end; that is `ended`, not a pause.
          if (!event.currentTarget.ended) {
            setStatus('paused');
            syncPosition();
          }
        }}
        onTimeUpdate={syncPosition}
        onSeeked={syncPosition}
        onError={failed}
        onEnded={handleEnded}
      />
      <header className="flex items-center justify-between gap-3">
        <NextLink
          href={routes.practices}
          className="-ml-3 inline-flex min-h-11 items-center gap-1.5 rounded-full px-3 text-sm text-(--rs-ink-soft) hover:text-(--rs-ink) focus-visible:ring-2 focus-visible:ring-(--rs-bronze) focus-visible:outline-none"
        >
          <X aria-hidden className="size-4" />
          {CHAIR_COPY.session.exit}
        </NextLink>

        <div className="hidden sm:block">
          <ResetBrand />
        </div>
      </header>

      <main className="grid flex-1 items-center gap-5 py-3 sm:gap-6 sm:py-6 lg:grid-cols-2 lg:gap-16 lg:py-10">
        {/* The timekeeper: a quiet ring, with the times beneath it. */}
        <div className="mx-auto w-full max-w-[21rem] lg:max-w-[23rem] lg:justify-self-center">
          <div className="relative mx-auto aspect-square max-w-[14.5rem] sm:max-w-[18rem] lg:max-w-none">
            <div
              aria-hidden
              className={cn(
                'absolute inset-[7%] rounded-full bg-(--rs-wash)',
                status === 'playing' ? styles.halo : 'opacity-70',
              )}
            />
            {ripples > 0 ? (
              <span
                key={ripples}
                aria-hidden
                className={cn(
                  'absolute inset-[4%] rounded-full border border-(--rs-bronze)',
                  styles.ripple,
                )}
              />
            ) : null}
            <svg
              viewBox={`0 0 ${RING.size} ${RING.size}`}
              role="progressbar"
              aria-label={CHAIR_COPY.title}
              aria-valuemin={0}
              aria-valuemax={Math.round(duration)}
              aria-valuenow={Math.round(elapsed)}
              aria-valuetext={`${formatClock(elapsed)} of ${formatClock(Math.ceil(duration))}`}
              className="absolute inset-0 size-full"
            >
              <circle
                cx={RING.size / 2}
                cy={RING.size / 2}
                r={RING.radius}
                fill="none"
                stroke="var(--rs-line)"
                strokeWidth={RING.stroke}
              />
              <circle
                cx={RING.size / 2}
                cy={RING.size / 2}
                r={RING.radius}
                fill="none"
                stroke="var(--rs-bronze)"
                strokeWidth={RING.stroke}
                strokeLinecap="round"
                strokeDasharray={CIRCUMFERENCE}
                strokeDashoffset={CIRCUMFERENCE * (1 - progress)}
                transform={`rotate(-90 ${RING.size / 2} ${RING.size / 2})`}
              />
              {CHAIR_STAGES.map((s, i) => {
                const { x, y } = pointOnRing(s.startsAt / duration);
                const reached = started && i <= stageIndex;
                return (
                  <circle
                    key={s.key}
                    cx={x}
                    cy={y}
                    r={5}
                    fill={reached ? 'var(--rs-bronze)' : 'var(--rs-ground)'}
                    stroke={reached ? 'var(--rs-ground)' : 'var(--rs-line)'}
                    strokeWidth={2.5}
                  />
                );
              })}
            </svg>

            <div className="absolute inset-0 flex flex-col items-center justify-center px-[18%] text-center">
              <p className="text-xs font-medium tracking-[0.18em] text-(--rs-ink-soft) uppercase">
                {shownStage
                  ? `Stage ${shownIndex + 1} of ${CHAIR_STAGES.length}`
                  : CHAIR_COPY.durationLabel}
              </p>
              <p
                key={shownKey}
                className={cn(
                  'font-heading mt-1.5 text-xl leading-tight font-medium text-balance text-(--rs-ink) sm:text-2xl',
                  motion,
                )}
              >
                {shownStage ? shownStage.name : CHAIR_COPY.title}
              </p>
            </div>
          </div>

          <div className="mt-3 flex items-baseline justify-between text-sm text-(--rs-ink-soft) tabular-nums sm:mt-4">
            <p>
              <span className="font-medium text-(--rs-ink)">{formatClock(elapsed)}</span>{' '}
              {CHAIR_COPY.session.elapsed}
            </p>
            <p>
              <span className="font-medium text-(--rs-ink)">
                {formatClock(chairRemainingSeconds(elapsed, duration))}
              </span>{' '}
              {CHAIR_COPY.session.remaining}
            </p>
          </div>
        </div>

        {/* The cue is the focus; the controls sit right beneath it. */}
        <div className="mx-auto flex w-full max-w-md flex-col items-center text-center lg:items-start lg:text-left">
          <div aria-live="polite" className="flex min-h-[8.5rem] items-center lg:min-h-[11rem]">
            <p
              key={shownKey}
              className={cn(
                'font-heading text-[2rem] leading-[1.15] font-medium text-balance text-(--rs-ink) sm:text-4xl lg:text-5xl',
                motion,
              )}
            >
              {shownStage ? shownStage.cue : CHAIR_COPY.session.readyHint}
            </p>
          </div>

          <div className="mt-3 flex flex-col items-center gap-2 lg:items-start">
            <button
              type="button"
              onClick={() => void toggle()}
              aria-label={actionLabel}
              className="inline-flex size-20 items-center justify-center rounded-full bg-(--rs-ink) text-(--rs-ground) transition-colors duration-200 hover:bg-(--rs-ink)/90 focus-visible:ring-2 focus-visible:ring-(--rs-bronze) focus-visible:ring-offset-4 focus-visible:ring-offset-(--rs-ground) focus-visible:outline-none"
            >
              <ActionIcon aria-hidden className="size-8" fill="currentColor" />
            </button>
            <span className="text-sm font-medium text-(--rs-ink-soft)">{actionLabel}</span>
          </div>

          <ol aria-label="Stages" className="mt-5 flex w-full max-w-xs gap-1.5">
            {CHAIR_STAGES.map((s, i) => (
              <li
                key={s.key}
                aria-current={started && i === stageIndex ? 'step' : undefined}
                className="flex-1"
              >
                <span
                  className={cn(
                    'block h-1 rounded-full transition-colors duration-700',
                    started && i <= stageIndex ? 'bg-(--rs-bronze)' : 'bg-(--rs-line)',
                  )}
                />
                <span className="sr-only">{s.name}</span>
              </li>
            ))}
          </ol>

          {loadState === 'error' ? (
            <div
              role="alert"
              className="mt-4 flex max-w-xs flex-col items-center gap-1 text-center text-xs leading-relaxed text-(--rs-ink-soft) lg:items-start lg:text-left"
            >
              <p>{CHAIR_COPY.session.audioError}</p>
              <button
                type="button"
                onClick={retry}
                className="min-h-11 rounded-full px-3 text-sm font-medium text-(--rs-ink) underline underline-offset-4 focus-visible:ring-2 focus-visible:ring-(--rs-bronze) focus-visible:outline-none"
              >
                {CHAIR_COPY.session.audioRetry}
              </button>
            </div>
          ) : loadState === 'buffering' && status === 'playing' ? (
            <p role="status" className="mt-4 text-xs leading-relaxed text-(--rs-ink-soft)">
              {CHAIR_COPY.session.audioLoading}
            </p>
          ) : null}
        </div>
      </main>
    </ResetShell>
  );
}
