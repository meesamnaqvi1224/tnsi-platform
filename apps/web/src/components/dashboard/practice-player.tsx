'use client';

import * as React from 'react';

export interface PracticePlayerProps {
  practiceId: string;
  mediaUrl: string;
  mediaKind: 'audio' | 'video';
  thumbnailUrl?: string | null;
  initialPlayCount: number;
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
}: PracticePlayerProps) {
  const mediaRef = React.useRef<HTMLAudioElement | HTMLVideoElement>(null);
  const lastSavedAtRef = React.useRef(0);
  const playCountRef = React.useRef(initialPlayCount);
  const hasCountedPlayRef = React.useRef(false);

  const persistProgress = React.useCallback(
    (overrides: { completed?: boolean; progressPct?: number } = {}) => {
      const media = mediaRef.current;
      if (!media) return;

      const positionSeconds = Math.floor(media.currentTime);
      const progressPct =
        overrides.progressPct ??
        (Number.isFinite(media.duration) && media.duration > 0
          ? Math.min(1, media.currentTime / media.duration)
          : 0);

      void fetch(`/api/v1/practices/${practiceId}/complete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          positionSeconds,
          progressPct,
          playCount: playCountRef.current,
          ...(overrides.completed !== undefined ? { completed: overrides.completed } : {}),
        }),
      }).catch(() => {
        // Best-effort: a dropped progress save isn't worth surfacing to the
        // listener mid-practice. The next throttled tick (or onEnded) will
        // simply try again with a more current position.
      });
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
    persistProgress();
  }

  function handlePause() {
    // A natural end already fires `onEnded`, which persists the completed
    // state itself — a `pause` that follows it (some browsers fire both)
    // must not overwrite that with a plain, not-completed progress save.
    if (mediaRef.current?.ended) return;
    persistProgress();
  }

  function handleEnded() {
    persistProgress({ completed: true, progressPct: 1 });
  }

  if (mediaKind === 'video') {
    return (
      <video
        ref={mediaRef as React.RefObject<HTMLVideoElement>}
        controls
        src={mediaUrl}
        poster={thumbnailUrl ?? undefined}
        className="w-full rounded-sm"
        onPlay={handlePlay}
        onTimeUpdate={handleTimeUpdate}
        onPause={handlePause}
        onEnded={handleEnded}
      >
        Your browser does not support the video element.
      </video>
    );
  }

  return (
    <audio
      ref={mediaRef as React.RefObject<HTMLAudioElement>}
      controls
      src={mediaUrl}
      className="w-full"
      onPlay={handlePlay}
      onTimeUpdate={handleTimeUpdate}
      onPause={handlePause}
      onEnded={handleEnded}
    >
      Your browser does not support the audio element.
    </audio>
  );
}
