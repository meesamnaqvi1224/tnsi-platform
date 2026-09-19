'use client';

import * as React from 'react';

export interface PracticePlayerProps {
  practiceId: string;
  mediaUrl: string;
  mediaKind: 'audio' | 'video';
  thumbnailUrl?: string | null;
  initialPlayCount: number;
  /** Saved position from a previous session, in seconds. 0 if there is none. */
  initialPositionSeconds: number;
  /** An already-completed practice always starts from the beginning. */
  completed: boolean;
  /** Called once, the first time playback reaches the end, with the id of the now-completed session - lets a parent (see PracticeExperience) react to completion, and attach a reflection to the right session, without this component knowing anything about what happens after. Never called for a manual "Mark as Complete" - that's PracticeCompleteButton's own `onCompleted`. */
  onCompleted?: (completionId: string) => void;
}

/**
 * Minimum time between two `onTimeUpdate`-driven progress saves.
 * `onTimeUpdate` fires several times a second — saving on every tick would
 * spam `/complete` for no benefit; a listener's exact position to the
 * second isn't meaningful at that resolution anyway.
 */
const PROGRESS_SAVE_INTERVAL_MS = 15_000;

/**
 * Native `<audio>`/`<video>` player that persists playback progress to the
 * existing `POST /api/v1/practices/[id]/complete` endpoint — no new
 * endpoint, no schema change. Only used for native media; the Google Drive
 * iframe path (apps/web/src/lib/practices.ts's `toGoogleDriveEmbedUrl`)
 * exposes no playback events to hook into, so it isn't wrapped by this and
 * keeps rendering as a plain iframe.
 *
 * `playCount` is deliberately tracked client-side and sent explicitly on
 * every save after the first: the `/complete` route auto-increments
 * `playCount` only when the field is *omitted* from the request body (see
 * its own logic), which is the right behavior for "a play started" but
 * would silently inflate the count if every throttled progress save also
 * omitted it.
 */
export function PracticePlayer({
  practiceId,
  mediaUrl,
  mediaKind,
  thumbnailUrl,
  initialPlayCount,
  initialPositionSeconds,
  completed,
  onCompleted,
}: PracticePlayerProps) {
  const mediaRef = React.useRef<HTMLAudioElement | HTMLVideoElement>(null);
  const lastSavedAtRef = React.useRef(0);
  const playCountRef = React.useRef(initialPlayCount);
  const hasCountedPlayRef = React.useRef(false);
  const [hasError, setHasError] = React.useState(false);
  // Bumped on retry to force the <audio>/<video> element to remount (a
  // fresh element, a fresh load attempt) - matching the same pattern the
  // native app's AudioPlayer/VideoPlayer already use for their own retry.
  const [attempt, setAttempt] = React.useState(0);

  function handleRetry() {
    setHasError(false);
    setAttempt((a) => a + 1);
  }

  /**
   * Seeks to the saved position once the browser knows the media's
   * duration (seeking any earlier has no effect). Deliberately does
   * nothing — rather than clamping or erroring — for every case where
   * resuming wouldn't make sense: no saved position, a zero/negative value,
   * a completed practice (always restarts from the beginning), an unknown
   * duration, or a saved position at/past the end (stale data from before
   * the file's real duration was known, e.g. after the source media
   * changed).
   */
  function handleLoadedMetadata() {
    const media = mediaRef.current;
    if (!media || completed) return;
    if (!initialPositionSeconds || initialPositionSeconds <= 0) return;
    if (!Number.isFinite(media.duration) || media.duration <= 0) return;
    if (initialPositionSeconds >= media.duration) return;
    media.currentTime = initialPositionSeconds;
  }

  /**
   * Returns the saved completion row's `id` on success, `null` on
   * failure - `handleEnded` below needs it to tell its parent which
   * session a reflection should attach to; every other caller here
   * ignores the return value the same "best-effort" way this always
   * worked.
   */
  const persistProgress = React.useCallback(
    async (
      overrides: { completed?: boolean; progressPct?: number } = {},
    ): Promise<string | null> => {
      const media = mediaRef.current;
      if (!media) return null;

      const positionSeconds = Math.floor(media.currentTime);
      const progressPct =
        overrides.progressPct ??
        (Number.isFinite(media.duration) && media.duration > 0
          ? Math.min(1, media.currentTime / media.duration)
          : 0);

      try {
        const res = await fetch(`/api/v1/practices/${practiceId}/complete`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            positionSeconds,
            progressPct,
            playCount: playCountRef.current,
            ...(overrides.completed !== undefined ? { completed: overrides.completed } : {}),
          }),
        });
        if (!res.ok) return null;
        const json = (await res.json()) as { data?: { id?: string } };
        return json.data?.id ?? null;
      } catch {
        // Best-effort: a dropped progress save isn't worth surfacing to the
        // listener mid-practice. The next throttled tick (or onEnded) will
        // simply try again with a more current position.
        return null;
      }
    },
    [practiceId],
  );

  function handlePlay() {
    if (hasCountedPlayRef.current) return;
    hasCountedPlayRef.current = true;
    playCountRef.current += 1;

    // Omitting `playCount` here is deliberate — this is the one save per
    // mount that should use the endpoint's own auto-increment rather than
    // the locally-tracked value, so the two stay in sync.
    const media = mediaRef.current;
    void fetch(`/api/v1/practices/${practiceId}/complete`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ positionSeconds: media ? Math.floor(media.currentTime) : 0 }),
    }).catch(() => {});
  }

  function handleTimeUpdate() {
    const now = Date.now();
    if (now - lastSavedAtRef.current < PROGRESS_SAVE_INTERVAL_MS) return;
    lastSavedAtRef.current = now;
    void persistProgress();
  }

  function handlePause() {
    // A natural end already fires `onEnded`, which persists the completed
    // state itself — a `pause` that follows it (some browsers fire both)
    // must not overwrite that with a plain, not-completed progress save.
    if (mediaRef.current?.ended) return;
    void persistProgress();
  }

  function handleEnded() {
    void persistProgress({ completed: true, progressPct: 1 }).then((completionId) => {
      if (completionId) onCompleted?.(completionId);
    });
  }

  if (hasError) {
    return (
      <div className="border-border/80 bg-background flex flex-col gap-(--space-md) rounded-sm border p-(--space-lg)">
        <p className="text-sm">
          This {mediaKind} couldn&apos;t be loaded. Please check your connection and try again.
        </p>
        <button
          type="button"
          onClick={handleRetry}
          className="interaction-text-link-underline w-fit text-sm font-medium"
        >
          Try Again
        </button>
      </div>
    );
  }

  if (mediaKind === 'video') {
    return (
      <video
        key={attempt}
        ref={mediaRef as React.RefObject<HTMLVideoElement>}
        controls
        src={mediaUrl}
        poster={thumbnailUrl ?? undefined}
        className="w-full rounded-sm"
        onLoadedMetadata={handleLoadedMetadata}
        onPlay={handlePlay}
        onTimeUpdate={handleTimeUpdate}
        onPause={handlePause}
        onEnded={handleEnded}
        onError={() => setHasError(true)}
      >
        Your browser does not support the video element.
      </video>
    );
  }

  return (
    <audio
      key={attempt}
      ref={mediaRef as React.RefObject<HTMLAudioElement>}
      controls
      src={mediaUrl}
      className="w-full"
      onLoadedMetadata={handleLoadedMetadata}
      onPlay={handlePlay}
      onTimeUpdate={handleTimeUpdate}
      onPause={handlePause}
      onEnded={handleEnded}
      onError={() => setHasError(true)}
    >
      Your browser does not support the audio element.
    </audio>
  );
}
