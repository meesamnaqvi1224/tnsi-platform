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
        <AudioPlayer uri={practice.mediaUrl} onComplete={handlePlaybackComplete} />
      ) : null}
      {mediaKind === 'video' && practice.mediaUrl ? (
        <VideoPlayer uri={practice.mediaUrl} onComplete={handlePlaybackComplete} />
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
