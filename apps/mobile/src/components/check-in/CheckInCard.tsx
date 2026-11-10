import { useState, type ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { ThemedText } from '@/components/ThemedText';
import { PrimaryButton } from '@/components/PrimaryButton';
import { CapacityOptionList, capacityOptionLabel } from './CapacityOptionList';
import { useApiClient } from '@/hooks/useApiClient';
import { humanizeApiError } from '@/lib/api-errors';
import { buildCheckInPayload, deviceTimeZone } from '@/lib/check-in-payload';
import { canCheckInAgain, savedCheckInKind } from '@/lib/additional-check-in';
import { home } from '@/components/home/homeTheme';
import { colors, fontFamily, spacing, linkHitSlop } from '@/theme';
import { ApiRequestError, type CheckIn } from '@/api/types';

type Phase =
  | {
      kind: 'recorded';
      checkIn: CheckIn;
      justSubmitted: boolean;
      /** Shown once after an additional check-in was saved; the primary stays what is displayed. */
      notice?: string;
    }
  | {
      /** A further check-in the same day. `primary` is kept so Home still shows it, unchanged. */
      kind: 'additional';
      primary: CheckIn;
      capacity: number | null;
      submitting: boolean;
      error: string | null;
    }
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
/** The card surface: white, a 1 px visible border and a very light shadow, so it stands apart from the page without becoming a heavy panel. */
function Surface({ children }: { children: ReactNode }) {
  return <View style={styles.surface}>{children}</View>;
}

export function CheckInCard({ initialCheckIn, onSubmitted }: CheckInCardProps) {
  const api = useApiClient();
  const router = useRouter();
  // The question and the "Check in now" button come first; the answer list opens on tap, so Home
  // stays calm. Opening it changes nothing about the saved state or the submit flow.
  const [open, setOpen] = useState(false);
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
      const checkIn = await api.post<CheckIn>(
        '/api/v1/check-ins',
        buildCheckInPayload(capacity, deviceTimeZone()),
      );
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

  async function handleAdditionalSubmit() {
    if (phase.kind !== 'additional' || phase.capacity === null) return;
    const { primary, capacity } = phase;
    setPhase({ ...phase, submitting: true, error: null });

    try {
      const saved = await api.post<CheckIn>(
        '/api/v1/check-ins',
        buildCheckInPayload(capacity, deviceTimeZone()),
      );
      if (savedCheckInKind(saved) === 'primary') {
        // The server made it the day's primary (there was none): from here it is today's check-in.
        setPhase({ kind: 'recorded', checkIn: saved, justSubmitted: true });
        onSubmitted(saved);
        return;
      }
      // A separate record. The primary - what Home shows and what the recommendation follows -
      // is untouched, so Home's cached "today" state is deliberately not updated.
      setPhase({
        kind: 'recorded',
        checkIn: primary,
        justSubmitted: false,
        notice: 'Additional check-in saved.',
      });
    } catch (err) {
      setPhase({
        kind: 'additional',
        primary,
        capacity,
        submitting: false,
        error: humanizeApiError(err),
      });
    }
  }

  if (phase.kind === 'additional') {
    return (
      <Surface>
        <Eyebrow />
        <ThemedText variant="heading" color={home.navy} style={styles.title}>
          Check in again
        </ThemedText>
        <ThemedText variant="body" color={home.ink} style={styles.support}>
          This is saved as a separate check-in. Your first check-in today keeps guiding your
          practice.
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
            label="Save check-in"
            onPress={handleAdditionalSubmit}
            loading={phase.submitting}
            disabled={phase.capacity === null || phase.submitting}
            style={styles.saveButton}
          />
          <Pressable
            onPress={() =>
              setPhase({ kind: 'recorded', checkIn: phase.primary, justSubmitted: false })
            }
            disabled={phase.submitting}
            accessibilityRole="button"
            accessibilityLabel="Cancel"
            hitSlop={linkHitSlop}
          >
            <ThemedText variant="label" color={home.bronze}>
              Cancel
            </ThemedText>
          </Pressable>
        </View>
      </Surface>
    );
  }

  if (phase.kind === 'recorded') {
    const recorded = phase;
    return (
      <Surface>
        <Eyebrow />
        <ThemedText variant="heading" color={home.navy} style={styles.title}>
          {phase.justSubmitted ? 'Check-in complete.' : "Today's check-in is recorded."}
        </ThemedText>
        {phase.checkIn.moodScore === phase.checkIn.capacityScore &&
        capacityOptionLabel(phase.checkIn.capacityScore) ? (
          // From this single-question flow: mood and capacity were
          // submitted as the same value, so show the one answer the
          // member actually gave rather than two identical numbers.
          <ThemedText variant="body" color={home.ink} style={styles.recordedRow}>
            {capacityOptionLabel(phase.checkIn.capacityScore)}
          </ThemedText>
        ) : (
          // A pre-existing check-in from the old two-question flow, where
          // mood and capacity could genuinely differ - shown as recorded,
          // not collapsed into one answer.
          <View style={styles.recordedRow}>
            <ThemedText variant="body" color={home.ink}>
              Mood: {phase.checkIn.moodScore} of 5
            </ThemedText>
            <ThemedText variant="body" color={home.ink}>
              Capacity: {phase.checkIn.capacityScore} of 5
            </ThemedText>
          </View>
        )}
        {phase.checkIn.notes ? (
          <ThemedText variant="body" style={styles.notesReadout}>
            {phase.checkIn.notes}
          </ThemedText>
        ) : null}
        {recorded.notice ? (
          <ThemedText
            variant="body"
            color={home.bronze}
            style={styles.notice}
            accessibilityLiveRegion="polite"
          >
            {recorded.notice}
          </ThemedText>
        ) : null}
        <View style={styles.recordedLinks}>
          <Pressable
            onPress={() => router.push('/profile/progress')}
            accessibilityRole="link"
            hitSlop={linkHitSlop}
            accessibilityLabel="View check-in history"
          >
            <ThemedText variant="label" color={home.bronze}>
              View History →
            </ThemedText>
          </Pressable>
          {canCheckInAgain(recorded.checkIn) ? (
            <Pressable
              onPress={() =>
                setPhase({
                  kind: 'additional',
                  primary: recorded.checkIn,
                  capacity: null,
                  submitting: false,
                  error: null,
                })
              }
              accessibilityRole="button"
              accessibilityLabel="Check in again"
              hitSlop={linkHitSlop}
            >
              <ThemedText variant="label" color={home.bronze}>
                Check in again
              </ThemedText>
            </Pressable>
          ) : null}
        </View>
      </Surface>
    );
  }

  // Narrowed: 'recorded' and 'additional' returned above, so this is the first-check-in form.
  const canSubmit = phase.capacity !== null && !phase.submitting;

  return (
    <Surface>
      <View style={styles.promptRow}>
        <View style={styles.ring} accessibilityElementsHidden importantForAccessibility="no">
          <Ionicons name="checkmark" size={20} color={home.bronze} />
        </View>
        <View style={styles.promptText}>
          <Eyebrow />
          <ThemedText variant="heading" color={home.navy} style={styles.title}>
            How are you feeling right now?
          </ThemedText>
        </View>
      </View>
      <ThemedText variant="body" color={home.ink} style={styles.support}>
        A quick check-in helps us offer practices that meet you where you are.
      </ThemedText>

      {open ? (
        <>
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
              hitSlop={linkHitSlop}
              accessibilityLabel="View check-in history"
            >
              <ThemedText variant="label" color={home.bronze}>
                View History
              </ThemedText>
            </Pressable>
          </View>
        </>
      ) : (
        <View style={styles.actionsRow}>
          <PrimaryButton
            label="Check in now"
            onPress={() => setOpen(true)}
            style={styles.saveButton}
          />
          <Pressable
            onPress={() => router.push('/profile/progress')}
            accessibilityRole="link"
            hitSlop={linkHitSlop}
            accessibilityLabel="View check-in history"
          >
            <ThemedText variant="label" color={home.bronze}>
              View History
            </ThemedText>
          </Pressable>
        </View>
      )}
    </Surface>
  );
}

function Eyebrow() {
  return (
    <ThemedText variant="label" color={home.bronze} style={styles.label}>
      Daily Check-In
    </ThemedText>
  );
}

const styles = StyleSheet.create({
  surface: {
    backgroundColor: home.page,
    borderWidth: 1,
    borderColor: home.border,
    borderRadius: 14,
    padding: spacing.lg,
    marginBottom: spacing.xl,
    shadowColor: home.navy,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 1,
  },
  promptRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginBottom: spacing.sm,
  },
  ring: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1.5,
    borderColor: home.bronze,
    alignItems: 'center',
    justifyContent: 'center',
  },
  promptText: {
    flex: 1,
  },
  label: {
    textTransform: 'uppercase',
    letterSpacing: 2,
    fontSize: 11,
    marginBottom: 2,
  },
  title: {
    fontFamily: fontFamily.serif,
    fontSize: 21,
    lineHeight: 27,
  },
  support: {
    fontSize: 14,
    lineHeight: 20,
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
  recordedLinks: {
    marginTop: spacing.lg,
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    columnGap: spacing.lg,
    rowGap: spacing.sm,
  },
  notice: {
    marginTop: spacing.md,
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
