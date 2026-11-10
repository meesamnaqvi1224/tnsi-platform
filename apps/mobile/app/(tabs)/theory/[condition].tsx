import { useMemo } from 'react';
import { StyleSheet } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { ErrorNotice, ScreenContainer, ThemedText } from '@/components';
import { PageTitle } from '@/components/PageTitle';
import { SectionHeading } from '@/components/SectionHeading';
import { PracticeCard } from '@/components/practices/PracticeCard';
import { PracticesSkeleton } from '@/components/practices/PracticesSkeleton';
import { home } from '@/components/home/homeTheme';
import { conditionDescription } from '@/content/human-expansion-theory';
import { parseCondition, practicesForCondition } from '@/lib/conditions';
import { usePractices } from '@/hooks/usePractices';
import { spacing } from '@/theme';

/**
 * One Developmental Condition: Caroline's approved description, then the practices tagged with that
 * condition. Practices join a condition through their tags in the CMS, so this page grows with the
 * library without any change here. Only sections that have real content are shown: the fuller
 * Understand / Recognise / Explore / Reflect material has not been supplied yet. Opening this page
 * is not an activity and records nothing.
 */
export default function ConditionScreen() {
  const params = useLocalSearchParams<{ condition: string }>();
  const raw = Array.isArray(params.condition) ? params.condition[0] : params.condition;
  const condition = parseCondition(raw);
  const { state, reload } = usePractices();

  const practices = useMemo(
    () =>
      condition && state.status === 'success'
        ? practicesForCondition(state.practices, condition)
        : [],
    [condition, state],
  );

  if (!condition) {
    return (
      <ScreenContainer underHeader inTabs background={home.page}>
        <ThemedText variant="heading">This page isn&apos;t available.</ThemedText>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer scroll underHeader inTabs background={home.page}>
      <PageTitle eyebrow="Developmental Condition" title={condition} />

      <SectionHeading>Understand</SectionHeading>
      <ThemedText variant="body" color={home.ink} style={styles.block}>
        {conditionDescription(condition)}
      </ThemedText>

      <SectionHeading>Practise</SectionHeading>
      {state.status === 'loading' && <PracticesSkeleton />}
      {state.status === 'error' && <ErrorNotice message={state.message} onRetry={reload} />}
      {state.status === 'success' && practices.length === 0 && (
        <ThemedText variant="body" color={home.ink} style={styles.block}>
          No practices are connected to {condition} yet.
        </ThemedText>
      )}
      {state.status === 'success' &&
        practices.map((practice) => <PracticeCard key={practice.id} practice={practice} />)}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  block: { marginBottom: spacing.lg },
});
