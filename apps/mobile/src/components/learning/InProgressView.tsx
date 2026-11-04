import { useRouter } from 'expo-router';
import { PrimaryButton } from '@/components/PrimaryButton';
import { describeWhenInline, percentLabel, type LearningIndex } from '@/lib/my-learning';
import type { Practice } from '@/api/types';
import { otherStateLines } from './learning-copy';
import { LearningEmpty } from './LearningEmpty';
import { LearningRow } from './LearningRow';

interface InProgressViewProps {
  /** Already filtered and ordered: see `inProgressPractices`. */
  practices: Practice[];
  index: LearningIndex;
}

/** Practices whose latest session is unfinished, each with a Continue action; the first is the prominent one. */
export function InProgressView({ practices, index }: InProgressViewProps) {
  const router = useRouter();

  if (practices.length === 0) {
    return (
      <LearningEmpty
        title="Nothing in progress yet."
        description="Practices you begin will appear here so you can return when you're ready."
      />
    );
  }

  return (
    <>
      {practices.map((practice, i) => {
        const status = index.statusOf(practice.id);
        const pct = status.inProgressPct ?? 0;
        const lines = [
          `${percentLabel(pct)} complete`,
          status.lastPlayedAt ? `Last played ${describeWhenInline(status.lastPlayedAt)}` : '',
          ...otherStateLines(status, 'in-progress'),
        ].filter(Boolean);
        const open = () =>
          router.push({ pathname: '/practices/[id]', params: { id: practice.id } });

        return (
          <LearningRow
            key={practice.id}
            title={practice.title}
            contentType={practice.contentType}
            thumbnailUrl={practice.thumbnailUrl}
            durationSeconds={practice.durationSeconds}
            lines={lines}
            progress={pct}
            onPress={open}
            accessibilityLabel={`${practice.title.trim()}, ${percentLabel(pct)} complete`}
            action={
              <PrimaryButton
                label="Continue"
                variant={i === 0 ? 'primary' : 'secondary'}
                onPress={open}
                style={{ flex: 1, minHeight: 48 }}
              />
            }
          />
        );
      })}
    </>
  );
}
