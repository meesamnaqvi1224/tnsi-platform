import { useCallback, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { ScreenContainer, ErrorNotice, ThemedText, PrimaryButton } from '@/components';
import { PowerDropThumbnail } from '@/components/powerdrops/PowerDropThumbnail';
import { PowerDropsSkeleton } from '@/components/powerdrops/PowerDropsSkeleton';
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

  if (state.status === 'error') {
    return (
      <ScreenContainer>
        <ErrorNotice message={state.message} onRetry={reload} />
      </ScreenContainer>
    );
  }

  const { powerDrop } = state;
  const title = powerDrop.title.trim();
  const meta = [powerDrop.focus];
  if (powerDrop.duration) meta.push(powerDrop.duration);
  if (powerDrop.category) meta.push(powerDrop.category);

  return (
    <ScreenContainer scroll>
      <PowerDropThumbnail
        title={title}
        cardImage={powerDrop.cardImage}
        height={260}
        style={styles.hero}
      />

      <ThemedText variant="display" style={styles.title}>
        {title}
      </ThemedText>
      <ThemedText variant="caption" color={colors.charcoal} style={styles.meta}>
        {meta.join(' · ')}
      </ThemedText>

      <ThemedText variant="body" style={styles.description}>
        {powerDrop.description}
      </ThemedText>

      {powerDrop.instructions.length > 0 ? (
        <View style={styles.instructions}>
          <ThemedText variant="label" color={colors.bronze} style={styles.instructionsLabel}>
            How to
          </ThemedText>
          {powerDrop.instructions.map((step, index) => (
            <View key={`${index}-${step}`} style={styles.instructionRow}>
              <ThemedText variant="body" color={colors.bronze} style={styles.instructionNumber}>
                {index + 1}
              </ThemedText>
              <ThemedText variant="body" style={styles.instructionText}>
                {step}
              </ThemedText>
            </View>
          ))}
        </View>
      ) : null}

      <View style={styles.anchorCard}>
        <ThemedText variant="heading" color={colors.navy} style={styles.anchorText}>
          “{powerDrop.anchorStatement}”
        </ThemedText>
      </View>

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
  hero: {
    marginBottom: spacing.lg,
  },
  title: {
    marginBottom: spacing.xs,
  },
  meta: {
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    marginBottom: spacing.lg,
  },
  description: {
    marginBottom: spacing.lg,
  },
  instructions: {
    marginBottom: spacing.lg,
  },
  instructionsLabel: {
    textTransform: 'uppercase',
    marginBottom: spacing.sm,
  },
  instructionRow: {
    flexDirection: 'row',
    marginBottom: spacing.sm,
  },
  instructionNumber: {
    width: 24,
  },
  instructionText: {
    flex: 1,
  },
  anchorCard: {
    borderLeftWidth: 3,
    borderLeftColor: colors.bronzeMuted,
    paddingLeft: spacing.md,
    marginBottom: spacing.xl,
  },
  anchorText: {
    fontStyle: 'italic',
  },
  completedNote: {
    marginBottom: spacing.md,
  },
  cta: {
    marginBottom: spacing.xl,
  },
});
