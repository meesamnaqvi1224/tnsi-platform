import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { ScreenContainer, ErrorNotice, PageHeader, ThemedText } from '@/components';
import { PracticeCard } from '@/components/practices/PracticeCard';
import { PracticeFilterBar } from '@/components/practices/PracticeFilterBar';
import { PracticesSkeleton } from '@/components/practices/PracticesSkeleton';
import { PowerDropsEntryCard } from '@/components/powerdrops/PowerDropsEntryCard';
import { SomaticCardsEntryCard } from '@/components/somatic-cards/SomaticCardsEntryCard';
import { usePractices } from '@/hooks/usePractices';
import { colors, spacing } from '@/theme';
import type { PracticeContentType } from '@/api/types';

/**
 * The Practices Library. Fetches GET /api/v1/practices once; filtering by
 * content type happens client-side against that already-fetched list (see
 * usePractices) rather than re-querying per tap.
 */
export default function PracticesScreen() {
  const router = useRouter();
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
      <PageHeader
        eyebrow="Practices"
        title="A library of practices to support your nervous system."
      />

      <View style={styles.linkRow}>
        <Pressable
          onPress={() => router.push('/practices/saved')}
          accessibilityRole="link"
          accessibilityLabel="View Saved Practices"
        >
          <ThemedText variant="label" color={colors.bronze}>
            Saved →
          </ThemedText>
        </Pressable>
        <Pressable
          onPress={() => router.push('/practices/journey')}
          accessibilityRole="link"
          accessibilityLabel="View My Journey"
        >
          <ThemedText variant="label" color={colors.bronze}>
            My Journey →
          </ThemedText>
        </Pressable>
        <Pressable
          onPress={() => router.push('/practices/history')}
          accessibilityRole="link"
          accessibilityLabel="View Practice History"
        >
          <ThemedText variant="label" color={colors.bronze}>
            Practice History →
          </ThemedText>
        </Pressable>
      </View>

      <PowerDropsEntryCard />
      <SomaticCardsEntryCard />

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
  linkRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'flex-end',
    gap: spacing.md,
    marginBottom: spacing.md,
  },
});
