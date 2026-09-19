import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Card } from '@/components/Card';
import { ThemedText } from '@/components/ThemedText';
import { PrimaryButton } from '@/components/PrimaryButton';
import { TextField } from '@/components/TextField';
import { colors, radius, spacing } from '@/theme';
import type { PostPracticeResponse, PracticeReflectionState } from '@/api/types';
import type { PracticeReflectionInput } from '@/hooks/usePracticeDetail';

const RESPONSE_OPTIONS: { value: PostPracticeResponse; label: string }[] = [
  { value: 'DIFFERENT', label: 'I feel different' },
  { value: 'SAME', label: 'I feel the same' },
  { value: 'NOT_SURE', label: "I'm not sure yet" },
];

interface PostPracticeReflectionProps {
  /** The specific session this reflection is about - required, since a reflection now belongs to one completion, not "this practice" in general (see packages/db/src/schema/practice-reflections.ts). */
  completionId: string;
  initialReflection: PracticeReflectionState | null | undefined;
  onSubmit: (input: PracticeReflectionInput) => Promise<unknown>;
}

/**
 * Shown once a practice is marked complete (see [id].tsx) - never before,
 * and never blocking. Both the response pill and the reflection text are
 * optional and independent: a member can pick one, write the other, both,
 * or neither and just use "Back to Home" - "Save Reflection" is only ever
 * something to opt into, matching the product principle that this is
 * space to notice, not a form to finish.
 *
 * Purely self-reported and never interpreted: the three options are
 * recorded verbatim (see packages/db/src/schema/enums.ts's
 * postPracticeResponseEnum) - nothing here scores, diagnoses, or explains
 * what a response "means".
 */
export function PostPracticeReflection({
  completionId,
  initialReflection,
  onSubmit,
}: PostPracticeReflectionProps) {
  const router = useRouter();
  const [response, setResponse] = useState<PostPracticeResponse | null>(
    initialReflection?.response ?? null,
  );
  const [text, setText] = useState(initialReflection?.reflection ?? '');
  const [status, setStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');

  async function handleSave() {
    setStatus('saving');
    try {
      await onSubmit({
        completionId,
        ...(response ? { response } : {}),
        ...(text.trim() ? { reflection: text.trim() } : {}),
      });
      setStatus('saved');
    } catch {
      // The practice completion this follows is already saved and
      // unaffected - a failed reflection save just means this stays on
      // screen so the member can try again, not a broken practice.
      setStatus('error');
    }
  }

  return (
    <Card style={styles.card}>
      <ThemedText variant="heading">Practice complete.</ThemedText>
      <ThemedText variant="body" color={colors.charcoal} style={styles.subtitle}>
        Take a moment before moving on.
      </ThemedText>

      <ThemedText variant="label" color={colors.charcoal} style={styles.label}>
        How do you feel now?
      </ThemedText>
      <View style={styles.optionsRow} accessibilityRole="radiogroup">
        {RESPONSE_OPTIONS.map((option) => {
          const selected = response === option.value;
          return (
            <Pressable
              key={option.value}
              onPress={() => setResponse(option.value)}
              disabled={status === 'saving'}
              accessibilityRole="radio"
              accessibilityState={{ selected, disabled: status === 'saving' }}
              accessibilityLabel={option.label}
              style={({ pressed }) => [
                styles.option,
                selected && styles.optionSelected,
                pressed && styles.optionPressed,
              ]}
            >
              <ThemedText variant="label" color={selected ? colors.cream : colors.charcoal}>
                {option.label}
              </ThemedText>
            </Pressable>
          );
        })}
      </View>

      <TextField
        label="What did you notice? (optional)"
        placeholder="Anything you'd like to note"
        value={text}
        onChangeText={setText}
        multiline
        numberOfLines={3}
        autoCapitalize="sentences"
        editable={status !== 'saving'}
        style={styles.noteInput}
      />

      {status === 'error' ? (
        <ThemedText variant="body" color={colors.error} style={styles.errorText}>
          We couldn&apos;t save that. Your practice is still marked complete - you can try saving
          again, or just continue.
        </ThemedText>
      ) : null}

      <View style={styles.actionsRow}>
        <PrimaryButton
          label={status === 'saved' ? 'Saved' : 'Save Reflection'}
          onPress={handleSave}
          loading={status === 'saving'}
          style={styles.saveButton}
        />
        <Pressable
          onPress={() => router.replace('/')}
          accessibilityRole="link"
          accessibilityLabel="Back to Home"
        >
          <ThemedText variant="label" color={colors.bronze}>
            Back to Home
          </ThemedText>
        </Pressable>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    marginTop: spacing.lg,
  },
  subtitle: {
    marginTop: spacing.xs,
    marginBottom: spacing.lg,
  },
  label: {
    textTransform: 'uppercase',
    marginBottom: spacing.sm,
  },
  optionsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  option: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    minHeight: 44,
    justifyContent: 'center',
  },
  optionSelected: {
    backgroundColor: colors.navy,
    borderColor: colors.navy,
  },
  optionPressed: {
    opacity: 0.85,
  },
  noteInput: {
    minHeight: 72,
    textAlignVertical: 'top',
    backgroundColor: colors.cream,
    borderWidth: 0,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    borderRadius: 0,
    paddingHorizontal: spacing.xs,
    marginBottom: spacing.lg,
  },
  errorText: {
    marginBottom: spacing.md,
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
