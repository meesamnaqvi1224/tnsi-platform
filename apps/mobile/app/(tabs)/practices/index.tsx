import { useMemo, useState } from 'react';
import { StyleSheet } from 'react-native';
import { ScreenContainer, ErrorNotice, ThemedText } from '@/components';
import { PracticeCard } from '@/components/practices/PracticeCard';
import { PracticeFilterBar } from '@/components/practices/PracticeFilterBar';
import { PracticesSkeleton } from '@/components/practices/PracticesSkeleton';
import { usePractices } from '@/hooks/usePractices';
import { colors, spacing } from '@/theme';
import type { PracticeContentType } from '@/api/types';

/**
 * The Practices Library. Fetches GET /api/v1/practices once; filtering by
 * content type happens client-side against that already-fetched list (see
 * usePractices) rather than re-querying per tap.
 */
export default function PracticesScreen() {
  const { state, reload } = usePractices();
  const [filter, setFilter] = useState<PracticeContentType | null>(null);

  const practices = useMemo(() => (state.status === 'success' ? state.practices : []), [state]);

  const availableTypes = useMemo(() => {
    const seen = new Set<PracticeContentType>();
    for (const practice of practices) seen.add(practice.contentType);
    return Array.from(seen);
  }, [practices]);

  const filtered = filter ? practices.filter((p) => p.contentType === filter) : practices;

  return (
    <ScreenContainer scroll>
      <ThemedText variant="display" style={styles.heading}>
        Practices
      </ThemedText>
      <ThemedText variant="body" color={colors.charcoal} style={styles.subtitle}>
        A library of practices to support your nervous system.
      </ThemedText>

      {state.status === 'loading' && <PracticesSkeleton />}

      {state.status === 'error' && <ErrorNotice message={state.message} onRetry={reload} />}

      {state.status === 'success' && (
        <>
          <PracticeFilterBar
            availableTypes={availableTypes}
            selected={filter}
            onSelect={setFilter}
          />

          {filtered.length === 0 ? (
            <ThemedText variant="body" color={colors.charcoal}>
              {practices.length === 0
                ? 'No practices are available yet.'
                : 'No practices match this filter.'}
            </ThemedText>
          ) : (
            filtered.map((practice) => <PracticeCard key={practice.id} practice={practice} />)
          )}
        </>
      )}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  heading: {
    marginBottom: spacing.sm,
  },
  subtitle: {
    marginBottom: spacing.xl,
  },
});
