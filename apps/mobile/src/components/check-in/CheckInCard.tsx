import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Card } from '@/components/Card';
import { ThemedText } from '@/components/ThemedText';
import { PrimaryButton } from '@/components/PrimaryButton';
import { TextField } from '@/components/TextField';
import { ScoreSelector } from './ScoreSelector';
import { useApiClient } from '@/hooks/useApiClient';
import { humanizeApiError } from '@/lib/api-errors';
import { colors, spacing } from '@/theme';
import { ApiRequestError, type CheckIn } from '@/api/types';

type Phase =
  | { kind: 'recorded'; checkIn: CheckIn; justSubmitted: boolean }
  | {
      kind: 'form';
      mood: number | null;
      capacity: number | null;
      note: string;
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
 * Owns the full Daily Check-In state machine: initial form, mood/capacity
 * selection, optional note, submitting, success, already-recorded-today
 * (from either the initial load or a same-day duplicate response), and
 * error/retry. Editing an already-recorded check-in is not supported by
 * the backend (POST rejects a second same-day check-in with no update
 * path), so this never offers to edit one - only to view it.
 */
export function CheckInCard({ initialCheckIn, onSubmitted }: CheckInCardProps) {
  const api = useApiClient();
  const router = useRouter();
  const [phase, setPhase] = useState<Phase>(() =>
    initialCheckIn
      ? { kind: 'recorded', checkIn: initialCheckIn, justSubmitted: false }
      : { kind: 'form', mood: null, capacity: null, note: '', submitting: false, error: null },
  );

  async function handleSubmit() {
    if (phase.kind !== 'form' || phase.mood === null || phase.capacity === null) return;

    const { mood, capacity, note } = phase;
    setPhase({ ...phase, submitting: true, error: null });

    try {
      const checkIn = await api.post<CheckIn>('/api/v1/check-ins', {
        moodScore: mood,
        capacityScore: capacity,
        ...(note.trim() ? { notes: note.trim() } : {}),
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
          mood,
          capacity,
          note,
          submitting: false,
          error: humanizeApiError(err),
        });
      }
    }
  }

  if (phase.kind === 'recorded') {
    return (
      <Card style={styles.card}>
        <ThemedText variant="label" color={colors.bronze} style={styles.label}>
          Daily Check-In
        </ThemedText>
        <ThemedText variant="heading">
          {phase.justSubmitted ? 'Check-in complete.' : "Today's check-in is recorded."}
        </ThemedText>
        <View style={styles.recordedRow}>
          <ThemedText variant="body" color={colors.charcoal}>
            Mood: {phase.checkIn.moodScore} of 5
          </ThemedText>
          <ThemedText variant="body" color={colors.charcoal}>
            Capacity: {phase.checkIn.capacityScore} of 5
          </ThemedText>
        </View>
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

  const canSubmit = phase.mood !== null && phase.capacity !== null && !phase.submitting;

  return (
    <Card style={styles.card}>
      <ThemedText variant="label" color={colors.bronze} style={styles.label}>
        Daily Check-In
      </ThemedText>
      <ThemedText variant="heading" style={styles.prompt}>
        How are you arriving today?
      </ThemedText>
      <ThemedText variant="body" color={colors.charcoal} style={styles.subtitle}>
        A quick check-in helps you notice and stay connected.
      </ThemedText>

      <ScoreSelector
        label="Mood"
        value={phase.mood}
        onChange={(mood) => setPhase({ ...phase, mood })}
        lowLabel="Very low"
        highLabel="Very good"
        valueLabels={['Very low', 'Low', 'Okay', 'Good', 'Very good']}
        disabled={phase.submitting}
      />
      <ScoreSelector
        label="Capacity"
        value={phase.capacity}
        onChange={(capacity) => setPhase({ ...phase, capacity })}
        lowLabel="Very limited"
        highLabel="Plenty available"
        valueLabels={['Very limited', 'Limited', 'Okay', 'Good', 'Plenty available']}
        disabled={phase.submitting}
      />

      <TextField
        label="Note (optional)"
        placeholder="Anything you'd like to note"
        value={phase.note}
        onChangeText={(note) => setPhase({ ...phase, note })}
        multiline
        numberOfLines={3}
        autoCapitalize="sentences"
        editable={!phase.submitting}
        style={styles.noteInput}
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
    marginBottom: spacing.xs,
  },
  subtitle: {
    marginBottom: spacing.md,
  },
  noteInput: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  errorText: {
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
