import { useCallback, useEffect, useRef, useState } from 'react';
import { BackHandler, Pressable, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useLocalSearchParams, useNavigation, useRouter } from 'expo-router';
import { ErrorNotice, PrimaryButton, ScreenContainer, ThemedText } from '@/components';
import { PageTitle } from '@/components/PageTitle';
import { ReflectionRow } from '@/components/reflections/ReflectionRow';
import { home, homeCardStyle } from '@/components/home/homeTheme';
import { useReflectionExit } from '@/hooks/useReflectionExit';
import { parseReflectionOrigin } from '@/lib/reflection-origin';
import { useReflectionList } from '@/hooks/useReflectionList';
import { takeReflectionNotice } from '@/lib/reflection-notice';
import { PRIVACY_LINE, REFLECTIONS_LIST } from '@/lib/reflections-copy';
import { radius, spacing } from '@/theme';

const NOTICE_MS = 4000;

/**
 * My Reflections: the member's private writing space. Saved reflections newest first (by when the
 * writing began) with a short preview, and any drafts above them. Nothing is counted, scored or
 * summarised, and nothing on this screen reads check-ins, recommendations or practice progress.
 *
 * Drafts and saved reflections load independently, so a failure in one never hides the other.
 */
export default function ReflectionsScreen() {
  const router = useRouter();
  const navigation = useNavigation();
  const { from } = useLocalSearchParams<{ from?: string }>();
  const origin = parseReflectionOrigin(from);
  const exit = useReflectionExit(origin);
  const saved = useReflectionList('saved');
  const drafts = useReflectionList('draft');
  const [notice, setNotice] = useState<string | null>(null);

  // Coming back from the editor: show what the server holds now, and any "saved" message once. The
  // first focus is skipped because both hooks already fetch on mount.
  const refreshAll = useRef(() => {});
  useEffect(() => {
    refreshAll.current = () => {
      void saved.refresh();
      void drafts.refresh();
    };
  });
  const firstFocus = useRef(true);
  useFocusEffect(
    useCallback(() => {
      const message = takeReflectionNotice();
      if (message) setNotice(message);
      if (firstFocus.current) {
        firstFocus.current = false;
        return;
      }
      refreshAll.current();
    }, []),
  );
  useEffect(() => {
    if (!notice) return;
    const timer = setTimeout(() => setNotice(null), NOTICE_MS);
    return () => clearTimeout(timer);
  }, [notice]);

  // Its own back button and Android Back, for the same reason as the editor (see useReflectionExit).
  const exitRef = useRef(exit);
  useEffect(() => {
    exitRef.current = exit;
  });
  useEffect(() => {
    navigation.setOptions({
      headerBackVisible: false,
      headerLeft: () => (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Back"
          hitSlop={12}
          onPress={() => exitRef.current()}
        >
          <Ionicons name="chevron-back" size={24} color={home.navy} />
        </Pressable>
      ),
    });
  }, [navigation]);
  useFocusEffect(
    useCallback(() => {
      const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
        exitRef.current();
        return true;
      });
      return () => subscription.remove();
    }, []),
  );

  const openNew = () => router.push('/profile/reflection');
  const openEntry = (id: string) =>
    router.push({ pathname: '/profile/reflection', params: { id } });

  const locked =
    (saved.state.status === 'error' && saved.state.kind === 'locked') ||
    (drafts.state.status === 'error' && drafts.state.kind === 'locked');
  const loading = saved.state.status === 'loading' || drafts.state.status === 'loading';
  const isEmpty =
    saved.state.status === 'success' &&
    saved.state.entries.length === 0 &&
    (drafts.state.status !== 'success' || drafts.state.entries.length === 0) &&
    drafts.state.status !== 'loading';

  return (
    <ScreenContainer scroll underHeader background={home.page}>
      <PageTitle title={REFLECTIONS_LIST.title} subtitle={REFLECTIONS_LIST.generalPrinciple} />
      <ThemedText variant="caption" color={home.ink} style={styles.privacy}>
        {PRIVACY_LINE}
      </ThemedText>

      {notice ? (
        <View style={styles.notice} accessibilityLiveRegion="polite">
          <ThemedText variant="body" color={home.navy}>
            {notice}
          </ThemedText>
        </View>
      ) : null}

      {locked ? (
        <ErrorNotice
          message={
            saved.state.status === 'error' && saved.state.kind === 'locked'
              ? saved.state.message
              : drafts.state.status === 'error'
                ? drafts.state.message
                : ''
          }
        />
      ) : (
        <>
          {loading ? (
            <View accessibilityLabel="Loading" style={styles.skeleton} />
          ) : isEmpty ? (
            <View style={styles.empty}>
              <ThemedText variant="heading" color={home.navy} style={styles.emptyTitle}>
                {REFLECTIONS_LIST.emptyTitle}
              </ThemedText>
              <ThemedText variant="body" color={home.ink} style={styles.emptyBody}>
                {REFLECTIONS_LIST.emptyBody}
              </ThemedText>
              <ThemedText variant="body" color={home.ink} style={styles.emptyBody}>
                {REFLECTIONS_LIST.emptyHint}
              </ThemedText>
              <PrimaryButton label={REFLECTIONS_LIST.emptyButton} onPress={openNew} />
            </View>
          ) : (
            <PrimaryButton
              label={REFLECTIONS_LIST.newButton}
              onPress={openNew}
              style={styles.newButton}
            />
          )}

          {drafts.state.status === 'error' && !loading ? (
            <ErrorNotice message={drafts.state.message} onRetry={drafts.reload} />
          ) : null}
          {drafts.state.status === 'success' && drafts.state.entries.length > 0 ? (
            <View style={styles.section}>
              <View accessibilityRole="header" accessible>
                <ThemedText variant="heading" color={home.navy} style={styles.sectionTitle}>
                  {REFLECTIONS_LIST.draftsHeading}
                </ThemedText>
              </View>
              {drafts.state.entries.map((entry) => (
                <ReflectionRow key={entry.id} entry={entry} onPress={() => openEntry(entry.id)} />
              ))}
              {drafts.state.hasMore ? (
                <PrimaryButton
                  label={drafts.state.loadingMore ? 'Loading…' : REFLECTIONS_LIST.loadMore}
                  variant="secondary"
                  onPress={drafts.loadMore}
                  loading={drafts.state.loadingMore}
                />
              ) : null}
            </View>
          ) : null}

          {saved.state.status === 'error' && !loading ? (
            <ErrorNotice message={saved.state.message} onRetry={saved.reload} />
          ) : null}
          {saved.state.status === 'success' && saved.state.entries.length > 0 ? (
            <View style={styles.section}>
              <View accessibilityRole="header" accessible>
                <ThemedText variant="heading" color={home.navy} style={styles.sectionTitle}>
                  {REFLECTIONS_LIST.savedHeading}
                </ThemedText>
              </View>
              {saved.state.entries.map((entry) => (
                <ReflectionRow key={entry.id} entry={entry} onPress={() => openEntry(entry.id)} />
              ))}
              {saved.state.hasMore ? (
                <PrimaryButton
                  label={saved.state.loadingMore ? 'Loading…' : REFLECTIONS_LIST.loadMore}
                  variant="secondary"
                  onPress={saved.loadMore}
                  loading={saved.state.loadingMore}
                />
              ) : null}
            </View>
          ) : null}
        </>
      )}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  privacy: { marginBottom: spacing.lg },
  notice: {
    ...homeCardStyle,
    backgroundColor: home.bronzeTint,
    padding: spacing.md,
    marginBottom: spacing.lg,
  },
  newButton: { marginBottom: spacing.xl },
  section: { marginBottom: spacing.xl },
  sectionTitle: { marginBottom: spacing.md },
  empty: { marginBottom: spacing.xl },
  emptyTitle: { marginBottom: spacing.sm },
  emptyBody: { marginBottom: spacing.md },
  skeleton: {
    height: 120,
    borderRadius: radius.md,
    backgroundColor: home.cool,
    borderWidth: 1,
    borderColor: home.border,
    marginBottom: spacing.xl,
  },
});
