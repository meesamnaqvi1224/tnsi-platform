import { useEffect, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  buildSummary,
  canContinue,
  changeSentence,
  exerciseProgress,
  toggleChoice,
  type ExerciseAnswer,
  type ExerciseAnswers,
  type ExerciseStep,
  type GuidedExercise,
} from '@tnsi/core';
import { PrimaryButton, ThemedText } from '@/components';
import { useApiClient } from '@/hooks/useApiClient';
import { colors, radius, spacing } from '@/theme';

/** The words the screen itself uses. Everything else comes from the exercise. */
const UI = {
  begin: 'Begin',
  next: 'Next',
  finish: 'Finish',
  seeSummary: 'See your summary',
  back: 'Back',
  exit: 'Exit',
  backToPractices: 'Back to Practices',
  optional: 'Optional',
  yourAnswers: 'Your answers',
  onlyHere:
    'Your answers stay on this device and are not saved. Only the fact that you finished is recorded.',
  before: 'Before',
  after: 'After',
} as const;

type Phase =
  { kind: 'intro' } | { kind: 'step'; index: number } | { kind: 'summary' } | { kind: 'closing' };

/**
 * One reusable, calm screen that plays any guided exercise: an introduction, each step in turn, an
 * optional summary and a quiet close. What it says comes from the exercise (CMS content); how a step
 * may be answered and summarised comes from `@tnsi/core`, shared with the website. Answers are held in
 * memory for the session only: nothing is sent anywhere but the fact of completion.
 */
export function ExerciseRunner({ exercise }: { exercise: GuidedExercise }) {
  const router = useRouter();
  const api = useApiClient();
  const [phase, setPhase] = useState<Phase>({ kind: 'intro' });
  const [answers, setAnswers] = useState<ExerciseAnswers>({});
  const recorded = useRef(false);
  const scrollRef = useRef<ScrollView>(null);

  const total = exercise.steps.length;
  const stepIndex = phase.kind === 'step' ? phase.index : 0;
  const phaseKey = phase.kind === 'step' ? `step-${phase.index}` : phase.kind;

  // Each new screen starts at the top.
  useEffect(() => {
    scrollRef.current?.scrollTo({ y: 0, animated: false });
  }, [phaseKey]);

  // Completion is recorded once, when the closing screen is reached. Silent on failure: the quiet
  // close never waits on it. Only the fact of completion is sent, never an answer.
  const apiRef = useRef(api);
  useEffect(() => {
    apiRef.current = api;
  });
  useEffect(() => {
    if (phase.kind === 'closing' && !recorded.current) {
      recorded.current = true;
      void apiRef.current
        .post(`/api/v1/practices/exercise/${exercise.slug}/complete`, {
          completed: true,
          progressPct: 1,
        })
        .catch(() => {});
    }
  }, [phase.kind, exercise.slug]);

  const afterLastStep = (): Phase => (exercise.summary ? { kind: 'summary' } : { kind: 'closing' });
  const next = () =>
    setPhase((p) =>
      p.kind === 'intro'
        ? { kind: 'step', index: 0 }
        : p.kind === 'step'
          ? p.index + 1 < total
            ? { kind: 'step', index: p.index + 1 }
            : afterLastStep()
          : { kind: 'closing' },
    );
  const back = () =>
    setPhase((p) =>
      p.kind === 'step'
        ? p.index > 0
          ? { kind: 'step', index: p.index - 1 }
          : { kind: 'intro' }
        : p.kind === 'summary'
          ? { kind: 'step', index: total - 1 }
          : p,
    );
  const exit = () => router.dismissTo('/practices');
  const setAnswer = (stepId: string, answer: ExerciseAnswer) =>
    setAnswers((prev) => ({ ...prev, [stepId]: answer }));

  const step = phase.kind === 'step' ? exercise.steps[stepIndex] : undefined;

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right', 'bottom']}>
      <View style={styles.topBar}>
        <ThemedText variant="label" color={colors.bronze} style={styles.brand}>
          The Nervous System Institute
        </ThemedText>
        {phase.kind === 'closing' ? null : (
          <Pressable
            onPress={exit}
            hitSlop={12}
            accessibilityRole="button"
            accessibilityLabel={UI.exit}
          >
            <ThemedText variant="body" color={colors.charcoal}>
              {UI.exit}
            </ThemedText>
          </Pressable>
        )}
      </View>

      {step ? (
        <View
          style={styles.track}
          accessibilityRole="progressbar"
          accessibilityLabel="Progress"
          accessibilityValue={{ min: 0, max: total, now: stepIndex + 1 }}
        >
          <View
            style={[
              styles.fill,
              { width: `${Math.round(exerciseProgress(stepIndex + 1, total) * 100)}%` },
            ]}
          />
        </View>
      ) : null}

      <ScrollView
        ref={scrollRef}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="interactive"
      >
        {phase.kind === 'intro' ? (
          <>
            <ThemedText variant="label" color={colors.bronze} style={styles.eyebrow}>
              Guided exercise{exercise.durationLabel ? ` · ${exercise.durationLabel}` : ''}
            </ThemedText>
            <ThemedText variant="display" accessibilityRole="header">
              {exercise.title}
            </ThemedText>
            {exercise.subtitle ? (
              <ThemedText variant="heading" color={colors.bronze} style={styles.gap}>
                {exercise.subtitle}
              </ThemedText>
            ) : null}
            <ThemedText variant="body" style={styles.gap}>
              {exercise.intro}
            </ThemedText>
            <ThemedText variant="caption" style={styles.gap}>
              {UI.onlyHere}
            </ThemedText>
          </>
        ) : null}

        {step ? (
          <StepBody step={step} answer={answers[step.id]} onAnswer={(a) => setAnswer(step.id, a)} />
        ) : null}

        {phase.kind === 'summary' && exercise.summary ? (
          <SummaryBody exercise={exercise} answers={answers} />
        ) : null}

        {phase.kind === 'closing' ? (
          <View style={styles.closing}>
            <ThemedText variant="label" color={colors.bronze} style={styles.eyebrow}>
              Exercise completed
            </ThemedText>
            <ThemedText variant="display" style={styles.centerText} accessibilityRole="header">
              {exercise.closing.heading}
            </ThemedText>
            <ThemedText variant="body" style={styles.centerGap}>
              {exercise.closing.message}
            </ThemedText>
          </View>
        ) : null}
      </ScrollView>

      <View style={styles.footer}>
        {phase.kind === 'intro' ? <PrimaryButton label={UI.begin} onPress={next} /> : null}
        {step ? (
          <>
            <PrimaryButton
              label={
                step.type === 'pause'
                  ? step.actionLabel
                  : stepIndex + 1 === total
                    ? exercise.summary
                      ? UI.seeSummary
                      : UI.finish
                    : UI.next
              }
              onPress={next}
              disabled={!canContinue(step, answers[step.id])}
            />
            <PrimaryButton
              label={UI.back}
              variant="secondary"
              onPress={back}
              style={styles.gapSm}
            />
          </>
        ) : null}
        {phase.kind === 'summary' ? (
          <>
            <PrimaryButton label={UI.finish} onPress={next} />
            <PrimaryButton
              label={UI.back}
              variant="secondary"
              onPress={back}
              style={styles.gapSm}
            />
          </>
        ) : null}
        {phase.kind === 'closing' ? (
          <PrimaryButton label={UI.backToPractices} onPress={exit} />
        ) : null}
      </View>
    </SafeAreaView>
  );
}

function StepBody({
  step,
  answer,
  onAnswer,
}: {
  step: ExerciseStep;
  answer: ExerciseAnswer | undefined;
  onAnswer: (answer: ExerciseAnswer) => void;
}) {
  if (step.type === 'prompt' || step.type === 'pause') {
    return (
      <>
        {step.title ? (
          <ThemedText variant="display" accessibilityRole="header">
            {step.title}
          </ThemedText>
        ) : null}
        <ThemedText variant="body" style={step.title ? styles.gap : undefined}>
          {step.body}
        </ThemedText>
      </>
    );
  }

  return (
    <>
      <ThemedText variant="display" accessibilityRole="header">
        {step.question}
      </ThemedText>
      {step.help ? (
        <ThemedText variant="caption" style={styles.gap}>
          {step.help}
        </ThemedText>
      ) : null}

      {step.type === 'choice' ? (
        <View style={styles.options}>
          {step.options.map((option) => {
            const selected = answer?.kind === 'choice' && answer.optionIds.includes(option.id);
            return (
              <Pressable
                key={option.id}
                onPress={() => onAnswer(toggleChoice(step, answer, option.id))}
                accessibilityRole={step.multiple ? 'checkbox' : 'radio'}
                accessibilityState={{ checked: selected }}
                accessibilityLabel={option.label}
                style={[styles.option, selected && styles.optionSelected]}
              >
                <ThemedText variant="body" color={colors.navy}>
                  {option.label}
                </ThemedText>
              </Pressable>
            );
          })}
        </View>
      ) : null}

      {step.type === 'scale' ? (
        <View style={styles.options}>
          <View style={styles.scaleRow}>
            {Array.from({ length: step.max }, (_, i) => i + 1).map((value) => {
              const selected = answer?.kind === 'scale' && answer.value === value;
              return (
                <Pressable
                  key={value}
                  onPress={() => onAnswer({ kind: 'scale', value })}
                  accessibilityRole="radio"
                  accessibilityState={{ checked: selected }}
                  accessibilityLabel={`${value} of ${step.max}`}
                  style={[styles.scaleItem, selected && styles.optionSelected]}
                >
                  <ThemedText variant="heading" color={colors.navy}>
                    {String(value)}
                  </ThemedText>
                </Pressable>
              );
            })}
          </View>
          <View style={styles.scaleLabels}>
            <ThemedText variant="caption">{step.lowLabel}</ThemedText>
            <ThemedText variant="caption">{step.highLabel}</ThemedText>
          </View>
        </View>
      ) : null}

      {step.type === 'text' ? (
        <View style={styles.options}>
          <TextInput
            multiline
            maxLength={2000}
            value={answer?.kind === 'text' ? answer.text : ''}
            onChangeText={(text) => onAnswer({ kind: 'text', text })}
            placeholder={step.placeholder ?? ''}
            placeholderTextColor={colors.charcoal + '80'}
            accessibilityLabel={step.question}
            textAlignVertical="top"
            style={styles.textInput}
          />
          <ThemedText variant="caption" style={styles.gapSm}>
            {UI.optional}
          </ThemedText>
        </View>
      ) : null}
    </>
  );
}

function SummaryBody({
  exercise,
  answers,
}: {
  exercise: GuidedExercise;
  answers: ExerciseAnswers;
}) {
  const summary = exercise.summary!;
  const { rows, comparisons } = buildSummary(exercise, answers);

  return (
    <>
      <ThemedText variant="display" accessibilityRole="header">
        {summary.heading}
      </ThemedText>
      {summary.intro ? (
        <ThemedText variant="body" style={styles.gap}>
          {summary.intro}
        </ThemedText>
      ) : null}

      {comparisons.map((c) => (
        <View key={c.label} style={styles.card}>
          <ThemedText variant="label" color={colors.bronze} style={styles.upper}>
            {c.label}
          </ThemedText>
          <ThemedText variant="heading" style={styles.gapSm}>
            {UI.before} {c.before} of {c.max} · {UI.after} {c.after} of {c.max}
          </ThemedText>
          <ThemedText variant="caption" style={styles.gapSm}>
            {changeSentence(c.change)} Any change, or none, is useful information.
          </ThemedText>
        </View>
      ))}

      {summary.showAnswers && rows.length > 0 ? (
        <View style={styles.gap}>
          <ThemedText variant="label" color={colors.bronze} style={styles.upper}>
            {UI.yourAnswers}
          </ThemedText>
          {rows.map((row) => (
            <View key={row.stepId} style={styles.row}>
              <ThemedText variant="caption">{row.question}</ThemedText>
              <ThemedText variant="body" color={colors.navy} style={styles.gapXs}>
                {row.value}
              </ThemedText>
            </View>
          ))}
        </View>
      ) : null}

      <ThemedText variant="caption" style={styles.gap}>
        {UI.onlyHere}
      </ThemedText>
    </>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.cream },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
  },
  brand: { textTransform: 'uppercase' },
  track: {
    height: 4,
    marginHorizontal: spacing.lg,
    borderRadius: 2,
    backgroundColor: colors.border,
    overflow: 'hidden',
  },
  fill: { height: 4, backgroundColor: colors.bronze },
  content: { flexGrow: 1, justifyContent: 'center', padding: spacing.lg },
  eyebrow: { textTransform: 'uppercase', marginBottom: spacing.md },
  gap: { marginTop: spacing.md },
  gapSm: { marginTop: spacing.sm },
  gapXs: { marginTop: spacing.xs },
  upper: { textTransform: 'uppercase' },
  centerText: { textAlign: 'center' },
  centerGap: { textAlign: 'center', marginTop: spacing.md },
  closing: { alignItems: 'center' },
  options: { marginTop: spacing.lg },
  option: {
    minHeight: 56,
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    backgroundColor: colors.white,
  },
  optionSelected: { borderColor: colors.bronze, backgroundColor: '#F6EEE3' },
  scaleRow: { flexDirection: 'row', gap: spacing.sm },
  scaleItem: {
    flex: 1,
    minHeight: 56,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    backgroundColor: colors.white,
  },
  scaleLabels: { flexDirection: 'row', justifyContent: 'space-between', marginTop: spacing.sm },
  textInput: {
    minHeight: 130,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    backgroundColor: colors.white,
    color: colors.navy,
    fontSize: 16,
  },
  card: {
    marginTop: spacing.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    backgroundColor: colors.white,
  },
  row: {
    marginTop: spacing.md,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  footer: { padding: spacing.lg, paddingTop: spacing.sm },
});
