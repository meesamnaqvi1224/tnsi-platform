import { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, Pressable, StyleSheet, View } from 'react-native';
import { useNavigation, useRouter } from 'expo-router';
import { ErrorNotice, PrimaryButton, ScreenContainer, TextField, ThemedText } from '@/components';
import { AssessmentSkeleton } from '@/components/profile/AssessmentSkeleton';
import { useAssessment } from '@/hooks/useAssessment';
import { useAssessmentSubmission } from '@/hooks/useAssessmentSubmission';
import { colors, spacing } from '@/theme';
import type { AssessmentQuestion } from '@/api/types';

/**
 * The one assessment this route serves today - same as the web page
 * (apps/web/src/app/assessment/page.tsx's `ASSESSMENT_SLUG`). Everything
 * this screen renders (title, questions, choices, result copy) comes from
 * the API response for this slug; nothing is hardcoded here.
 */
const ASSESSMENT_SLUG = 'capacity-assessment';

/**
 * The one piece of existing, already-approved copy describing this
 * assessment beyond its title - the web page's own SEO description
 * (apps/web/src/app/assessment/page.tsx's `FALLBACK_DESCRIPTION`). The
 * web assessment itself has no separate intro/disclaimer screen, so none
 * is invented here either - this single real sentence is reused verbatim
 * as the only framing copy, exactly matching what already exists.
 */
const ASSESSMENT_DESCRIPTION =
  "Take the Institute's Capacity Assessment to understand where you are today and what might help.";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function CapacityAssessmentScreen() {
  const router = useRouter();
  const navigation = useNavigation();
  const { state, reload } = useAssessment(ASSESSMENT_SLUG);
  const { state: submission, submit, reset } = useAssessmentSubmission();

  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [email, setEmail] = useState('');
  const [attemptedSubmit, setAttemptedSubmit] = useState(false);

  const hasProgress = Object.keys(answers).length > 0 || email.length > 0;
  const isSubmitted = submission.status === 'success';

  // Confirms before discarding in-progress answers - local state only,
  // no draft persistence (out of scope for this phase). Never intercepts
  // once the submission has actually succeeded.
  useEffect(() => {
    const unsubscribe = navigation.addListener('beforeRemove', (e) => {
      if (!hasProgress || isSubmitted) return;
      e.preventDefault();
      Alert.alert('Leave assessment?', 'Your answers will be lost.', [
        { text: 'Continue Assessment', style: 'cancel' },
        {
          text: 'Leave',
          style: 'destructive',
          onPress: () => navigation.dispatch(e.data.action),
        },
      ]);
    });
    return unsubscribe;
  }, [navigation, hasProgress, isSubmitted]);

  const questions = useMemo(
    () => (state.status === 'success' ? state.assessment.questions : []),
    [state],
  );
  const unansweredKeys = useMemo(
    () => questions.filter((q) => !answers[q.key]).map((q) => q.key),
    [questions, answers],
  );
  const emailValid = EMAIL_PATTERN.test(email.trim());
  const allAnswered = questions.length > 0 && unansweredKeys.length === 0;

  const selectChoice = useCallback((questionKey: string, choiceKey: string) => {
    setAnswers((prev) => ({ ...prev, [questionKey]: choiceKey }));
  }, []);

  async function handleSubmit() {
    if (submission.status === 'submitting') return;
    if (!allAnswered || !emailValid) {
      setAttemptedSubmit(true);
      return;
    }
    await submit({ assessmentSlug: ASSESSMENT_SLUG, email: email.trim(), answers });
  }

  if (state.status === 'loading') {
    return (
      <ScreenContainer scroll>
        <AssessmentSkeleton />
      </ScreenContainer>
    );
  }

  if (state.status === 'not-found') {
    return (
      <ScreenContainer>
        <ThemedText variant="heading">This assessment isn&apos;t available.</ThemedText>
        <ThemedText variant="body" color={colors.charcoal} style={styles.notFoundBody}>
          It may have been removed or is no longer published.
        </ThemedText>
        <PrimaryButton
          label="Back to Profile"
          variant="secondary"
          onPress={() => router.back()}
          style={styles.notFoundButton}
        />
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

  const { assessment } = state;

  if (submission.status === 'success') {
    return <AssessmentResultView title={assessment.title} result={submission.result} />;
  }

  const showValidationSummary = attemptedSubmit && (!allAnswered || !emailValid);
  const submitting = submission.status === 'submitting';

  return (
    <ScreenContainer scroll>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ThemedText variant="display" style={styles.title}>
          {assessment.title}
        </ThemedText>
        <ThemedText variant="body" color={colors.charcoal} style={styles.description}>
          {ASSESSMENT_DESCRIPTION}
        </ThemedText>

        {submission.status === 'error' ? <ErrorNotice message={submission.message} /> : null}

        {showValidationSummary ? (
          <View
            style={styles.validationBanner}
            accessible
            accessibilityLabel={
              !allAnswered
                ? `${unansweredKeys.length} question${unansweredKeys.length === 1 ? '' : 's'} still need an answer.`
                : 'Please enter a valid email address.'
            }
          >
            <ThemedText variant="body" color={colors.error}>
              {!allAnswered
                ? `Please answer all questions before submitting (${unansweredKeys.length} remaining).`
                : 'Please enter a valid email address.'}
            </ThemedText>
          </View>
        ) : null}

        {assessment.questions.map((question, index) => (
          <QuestionBlock
            key={question.key}
            index={index}
            question={question}
            selected={answers[question.key] ?? null}
            onSelect={(choiceKey) => selectChoice(question.key, choiceKey)}
            showRequiredNotice={attemptedSubmit && !answers[question.key]}
          />
        ))}

        <ThemedText variant="label" color={colors.bronze} style={styles.emailSectionLabel}>
          YOUR EMAIL
        </ThemedText>
        <TextField
          label="Email"
          value={email}
          onChangeText={(value) => {
            setEmail(value);
            if (submission.status === 'error') reset();
          }}
          keyboardType="email-address"
          textContentType="emailAddress"
          autoComplete="email"
          autoCapitalize="none"
          autoCorrect={false}
          placeholder="your@email.com"
          errorMessage={attemptedSubmit && !emailValid ? 'Enter a valid email address.' : null}
          accessibilityLabel="Your email"
        />
        <ThemedText variant="caption" color={colors.charcoal} style={styles.emailNote}>
          We&apos;ll use your email to send you your result and related resources.
        </ThemedText>

        <PrimaryButton
          label={submitting ? 'Submitting…' : 'See Your Result'}
          onPress={handleSubmit}
          loading={submitting}
          style={styles.submitButton}
        />
      </KeyboardAvoidingView>
    </ScreenContainer>
  );
}

function QuestionBlock({
  index,
  question,
  selected,
  onSelect,
  showRequiredNotice,
}: {
  index: number;
  question: AssessmentQuestion;
  selected: string | null;
  onSelect: (choiceKey: string) => void;
  showRequiredNotice: boolean;
}) {
  return (
    <View style={styles.questionBlock}>
      <ThemedText variant="heading" style={styles.questionText}>
        {index + 1}. {question.text}
      </ThemedText>
      {question.choices.map((choice) => {
        const isSelected = selected === choice.key;
        return (
          <Pressable
            key={choice.key}
            onPress={() => onSelect(choice.key)}
            accessibilityRole="radio"
            accessibilityState={{ selected: isSelected }}
            accessibilityLabel={`${question.text}. ${choice.label}${isSelected ? ', selected' : ''}`}
            style={styles.choiceRow}
          >
            <View style={[styles.radioOuter, isSelected && styles.radioOuterSelected]}>
              {isSelected ? <View style={styles.radioInner} /> : null}
            </View>
            <ThemedText variant="body" color={colors.charcoal} style={styles.choiceLabel}>
              {choice.label}
            </ThemedText>
          </Pressable>
        );
      })}
      {showRequiredNotice ? (
        <ThemedText variant="caption" color={colors.error} style={styles.requiredNotice}>
          Please select an answer.
        </ThemedText>
      ) : null}
    </View>
  );
}

function AssessmentResultView({
  title,
  result,
}: {
  title: string;
  result: { key: string; title: string; description: string | null } | null;
}) {
  const router = useRouter();

  return (
    <ScreenContainer scroll>
      <ThemedText variant="label" color={colors.bronze} style={styles.resultEyebrow}>
        {title.toUpperCase()} — YOUR RESULT
      </ThemedText>

      {result ? (
        <>
          <ThemedText variant="display" style={styles.resultTitle}>
            {result.title}
          </ThemedText>
          {result.description ? (
            <ThemedText variant="body" color={colors.charcoal} style={styles.resultDescription}>
              {result.description}
            </ThemedText>
          ) : null}
        </>
      ) : (
        <>
          <ThemedText variant="display" style={styles.resultTitle}>
            Thank you for completing the assessment
          </ThemedText>
          <ThemedText variant="body" color={colors.charcoal} style={styles.resultDescription}>
            We&apos;ve recorded your answers. We&apos;ll follow up with your personalised result and
            recommendations shortly.
          </ThemedText>
        </>
      )}

      <PrimaryButton
        label="Explore Practices"
        onPress={() => router.push('/practices')}
        style={styles.resultPrimaryButton}
      />
      <PrimaryButton
        label="Back to Profile"
        variant="secondary"
        onPress={() => router.push('/profile')}
        style={styles.resultSecondaryButton}
      />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  title: {
    marginBottom: spacing.sm,
  },
  description: {
    marginBottom: spacing.xl,
  },
  validationBanner: {
    marginBottom: spacing.lg,
  },
  questionBlock: {
    marginBottom: spacing.xl,
  },
  questionText: {
    marginBottom: spacing.md,
  },
  choiceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 44,
    marginBottom: spacing.sm,
  },
  radioOuter: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1.5,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  radioOuterSelected: {
    borderColor: colors.navy,
  },
  radioInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: colors.navy,
  },
  choiceLabel: {
    flex: 1,
  },
  requiredNotice: {
    marginTop: spacing.xs,
  },
  emailSectionLabel: {
    marginBottom: spacing.sm,
    letterSpacing: 1,
  },
  emailNote: {
    marginTop: -spacing.sm,
    marginBottom: spacing.xl,
  },
  submitButton: {
    marginBottom: spacing.xl,
  },
  notFoundBody: {
    marginTop: spacing.sm,
    marginBottom: spacing.xl,
  },
  notFoundButton: {
    alignSelf: 'flex-start',
  },
  resultEyebrow: {
    marginBottom: spacing.md,
    letterSpacing: 1,
  },
  resultTitle: {
    marginBottom: spacing.md,
  },
  resultDescription: {
    marginBottom: spacing.xl,
  },
  resultPrimaryButton: {
    marginBottom: spacing.md,
  },
  resultSecondaryButton: {
    marginBottom: spacing.xl,
  },
});
