import { useCallback, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { ScreenContainer, ErrorNotice, ThemedText } from '@/components';
import { PracticeThumbnail } from '@/components/practices/PracticeThumbnail';
import { PracticeDetailSkeleton } from '@/components/practices/PracticeDetailSkeleton';
import { AudioPlayer } from '@/components/practices/AudioPlayer';
import { VideoPlayer } from '@/components/practices/VideoPlayer';
import { ExternalMediaNotice } from '@/components/practices/ExternalMediaNotice';
import { CompletionBanner, MarkCompleteButton } from '@/components/practices/CompletionSection';
import { usePracticeDetail } from '@/hooks/usePracticeDetail';
import { resolveMediaKind } from '@/lib/media';
import { capitalize, formatDuration } from '@/lib/format';
import { colors, spacing } from '@/theme';

export default function PracticeDetailScreen() {
  const params = useLocalSearchParams<{ id: string }>();
  const id = Array.isArray(params.id) ? params.id[0] : params.id;
  const { state, reload, submitCompletion } = usePracticeDetail(id);
  const [submitting, setSubmitting] = useState(false);
  // Bumped to force the audio/video player to fully remount (a fresh
  // native player instance, a fresh load attempt) when the member taps
  // "Try Again" after a playback error.
  const [mediaAttempt, setMediaAttempt] = useState(0);

  const handleMarkComplete = useCallback(async () => {
    if (submitting) return;
    setSubmitting(true);
    try {
      await submitCompletion({ completed: true, progressPct: 1 });
    } catch {
      // The completion request failed; the practice stays in its current
      // state and the button remains available to try again. No separate
      // error banner - a calm, silent retry-by-tapping-again is enough for
      // a low-stakes action like this.
    } finally {
      setSubmitting(false);
    }
  }, [submitCompletion, submitting]);

  const handlePlaybackComplete = useCallback(() => {
    submitCompletion({ completed: true, progressPct: 1 }).catch(() => {
      // Best-effort: playback already finished for the user regardless of
      // whether this save succeeds; a failed save just means the
      // "complete" state won't be reflected until they revisit the screen.
    });
  }, [submitCompletion]);

  // Saves the member's last playback position when they leave an
  // unfinished practice, so it can resume from there next time - reusing
  // the existing progressPct/positionSeconds fields the completion API
  // already accepts (see PracticeCompletionInput). `playCount` is passed
  // through unchanged so a position save is never mistaken for a new play
  // - only real completions (handlePlaybackComplete/handleMarkComplete)
  // advance it, exactly as before this change.
  //
  // `positionSeconds <= 1` is treated as "didn't actually play" and
  // skipped entirely - opening a practice and leaving without pressing
  // play (or reopening an already-completed one without playing) must not
  // create or overwrite a practice_completions row. This mirrors the same
  // threshold the resume logic already uses.
  const handleProgress = useCallback(
    (positionSeconds: number, durationSeconds: number) => {
      if (state.status !== 'success' || durationSeconds <= 0 || positionSeconds <= 1) return;
      const progressPct = Math.min(1, Math.max(0, positionSeconds / durationSeconds));
      submitCompletion({
        progressPct,
        positionSeconds: Math.round(positionSeconds),
        playCount: state.practice.progress?.playCount ?? 0,
      }).catch(() => {
        // Best-effort: the member is already navigating away; a failed
        // save just means resume-from-position won't be available next
        // time, not a broken experience now.
      });
    },
    [state, submitCompletion],
  );

  const handleMediaRetry = useCallback(() => {
    setMediaAttempt((attempt) => attempt + 1);
  }, []);

  if (state.status === 'loading') {
    return (
      <ScreenContainer scroll>
        <PracticeDetailSkeleton />
      </ScreenContainer>
    );
  }

  if (state.status === 'not-found') {
    return (
      <ScreenContainer>
        <ThemedText variant="heading">This practice isn&apos;t available.</ThemedText>
        <ThemedText variant="body" color={colors.charcoal} style={styles.notFoundBody}>
          It may have been removed or is no longer published.
        </ThemedText>
      </ScreenContainer>
    );
  }

  if (state.status === 'error') {
    return (
      <ScreenContainer>
        <ErrorNotice message={state.message} onRetry={reload} />
      </ScreenContainer>
    );
  }

  const { practice } = state;
  const title = practice.title.trim();
  const meta = [capitalize(practice.contentType)];
  if (practice.durationSeconds) meta.push(formatDuration(practice.durationSeconds));
  if (practice.category) meta.push(practice.category);

  const mediaKind = resolveMediaKind(practice.mediaUrl, practice.contentType);
  const completed = practice.progress?.completed ?? false;

  return (
    <ScreenContainer scroll>
      {practice.thumbnailUrl ? (
        <PracticeThumbnail
          thumbnailUrl={practice.thumbnailUrl}
          contentType={practice.contentType}
          height={220}
          style={styles.hero}
        />
      ) : null}

      <ThemedText variant="display" style={styles.title}>
        {title}
      </ThemedText>
      <ThemedText variant="caption" color={colors.charcoal} style={styles.meta}>
        {meta.join(' · ')}
      </ThemedText>

      {practice.description ? (
        <ThemedText variant="body" style={styles.description}>
          {practice.description}
        </ThemedText>
      ) : null}

      {mediaKind === 'audio' && practice.mediaUrl ? (
        <AudioPlayer
          key={mediaAttempt}
          uri={practice.mediaUrl}
          initialPositionSeconds={completed ? 0 : (practice.progress?.positionSeconds ?? 0)}
          onComplete={handlePlaybackComplete}
          onProgress={handleProgress}
          onRetry={handleMediaRetry}
        />
      ) : null}
      {mediaKind === 'video' && practice.mediaUrl ? (
        <VideoPlayer
          key={mediaAttempt}
          uri={practice.mediaUrl}
          initialPositionSeconds={completed ? 0 : (practice.progress?.positionSeconds ?? 0)}
          onComplete={handlePlaybackComplete}
          onProgress={handleProgress}
          onRetry={handleMediaRetry}
        />
      ) : null}
      {mediaKind === 'external' && practice.mediaUrl ? (
        <ExternalMediaNotice mediaUrl={practice.mediaUrl} />
      ) : null}

      <View style={styles.completionArea}>
        {completed ? (
          <CompletionBanner />
        ) : mediaKind === 'audio' || mediaKind === 'video' ? null : (
          <MarkCompleteButton submitting={submitting} onPress={handleMarkComplete} />
        )}
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  hero: {
    marginBottom: spacing.lg,
  },
  title: {
    marginBottom: spacing.xs,
  },
  meta: {
    marginBottom: spacing.lg,
  },
  description: {
    marginBottom: spacing.lg,
  },
  completionArea: {
    marginBottom: spacing.xl,
  },
  notFoundBody: {
    marginTop: spacing.sm,
  },
});
