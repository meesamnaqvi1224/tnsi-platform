import { useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { ScreenContainer, ErrorNotice, ThemedText } from '@/components';
import { PowerDropCard } from '@/components/powerdrops/PowerDropCard';
import { PowerDropCategoryBar } from '@/components/powerdrops/PowerDropCategoryBar';
import { PowerDropsSkeleton } from '@/components/powerdrops/PowerDropsSkeleton';
import { usePowerDrops } from '@/hooks/usePowerDrops';
import { colors, spacing } from '@/theme';

/**
 * The PowerDrops™ library: small interventions for the moment you're in -
 * not the Practices library (a set of things to learn and practise over
 * time). Fetches GET /api/v1/powerdrops once; category filtering happens
 * client-side against the already-fetched list, same as
 * PracticeFilterBar/usePractices.
 */
export default function PowerDropsLibraryScreen() {
  const { state, reload } = usePowerDrops();
  const [category, setCategory] = useState<string | null>(null);

  const powerDrops = useMemo(() => (state.status === 'success' ? state.powerDrops : []), [state]);

  const featured = useMemo(() => powerDrops.find((p) => p.featured) ?? null, [powerDrops]);

  const availableCategories = useMemo(() => {
    const seen = new Set<string>();
    for (const p of powerDrops) if (p.category) seen.add(p.category);
    return Array.from(seen);
  }, [powerDrops]);

  const browsable = featured ? powerDrops.filter((p) => p.id !== featured.id) : powerDrops;
  const filtered = category ? browsable.filter((p) => p.category === category) : browsable;

  return (
    <ScreenContainer scroll>
      <ThemedText variant="label" color={colors.bronze} style={styles.eyebrow}>
        POWERDROPS™
      </ThemedText>
      <ThemedText variant="display" style={styles.heading}>
        Small practices for real moments.
      </ThemedText>

      {state.status === 'loading' && <PowerDropsSkeleton />}

      {state.status === 'error' && <ErrorNotice message={state.message} onRetry={reload} />}

      {state.status === 'success' && (
        <>
          {featured ? (
            <View style={styles.section}>
              <ThemedText variant="heading" style={styles.sectionTitle}>
                Featured
              </ThemedText>
              <PowerDropCard powerDrop={featured} />
            </View>
          ) : null}

          {availableCategories.length > 1 ? (
            <View style={styles.section}>
              <ThemedText variant="heading" style={styles.sectionTitle}>
                Browse by category
              </ThemedText>
              <PowerDropCategoryBar
                availableCategories={availableCategories}
                selected={category}
                onSelect={setCategory}
              />
            </View>
          ) : null}

          <ThemedText variant="heading" style={styles.sectionTitle}>
            All PowerDrops
          </ThemedText>
          {filtered.length === 0 ? (
            <ThemedText variant="body" color={colors.charcoal}>
              {powerDrops.length === 0
                ? 'No PowerDrops are available yet.'
                : 'No PowerDrops match this category.'}
            </ThemedText>
          ) : (
            filtered.map((powerDrop) => <PowerDropCard key={powerDrop.id} powerDrop={powerDrop} />)
          )}
        </>
      )}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  eyebrow: {
    textTransform: 'uppercase',
    marginBottom: spacing.sm,
  },
  heading: {
    marginBottom: spacing.xl,
  },
  section: {
    marginBottom: spacing.xl,
  },
  sectionTitle: {
    marginBottom: spacing.md,
  },
});
