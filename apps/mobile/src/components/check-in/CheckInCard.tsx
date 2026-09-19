import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Card } from '@/components/Card';
import { ThemedText } from '@/components/ThemedText';
import { PrimaryButton } from '@/components/PrimaryButton';
import { CapacityOptionList, capacityOptionLabel } from './CapacityOptionList';
import { useApiClient } from '@/hooks/useApiClient';
import { humanizeApiError } from '@/lib/api-errors';
import { colors, spacing } from '@/theme';
import { ApiRequestError, type CheckIn } from '@/api/types';

type Phase =
  | { kind: 'recorded'; checkIn: CheckIn; justSubmitted: boolean }
  | {
      kind: 'form';
      capacity: number | null;
      submitting: boolean;
      error: string | null;
    };

interface CheckInCardProps {
  /** Today's check-in as already known from GET /api/v1/today, if any. */
  initialCheckIn: CheckIn | null;
  /** Lets Home keep its own cached "today" state in sync, avoiding a refetch. */
  onSubmitted: (checkIn: CheckIn) => void;
}

/**
 * Owns the full Daily Check-In state machine: initial form (a single
 * plain-language capacity question), submitting, success,
 * already-recorded-today (from either the initial load or a same-day
 * duplicate response), and error/retry. Editing an already-recorded
 * check-in is not supported by the backend (POST rejects a second
 * same-day check-in with no update path), so this never offers to edit
 * one - only to view it.
 *
 * The API still requires both `moodScore` and `capacityScore` (existing,
 * unchanged infrastructure - see packages/db/src/schema/check-ins.ts's
 * NOT NULL columns), so the one answer is submitted as both; only
 * `capacityScore` is what `getRecommendedPractice` actually reads.
 */
export function CheckInCard({ initialCheckIn, onSubmitted }: CheckInCardProps) {
  const api = useApiClient();
  const router = useRouter();
  const [phase, setPhase] = useState<Phase>(() =>
    initialCheckIn
      ? { kind: 'recorded', checkIn: initialCheckIn, justSubmitted: false }
      : { kind: 'form', capacity: null, submitting: false, error: null },
  );

  async function handleSubmit() {
    if (phase.kind !== 'form' || phase.capacity === null) return;

    const { capacity } = phase;
    setPhase({ ...phase, submitting: true, error: null });

    try {
      const checkIn = await api.post<CheckIn>('/api/v1/check-ins', {
        moodScore: capacity,
        capacityScore: capacity,
      });
      setPhase({ kind: 'recorded', checkIn, justSubmitted: true });
      onSubmitted(checkIn);
    } catch (err) {
      const existing =
        err instanceof ApiRequestError && err.status === 400 && err.details?.checkIn
          ? (err.details.checkIn as CheckIn)
          : null;

      if (existing) {
        // Same-day duplicate: the backend already has today's check-in -
        // this isn't an error state, just the recorded state arriving late.
        setPhase({ kind: 'recorded', checkIn: existing, justSubmitted: false });
        onSubmitted(existing);
      } else {
        setPhase({
          kind: 'form',
          capacity,
          submitting: false,
          error: humanizeApiError(err),
        });
      }
    }
  }

  if (phase.kind === 'recorded') {
    return (
      <Card variant="warm" style={styles.card}>
        <ThemedText variant="label" color={colors.bronze} style={styles.label}>
          Daily Check-In
        </ThemedText>
        <ThemedText variant="heading">
          {phase.justSubmitted ? 'Check-in complete.' : "Today's check-in is recorded."}
        </ThemedText>
        {phase.checkIn.moodScore === phase.checkIn.capacityScore &&
        capacityOptionLabel(phase.checkIn.capacityScore) ? (
          // From this single-question flow: mood and capacity were
          // submitted as the same value, so show the one answer the
          // member actually gave rather than two identical numbers.
          <ThemedText variant="body" color={colors.charcoal} style={styles.recordedRow}>
            {capacityOptionLabel(phase.checkIn.capacityScore)}
          </ThemedText>
        ) : (
          // A pre-existing check-in from the old two-question flow, where
          // mood and capacity could genuinely differ - shown as recorded,
          // not collapsed into one answer.
          <View style={styles.recordedRow}>
            <ThemedText variant="body" color={colors.charcoal}>
              Mood: {phase.checkIn.moodScore} of 5
            </ThemedText>
            <ThemedText variant="body" color={colors.charcoal}>
              Capacity: {phase.checkIn.capacityScore} of 5
            </ThemedText>
          </View>
        )}
        {phase.checkIn.notes ? (
          <ThemedText variant="body" style={styles.notesReadout}>
            {phase.checkIn.notes}
          </ThemedText>
        ) : null}
        <Pressable
          onPress={() => router.push('/profile/progress')}
          accessibilityRole="link"
          accessibilityLabel="View check-in history"
          style={styles.historyLink}
        >
          <ThemedText variant="label" color={colors.bronze}>
            View History →
          </ThemedText>
        </Pressable>
      </Card>
    );
  }

  const canSubmit = phase.capacity !== null && !phase.submitting;

  return (
    <Card variant="warm" style={styles.card}>
      <ThemedText variant="label" color={colors.bronze} style={styles.label}>
        Daily Check-In
      </ThemedText>
      <ThemedText variant="display" style={styles.prompt}>
        How are you arriving today?
      </ThemedText>

      <CapacityOptionList
        value={phase.capacity}
        onChange={(capacity) => setPhase({ ...phase, capacity })}
        disabled={phase.submitting}
      />

      {phase.error ? (
        <ThemedText variant="body" color={colors.error} style={styles.errorText}>
          {phase.error}
        </ThemedText>
      ) : null}

      <View style={styles.actionsRow}>
        <PrimaryButton
          label="Save Check-In"
          onPress={handleSubmit}
          loading={phase.submitting}
          disabled={!canSubmit}
          style={styles.saveButton}
        />
        <Pressable
          onPress={() => router.push('/profile/progress')}
          accessibilityRole="link"
          accessibilityLabel="View check-in history"
        >
          <ThemedText variant="label" color={colors.bronze}>
            View History
          </ThemedText>
        </Pressable>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    marginBottom: spacing.lg,
  },
  label: {
    textTransform: 'uppercase',
    marginBottom: spacing.sm,
  },
  prompt: {
    marginBottom: spacing.md,
  },
  errorText: {
    marginTop: spacing.md,
    marginBottom: spacing.md,
  },
  recordedRow: {
    flexDirection: 'row',
    gap: spacing.lg,
    marginTop: spacing.sm,
  },
  notesReadout: {
    marginTop: spacing.md,
  },
  historyLink: {
    marginTop: spacing.lg,
    alignSelf: 'flex-start',
  },
  actionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.lg,
  },
  saveButton: {
    flex: 1,
  },
});
