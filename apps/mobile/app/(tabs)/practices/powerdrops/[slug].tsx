import { useCallback, useState } from 'react';
import { StyleSheet } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { ScreenContainer, ErrorNotice, ThemedText, PrimaryButton } from '@/components';
import { PowerDropDetailContent } from '@/components/powerdrops/PowerDropDetailContent';
import { PowerDropsSkeleton } from '@/components/powerdrops/PowerDropsSkeleton';
import { MembershipLockedNotice } from '@/components/membership/MembershipLockedNotice';
import { usePowerDropDetail } from '@/hooks/usePowerDropDetail';
import { colors, spacing } from '@/theme';

/**
 * A single PowerDrop: read the card, use it, return to life. V1 has no
 * timer, audio, or guided protocol - "USE THIS DROP" just reveals a
 * "DONE" action; tapping it records a usage event
 * (POST .../usage) and the CTA resets, since the same PowerDrop can be
 * used again right away or later. The app never claims to have guided the
 * practice - it only displayed the card.
 */
export default function PowerDropDetailScreen() {
  const params = useLocalSearchParams<{ slug: string }>();
  const slug = Array.isArray(params.slug) ? params.slug[0] : params.slug;
  const { state, reload, recordUsage } = usePowerDropDetail(slug ?? '');
  const [inUse, setInUse] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [justCompleted, setJustCompleted] = useState(false);

  const handleDone = useCallback(async () => {
    if (submitting) return;
    setSubmitting(true);
    try {
      await recordUsage();
      setInUse(false);
      setJustCompleted(true);
    } catch {
      // The usage record failed to save; the card stays open so the
      // member can just tap Done again rather than losing their place.
    } finally {
      setSubmitting(false);
    }
  }, [recordUsage, submitting]);

  if (state.status === 'loading') {
    return (
      <ScreenContainer scroll>
        <PowerDropsSkeleton />
      </ScreenContainer>
    );
  }

  if (state.status === 'not-found') {
    return (
      <ScreenContainer>
        <ThemedText variant="heading">This PowerDrop isn&apos;t available.</ThemedText>
        <ThemedText variant="body" color={colors.charcoal} style={styles.notFoundBody}>
          It may have been removed or is no longer published.
        </ThemedText>
      </ScreenContainer>
    );
  }

  // A locked PowerDrop (e.g. opened from a deep link): the server sent none
  // of its content. Same destination as tapping a locked library card; the
  // member chooses to go there, so there is no automatic redirect.
  if (state.status === 'membership-required') {
    return (
      <ScreenContainer>
        <ThemedText variant="heading">This PowerDrop is for members.</ThemedText>
        <MembershipLockedNotice message="It is part of the full Regulation Suite™ library, available with a membership." />
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

  const { powerDrop } = state;

  return (
    <ScreenContainer scroll>
      <PowerDropDetailContent powerDrop={powerDrop} />

      {justCompleted && !inUse ? (
        <ThemedText variant="body" color={colors.success} style={styles.completedNote}>
          Done. You can use this PowerDrop again anytime.
        </ThemedText>
      ) : null}

      {inUse ? (
        <PrimaryButton label="DONE" onPress={handleDone} loading={submitting} style={styles.cta} />
      ) : (
        <PrimaryButton
          label={justCompleted ? 'USE THIS DROP AGAIN' : 'USE THIS DROP'}
          onPress={() => {
            setJustCompleted(false);
            setInUse(true);
          }}
          style={styles.cta}
        />
      )}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  notFoundBody: {
    marginTop: spacing.sm,
  },
  completedNote: {
    marginBottom: spacing.md,
  },
  cta: {
    marginBottom: spacing.xl,
  },
});
