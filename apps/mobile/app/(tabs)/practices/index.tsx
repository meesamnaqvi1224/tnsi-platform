import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import {
  ScreenContainer,
  ErrorNotice,
  PageHeader,
  PrimaryButton,
  SectionLabel,
  ThemedText,
} from '@/components';
import { PracticeCard } from '@/components/practices/PracticeCard';
import { PracticeFilterBar } from '@/components/practices/PracticeFilterBar';
import { PracticeSearchField } from '@/components/practices/PracticeSearchField';
import { PracticesSkeleton } from '@/components/practices/PracticesSkeleton';
import { CollectionTiles } from '@/components/practices/CollectionTiles';
import { GuidedPracticeCard } from '@/components/guided-practice/GuidedPracticeCard';
import { usePractices } from '@/hooks/usePractices';
import { capitalize } from '@/lib/format';
import { NINETY_SECOND_RESET, THE_EMPTY_CHAIR } from '@/lib/guided-practices';
import {
  NO_FILTERS,
  categoryLabel,
  filterGuidedPractices,
  filterPractices,
  hasLibraryFilters,
  isSearching,
  practiceCategories,
  practiceTypes,
  resultSummary,
  type LibraryFilters,
} from '@/lib/practice-library';
import { colors, spacing, linkHitSlop } from '@/theme';
import type { PracticeContentType } from '@/api/types';

const GUIDED_PRACTICES = [NINETY_SECOND_RESET, THE_EMPTY_CHAIR];

/**
 * The Practices Library, in three clearly separate parts:
 *
 * - Guided practices: the two standalone guided audio experiences.
 * - Collections: PowerDrops™ and Somatic Cards, each its own library.
 * - Practice library: GET /api/v1/practices (fetched once, up to 50), which the Focus (category)
 *   and Format (content type) filters narrow.
 *
 * Search runs over what is already loaded (guided practices and the library); nothing extra is
 * fetched. Search and filters combine. See src/lib/practice-library.ts.
 */
export default function PracticesScreen() {
  const router = useRouter();
  const { state, reload, refresh } = usePractices();
  const [filters, setFilters] = useState<LibraryFilters>(NO_FILTERS);

  // Coming back to this tab (after practising or saving) shows what the server says now, so the
  // progress and saved state on the cards stay true. The first focus is skipped: the hook already
  // fetches on mount. The API client changes identity every render (see useApiClient), so the
  // refresh lives in a ref and the focus callback stays stable.
  const refreshLibrary = useRef(() => {});
  useEffect(() => {
    refreshLibrary.current = refresh;
  });
  const firstFocus = useRef(true);
  useFocusEffect(
    useCallback(() => {
      if (firstFocus.current) {
        firstFocus.current = false;
        return;
      }
      refreshLibrary.current();
    }, []),
  );

  const practices = useMemo(() => (state.status === 'success' ? state.practices : []), [state]);
  const categoryOptions = useMemo(
    () => practiceCategories(practices).map((key) => ({ key, label: categoryLabel(key) })),
    [practices],
  );
  const typeOptions = useMemo(
    () => practiceTypes(practices).map((key) => ({ key, label: capitalize(key) })),
    [practices],
  );
  const guided = useMemo(
    () => filterGuidedPractices(GUIDED_PRACTICES, filters.query),
    [filters.query],
  );
  const results = useMemo(() => filterPractices(practices, filters), [practices, filters]);

  // A card is rebuilt when a filter hides it and shows it again, so a save made on it is kept here
  // until fresh data from the server (which already includes it) replaces the list. The kept
  // values are tied to the list they were made against, so a newer list discards them.
  const [mine, setMine] = useState<{ list: typeof practices; saved: Record<string, boolean> }>({
    list: practices,
    saved: {},
  });
  const savedByMe = mine.list === practices ? mine.saved : {};

  const searching = isSearching(filters);
  const narrowed = hasLibraryFilters(filters);
  const query = filters.query.trim();

  return (
    <ScreenContainer scroll underHeader inTabs keyboardPersistTaps>
      <PageHeader
        variant="plain"
        eyebrow="Practices"
        title="A library of practices to support your nervous system."
      />

      <View style={styles.linkRow}>
        <Pressable
          onPress={() => router.push('/practices/saved')}
          accessibilityRole="link"
          hitSlop={linkHitSlop}
          accessibilityLabel="View Saved Practices"
        >
          <ThemedText variant="label" color={colors.bronze}>
            Saved →
          </ThemedText>
        </Pressable>
        <Pressable
          onPress={() => router.push('/practices/journey')}
          accessibilityRole="link"
          hitSlop={linkHitSlop}
          accessibilityLabel="View My Journey"
        >
          <ThemedText variant="label" color={colors.bronze}>
            My Journey →
          </ThemedText>
        </Pressable>
        <Pressable
          onPress={() => router.push('/practices/history')}
          accessibilityRole="link"
          hitSlop={linkHitSlop}
          accessibilityLabel="View Practice History"
        >
          <ThemedText variant="label" color={colors.bronze}>
            Practice History →
          </ThemedText>
        </Pressable>
      </View>

      <PracticeSearchField
        value={filters.query}
        onChangeText={(text) => setFilters((current) => ({ ...current, query: text }))}
      />

      {guided.length > 0 ? (
        <>
          <SectionLabel>Guided practices</SectionLabel>
          <View style={styles.section}>
            {guided.map((practice) => (
              <GuidedPracticeCard key={practice.slug} practice={practice} />
            ))}
          </View>
        </>
      ) : null}

      {searching ? null : (
        <>
          <SectionLabel>Collections</SectionLabel>
          <CollectionTiles />
        </>
      )}

      <SectionLabel>Practice library</SectionLabel>

      {state.status === 'loading' && <PracticesSkeleton />}

      {state.status === 'error' && <ErrorNotice message={state.message} onRetry={reload} />}

      {state.status === 'success' && (
        <>
          <PracticeFilterBar
            label="Focus"
            options={categoryOptions}
            selected={filters.category}
            onSelect={(category) => setFilters((current) => ({ ...current, category }))}
          />
          <PracticeFilterBar
            label="Format"
            options={typeOptions}
            selected={filters.type}
            onSelect={(type) =>
              setFilters((current) => ({ ...current, type: type as PracticeContentType | null }))
            }
          />

          {practices.length > 0 ? (
            <ThemedText
              variant="caption"
              color={colors.charcoal}
              accessibilityLiveRegion="polite"
              style={styles.summary}
            >
              {resultSummary(results.length, practices.length)}
            </ThemedText>
          ) : null}

          {results.length === 0 ? (
            <View style={styles.empty}>
              <ThemedText variant="body" color={colors.charcoal}>
                {practices.length === 0
                  ? 'No practices are available yet.'
                  : searching
                    ? `No practices match “${query}”${narrowed ? ' with these filters' : ''}.`
                    : 'No practices match these filters.'}
              </ThemedText>
              {practices.length > 0 ? (
                <PrimaryButton
                  label={searching ? 'Clear search and filters' : 'Clear filters'}
                  variant="secondary"
                  onPress={() => setFilters(NO_FILTERS)}
                  style={styles.emptyButton}
                />
              ) : null}
            </View>
          ) : (
            results.map((practice) => (
              // Keyed by its saved state too, so a refresh that changes it elsewhere (for example
              // un-saving in My Learning) rebuilds the card and its Save control stays true.
              <PracticeCard
                key={`${practice.id}:${practice.saved ? 1 : 0}`}
                practice={{ ...practice, saved: savedByMe[practice.id] ?? practice.saved }}
                onSavedChange={(saved) =>
                  setMine({ list: practices, saved: { ...savedByMe, [practice.id]: saved } })
                }
              />
            ))
          )}
        </>
      )}

      {searching ? (
        <View style={styles.collectionsHint}>
          <ThemedText variant="caption" color={colors.charcoal}>
            Looking for a PowerDrop or a Somatic Card? They are separate collections.
          </ThemedText>
          <View style={styles.hintLinks}>
            <HintLink label="PowerDrops →" onPress={() => router.push('/practices/powerdrops')} />
            <HintLink
              label="Somatic Cards →"
              onPress={() => router.push('/practices/somatic-cards')}
            />
          </View>
        </View>
      ) : null}
    </ScreenContainer>
  );
}

function HintLink({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="link"
      accessibilityLabel={label.replace(' →', '')}
      style={styles.hintLink}
    >
      <ThemedText variant="label" color={colors.bronze}>
        {label}
      </ThemedText>
    </Pressable>
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
  section: {
    marginBottom: spacing.lg,
  },
  summary: {
    marginBottom: spacing.md,
  },
  empty: {
    marginBottom: spacing.lg,
  },
  emptyButton: {
    marginTop: spacing.md,
  },
  collectionsHint: {
    marginTop: spacing.lg,
    marginBottom: spacing.lg,
  },
  hintLinks: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.lg,
  },
  hintLink: {
    minHeight: 48,
    justifyContent: 'center',
  },
});
