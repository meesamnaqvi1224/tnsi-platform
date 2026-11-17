import { useRouter } from 'expo-router';
import { PrimaryButton } from '@/components/PrimaryButton';
import {
  formatLearningDate,
  percentLabel,
  type CompletedItem,
  type LearningIndex,
} from '@/lib/my-learning';
import { otherStateLines } from './learning-copy';
import { HistoryLinks } from './HistoryLinks';
import { LearningEmpty } from './LearningEmpty';
import { LearningRow } from './LearningRow';

interface CompletedViewProps {
  /** Distinct practices completed at least once: see `completedEver`. */
  items: CompletedItem[];
  index: LearningIndex;
  /** Practice History is paged: more sessions (and so possibly more practices) may not be loaded yet. */
  hasMore: boolean;
  loadingMore: boolean;
  onLoadMore: () => void;
}

/**
 * Each practice the member has completed at least once, kept here even if they later restarted
 * it. Individual sessions, reflections and check-ins live on in Practice History and My Journey.
 */
export function CompletedView({
  items,
  index,
  hasMore,
  loadingMore,
  onLoadMore,
}: CompletedViewProps) {
  const router = useRouter();

  return (
    <>
      {items.length === 0 ? (
        <LearningEmpty
          title="Nothing completed yet."
          description="Completed practices will appear here as you build your practice library."
        />
      ) : (
        items.map((item) => {
          const status = index.statusOf(item.id);
          const date = formatLearningDate(item.completedAt);
          const times =
            item.sessions > 1 ? `Completed ${item.sessions}${hasMore ? '+' : ''} times` : '';
          const restarted =
            status.inProgressPct !== null
              ? `Started again · ${percentLabel(status.inProgressPct)}`
              : '';
          const lines = [
            date ? `Last completed ${date}` : 'Completed',
            times,
            restarted,
            ...otherStateLines(status, 'completed'),
          ].filter(Boolean);
          const open = () => router.push({ pathname: '/practices/[id]', params: { id: item.id } });

          return (
            <LearningRow
              key={item.id}
              title={item.title}
              contentType={item.contentType}
              thumbnailUrl={item.thumbnailUrl}
              durationSeconds={item.durationSeconds}
              lines={lines}
              progress={status.inProgressPct}
              onPress={open}
              accessibilityLabel={`${item.title.trim()}, completed${date ? ` ${date}` : ''}`}
              action={
                status.inProgressPct !== null ? (
                  <PrimaryButton
                    label="Continue"
                    variant="secondary"
                    onPress={open}
                    style={{ flex: 1, minHeight: 48 }}
                  />
                ) : undefined
              }
            />
          );
        })
      )}

      {hasMore ? (
        <PrimaryButton
          label={loadingMore ? 'Loading…' : 'Show earlier completions'}
          variant="secondary"
          onPress={onLoadMore}
          loading={loadingMore}
          style={{ marginTop: 24 }}
        />
      ) : null}

      <HistoryLinks />
    </>
  );
}
