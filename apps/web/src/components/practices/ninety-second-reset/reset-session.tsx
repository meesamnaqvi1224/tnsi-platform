'use client';

import * as React from 'react';
import NextLink from 'next/link';
import { useRouter } from 'next/navigation';
import { Pause, Play, ScrollText, X } from 'lucide-react';
import { cn } from '@tnsi/ui';
import { RESET_AUDIO_SRC, RESET_COPY, RESET_ROUTES, type ResetRoutes } from './content';
import { ResetBrand, ResetShell } from './reset-shell';
import styles from './reset.module.css';
import {
  AUDIO_DURATION_SECONDS,
  RESET_STAGES,
  formatClock,
  progressAt,
  remainingSeconds,
  stageIndexAt,
  type ResetStage,
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

/** The words of the stages reached so far. The latest is full strength; earlier ones are softer but still easy to read. */
function Transcript({
  id,
  stages,
  className,
}: {
  id: string;
  stages: readonly ResetStage[];
  className?: string;
}) {
  const scroller = React.useRef<HTMLDivElement>(null);

  // Keep the newest words in view inside a short panel.
  React.useEffect(() => {
    const el = scroller.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [stages.length]);

  return (
    <section
      id={id}
      aria-label={RESET_COPY.session.transcript}
      className={cn('rounded-2xl border border-(--rs-line) bg-(--rs-card) text-left', className)}
    >
      <div ref={scroller} className="h-full overflow-y-auto p-5">
        {stages.length === 0 ? (
          <p className="text-sm text-(--rs-ink-soft)">
            The words appear here as the practice moves on.
          </p>
        ) : (
          <ol className="space-y-4">
            {stages.map((s, i) => {
              const latest = i === stages.length - 1;
              return (
                <li key={s.key}>
                  <p className="text-xs font-medium tracking-[0.18em] text-(--rs-bronze-text) uppercase">
                    {s.name}
                  </p>
                  <p
                    className={cn(
                      'font-heading mt-1 text-xl',
                      latest ? 'text-(--rs-ink)' : 'text-(--rs-ink-soft)',
                    )}
                  >
                    {s.instruction}
                  </p>
                </li>
              );
            })}
          </ol>
        )}
      </div>
    </section>
  );
}

/**
 * Screen 2: the guided practice, driven by the real recording.
 *
 * The recording is the only clock. Every number on screen (the ring, elapsed and
 * remaining time, the stage and the transcript) is read from the audio element's
 * own `currentTime`, so what is shown can never differ from what is heard. Pausing
 * pauses the recording and resuming continues from the same position. The
 * completion screen opens only when the browser reports that the recording has
 * ENDED; no separate timer can trigger it. Leaving the screen by any route stops
 * the sound. Nothing is recorded or saved from here.
 *
 * The instruction is the focus; the ring is the quiet timekeeper beside it. On a
 * phone the transcript takes the ring's place when opened, so it can never cover
 * the controls; on a wide screen it sits under them.
 */
export function ResetSession({
  routes = RESET_ROUTES,
  audioSrc = RESET_AUDIO_SRC,
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
  const [duration, setDuration] = React.useState(AUDIO_DURATION_SECONDS);
  const [transcriptOpen, setTranscriptOpen] = React.useState(false);

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
  const stageIndex = stageIndexAt(elapsed);
  const progress = progressAt(elapsed, duration);
  const reachedStages = started ? RESET_STAGES.slice(0, stageIndex + 1) : [];

  /**
   * What the words on screen are showing. It trails the clock by a beat on a stage
   * change: the old words ease out, then the new ones ease in, and a ripple leaves
   * the ring. For people who ask for reduced motion it simply swaps.
   */
  const targetKey = started ? RESET_STAGES[stageIndex]!.key : 'ready';
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

  const shownIndex = RESET_STAGES.findIndex((s) => s.key === shownKey);
  const shownStage = shownIndex >= 0 ? RESET_STAGES[shownIndex]! : null;
  const motion = leaving ? styles.leaving : styles.arrive;

  const action = status === 'playing' ? 'pause' : status === 'paused' ? 'resume' : 'play';
  const actionLabel = RESET_COPY.session[action];
  const ActionIcon = status === 'playing' ? Pause : Play;

  const headerButton =
    'inline-flex min-h-11 items-center gap-1.5 rounded-full px-3 text-sm text-(--rs-ink-soft) hover:text-(--rs-ink) focus-visible:ring-2 focus-visible:ring-(--rs-bronze) focus-visible:outline-none';

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
        onError={failed}
        onEnded={handleEnded}
      />
      <header className="flex items-center justify-between gap-3">
        <NextLink href={routes.practices} className={cn(headerButton, '-ml-3')}>
          <X aria-hidden className="size-4" />
          {RESET_COPY.session.exit}
        </NextLink>

        <div className="hidden sm:block">
          <ResetBrand />
        </div>

        <button
          type="button"
          onClick={() => setTranscriptOpen((open) => !open)}
          aria-expanded={transcriptOpen}
          aria-controls="reset-transcript-compact reset-transcript-wide"
          className={cn(headerButton, '-mr-3')}
        >
          <ScrollText aria-hidden className="size-4" />
          {transcriptOpen ? RESET_COPY.session.hideTranscript : RESET_COPY.session.transcript}
        </button>
      </header>

      <main className="grid flex-1 items-center gap-5 py-3 sm:gap-6 sm:py-6 lg:grid-cols-2 lg:gap-16 lg:py-10">
        {/* The timekeeper: a quieter ring, with the times beneath it. */}
        <div className="mx-auto w-full max-w-[21rem] lg:max-w-[23rem] lg:justify-self-center">
          <div className={cn(transcriptOpen && 'max-lg:hidden')}>
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
                aria-label={RESET_COPY.title}
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
                {RESET_STAGES.map((s, i) => {
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
                    ? `Stage ${shownIndex + 1} of ${RESET_STAGES.length}`
                    : RESET_COPY.durationLabel}
                </p>
                <p
                  key={shownKey}
                  className={cn(
                    'font-heading mt-1.5 text-2xl leading-tight font-medium text-(--rs-ink) sm:text-3xl',
                    motion,
                  )}
                >
                  {shownStage ? shownStage.name : RESET_COPY.title}
                </p>
              </div>
            </div>
          </div>

          {/* On a phone the transcript stands in for the ring, so the controls below never move. */}
          {transcriptOpen ? (
            <Transcript
              id="reset-transcript-compact"
              stages={reachedStages}
              className="h-[14.5rem] w-full sm:h-[18rem] lg:hidden"
            />
          ) : null}

          <div className="mt-3 flex items-baseline justify-between text-sm text-(--rs-ink-soft) tabular-nums sm:mt-4">
            <p>
              <span className="font-medium text-(--rs-ink)">{formatClock(elapsed)}</span>{' '}
              {RESET_COPY.session.elapsed}
            </p>
            <p>
              <span className="font-medium text-(--rs-ink)">
                {formatClock(remainingSeconds(elapsed, duration))}
              </span>{' '}
              {RESET_COPY.session.remaining}
            </p>
          </div>
        </div>

        {/* The instruction is the focus; the controls sit right beneath it. */}
        <div className="mx-auto flex w-full max-w-md flex-col items-center text-center lg:relative lg:items-start lg:text-left">
          <div aria-live="polite" className="flex min-h-[8.5rem] items-center lg:min-h-[11rem]">
            <p
              key={shownKey}
              className={cn(
                'font-heading text-[2.15rem] leading-[1.15] font-medium text-balance text-(--rs-ink) sm:text-5xl lg:text-5xl',
                motion,
              )}
            >
              {shownStage ? shownStage.instruction : RESET_COPY.session.readyHint}
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
            {RESET_STAGES.map((s, i) => (
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
              <p>{RESET_COPY.session.audioError}</p>
              <button
                type="button"
                onClick={retry}
                className="min-h-11 rounded-full px-3 text-sm font-medium text-(--rs-ink) underline underline-offset-4 focus-visible:ring-2 focus-visible:ring-(--rs-bronze) focus-visible:outline-none"
              >
                {RESET_COPY.session.audioRetry}
              </button>
            </div>
          ) : loadState === 'buffering' && status === 'playing' ? (
            <p role="status" className="mt-4 text-xs leading-relaxed text-(--rs-ink-soft)">
              {RESET_COPY.session.audioLoading}
            </p>
          ) : null}

          {/* On a wide screen the transcript hangs below the controls without changing the column's height, so nothing above it moves. */}
          {transcriptOpen ? (
            <Transcript
              id="reset-transcript-wide"
              stages={reachedStages}
              className="mt-6 hidden max-h-72 w-full lg:absolute lg:top-full lg:right-0 lg:left-0 lg:block"
            />
          ) : null}
        </div>
      </main>
    </ResetShell>
  );
}
