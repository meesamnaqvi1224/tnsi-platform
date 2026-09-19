'use client';

import * as React from 'react';
import { Divider, Eyebrow, Stack, Text } from '@tnsi/ui';
import { PracticeCompleteButton } from './practice-complete-button';
import { PracticePlayer } from './practice-player';
import { PostPracticeReflection } from './post-practice-reflection';

type ResponseValue = 'DIFFERENT' | 'SAME' | 'NOT_SURE';

interface PracticeExperienceProps {
  practiceId: string;
  driveEmbedUrl: string | null;
  driveEmbedTitle: string;
  mediaUrl: string | null;
  mediaKind: 'audio' | 'video' | null;
  thumbnailUrl: string | null;
  initialPlayCount: number;
  initialPositionSeconds: number;
  initialCompleted: boolean;
  /** The current session's id - always set together with `initialCompleted: true` (same source row, see page.tsx), never null in that case. */
  initialCompletionId: string | null;
  initialProgressPct: number;
  initialReflection: { response: ResponseValue | null; reflection: string | null } | null;
}

/**
 * Owns the one piece of state the player, the complete button, and the
 * reflection step all need to agree on: whether this practice is
 * complete. Everything else stays exactly as separated as it already
 * was - PracticePlayer still owns playback/progress/completion-detection
 * end to end, PracticeCompleteButton still owns the manual completion
 * call, PostPracticeReflection still owns the reflection save. This
 * component's only job is swapping between "show the complete action" and
 * "show the reflection" the instant either path reports completion,
 * without either of them needing to know about the other.
 *
 * The Google Drive iframe path exposes no playback events (see page.tsx's
 * own comment on `toGoogleDriveEmbedUrl`), so it can't call `onCompleted`
 * itself - a member watching via Drive still reaches the reflection step
 * through the same "Mark as Complete" action as someone with no media at
 * all.
 */
export function PracticeExperience({
  practiceId,
  driveEmbedUrl,
  driveEmbedTitle,
  mediaUrl,
  mediaKind,
  thumbnailUrl,
  initialPlayCount,
  initialPositionSeconds,
  initialCompleted,
  initialCompletionId,
  initialProgressPct,
  initialReflection,
}: PracticeExperienceProps) {
  const [completed, setCompleted] = React.useState(initialCompleted);
  const [completionId, setCompletionId] = React.useState(initialCompletionId);

  function handleCompleted(id: string) {
    setCompletionId(id);
    setCompleted(true);
  }

  return (
    <>
      {driveEmbedUrl ? (
        <iframe
          src={driveEmbedUrl}
          className="aspect-video w-full rounded-sm"
          allow="autoplay"
          title={driveEmbedTitle}
        />
      ) : mediaUrl && mediaKind ? (
        <PracticePlayer
          practiceId={practiceId}
          mediaUrl={mediaUrl}
          mediaKind={mediaKind}
          thumbnailUrl={thumbnailUrl}
          initialPlayCount={initialPlayCount}
          initialPositionSeconds={initialPositionSeconds}
          completed={completed}
          onCompleted={handleCompleted}
        />
      ) : null}

      <Divider />

      <Stack gap="lg">
        <Eyebrow>Practice</Eyebrow>
        {!completed && initialProgressPct > 0 ? (
          <Text role="status" tone="muted" size="sm">
            {Math.round(initialProgressPct * 100)}% complete
          </Text>
        ) : null}
        {completed && completionId ? (
          <PostPracticeReflection
            practiceId={practiceId}
            completionId={completionId}
            initialReflection={initialReflection}
          />
        ) : (
          <PracticeCompleteButton practiceId={practiceId} onCompleted={handleCompleted} />
        )}
      </Stack>
    </>
  );
}
