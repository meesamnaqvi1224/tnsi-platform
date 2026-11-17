import { useRouter } from 'expo-router';
import { ThemedText } from '@/components/ThemedText';
import { colors, spacing } from '@/theme';
import { describeWhenInline, percentLabel, type LearningIndex } from '@/lib/my-learning';
import type { SavedPractice } from '@/api/types';
import { otherStateLines } from './learning-copy';
import { LearningEmpty } from './LearningEmpty';
import { LearningRow } from './LearningRow';
import { RemoveSavedButton } from './RemoveSavedButton';

interface SavedViewProps {
  /** Saved practices not yet removed this visit. */
  practices: SavedPractice[];
  index: LearningIndex;
  /** The practice whose removal request is in flight, if any. */
  pendingId: string | null;
  onRemove: (practice: SavedPractice) => void;
  /** A calm message when the last removal or undo failed. */
  errorMessage: string | null;
}

/**
 * Bookmarked practices, whatever their completion state: a saved practice can also be in progress
 * or completed, and unsaving only removes it from here (see src/lib/saved-removal.ts).
 */
export function SavedView({ practices, index, pendingId, onRemove, errorMessage }: SavedViewProps) {
  const router = useRouter();

  const error = errorMessage ? (
    <ThemedText
      variant="body"
      color={colors.error}
      accessibilityLiveRegion="polite"
      style={{ marginBottom: spacing.md }}
    >
      {errorMessage}
    </ThemedText>
  ) : null;

  if (practices.length === 0) {
    return (
      <>
        {error}
        <LearningEmpty
          title="No saved practices yet"
          description="Save practices you want to come back to later."
        />
      </>
    );
  }

  return (
    <>
      {error}
      {practices.map((practice) => {
        const status = index.statusOf(practice.id);
        const lines = [
          status.inProgressPct !== null
            ? `In progress · ${percentLabel(status.inProgressPct)}`
            : '',
          status.lastPlayedAt && status.inProgressPct !== null
            ? `Last played ${describeWhenInline(status.lastPlayedAt)}`
            : '',
          ...otherStateLines({ ...status, saved: false }, 'saved'),
        ].filter(Boolean);

        return (
          <LearningRow
            key={practice.id}
            title={practice.title}
            contentType={practice.contentType}
            thumbnailUrl={practice.thumbnailUrl}
            durationSeconds={practice.durationSeconds}
            lines={lines}
            progress={status.inProgressPct}
            onPress={() =>
              router.push({ pathname: '/practices/[id]', params: { id: practice.id } })
            }
            accessibilityLabel={practice.title.trim()}
            action={
              <RemoveSavedButton
                title={practice.title}
                pending={pendingId === practice.id}
                disabled={pendingId !== null}
                onPress={() => onRemove(practice)}
              />
            }
          />
        );
      })}
    </>
  );
}
