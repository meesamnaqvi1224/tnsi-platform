import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import {
  FOLLOW_UP_ROUTING,
  backInFollowUp,
  canGoBackInFollowUp,
  chooseInFollowUp,
  currentFollowUpStep,
  followUpScreen,
  startFollowUp,
  type FollowUp,
  type FollowUpFlowState,
  type FollowUpOption,
} from '@tnsi/core';
import { ThemedText } from '@/components/ThemedText';
import { home } from '@/components/home/homeTheme';
import { colors, fontFamily, spacing, linkHitSlop, linkTouchTarget } from '@/theme';

interface FollowUpQuestionProps {
  /** The first check-in answer (1 to 5) this follow-up belongs to. */
  capacity: number;
  /** True while the check-in is being saved. */
  disabled: boolean;
  /** A save error to show above the question (the choice can then be made again). */
  error: string | null;
  /** The member finished the questions. */
  onDone: (followUp: FollowUp) => void;
  /** The member chose to skip: the check-in is saved without a follow-up. */
  onSkip: () => void;
  /** Back from the first question, to the check-in answers. */
  onExit: () => void;
}

/**
 * The second check-in question, drawn after the member has chosen how they feel. The questions, wording
 * and rules all come from `@tnsi/core` (the same flow the website draws); this only renders them. One
 * question at a time, plain words only, a visible Back, and a way to skip. Choosing the last option
 * saves the check-in with the answer; skipping saves it without.
 */
export function FollowUpQuestion({
  capacity,
  disabled,
  error,
  onDone,
  onSkip,
  onExit,
}: FollowUpQuestionProps) {
  const [flow, setFlow] = useState<FollowUpFlowState | null>(() => startFollowUp(capacity));
  if (!FOLLOW_UP_ROUTING || !flow) return null;
  const screen = followUpScreen(FOLLOW_UP_ROUTING, currentFollowUpStep(flow));

  function choose(option: FollowUpOption) {
    if (!flow || disabled) return;
    const result = chooseInFollowUp(flow, option.choice);
    if (result.done) onDone(result.followUp);
    else setFlow(result.state);
  }

  function back() {
    if (flow && canGoBackInFollowUp(flow)) setFlow(backInFollowUp(flow));
    else onExit();
  }

  return (
    <View>
      <ThemedText
        variant="heading"
        color={home.navy}
        style={styles.heading}
        accessibilityRole="header"
      >
        {screen.heading}
      </ThemedText>

      {error ? (
        <ThemedText variant="body" color={colors.error} style={styles.error}>
          {error}
        </ThemedText>
      ) : null}

      <View style={styles.list}>
        {screen.options.map((option) => (
          <OptionRow
            key={option.key}
            label={option.label}
            disabled={disabled}
            onPress={() => choose(option)}
          />
        ))}
        {screen.notSure ? (
          <OptionRow
            label={screen.notSure.label}
            disabled={disabled}
            dashed
            onPress={() => choose(screen.notSure!)}
          />
        ) : null}
      </View>

      <View style={styles.footer}>
        <Pressable
          onPress={back}
          disabled={disabled}
          accessibilityRole="button"
          accessibilityLabel="Back"
          hitSlop={linkHitSlop}
          style={linkTouchTarget}
        >
          <ThemedText variant="label" color={home.bronze}>
            Back
          </ThemedText>
        </Pressable>
        <Pressable
          onPress={onSkip}
          disabled={disabled}
          accessibilityRole="button"
          accessibilityLabel="Skip this question"
          hitSlop={linkHitSlop}
          style={linkTouchTarget}
        >
          <ThemedText variant="label" color={home.bronze}>
            Skip this question
          </ThemedText>
        </Pressable>
      </View>
      <ThemedText variant="body" color={home.ink} style={styles.reassure}>
        There are no right answers. This only helps us suggest something that fits.
      </ThemedText>
    </View>
  );
}

function OptionRow({
  label,
  disabled,
  dashed = false,
  onPress,
}: {
  label: string;
  disabled: boolean;
  dashed?: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled }}
      style={({ pressed }) => [
        styles.option,
        dashed && styles.optionDashed,
        pressed && !disabled && styles.optionPressed,
        disabled && styles.optionDisabled,
      ]}
    >
      <ThemedText variant="body" color={home.navy}>
        {label}
      </ThemedText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  heading: {
    fontFamily: fontFamily.serif,
    fontSize: 21,
    lineHeight: 27,
    marginBottom: spacing.md,
  },
  error: {
    marginBottom: spacing.md,
  },
  list: {
    gap: spacing.sm,
  },
  option: {
    minHeight: 48,
    justifyContent: 'center',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: home.border,
    backgroundColor: home.page,
  },
  optionDashed: {
    borderStyle: 'dashed',
  },
  optionPressed: {
    backgroundColor: home.bronzeTint,
    borderColor: home.bronze,
  },
  optionDisabled: {
    opacity: 0.5,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.lg,
    marginTop: spacing.md,
  },
  reassure: {
    fontSize: 13,
    lineHeight: 18,
    marginTop: spacing.sm,
  },
});
