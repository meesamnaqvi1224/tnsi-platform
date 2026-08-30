'use client';

import * as React from 'react';
import {
  Alert,
  Button,
  Container,
  Form,
  FormField,
  Heading,
  Input,
  RadioGroup,
  RadioItem,
  Section,
  Stack,
  Text,
} from '@tnsi/ui';
import type { Assessment } from '@/content/cms/loaders';

export interface AssessmentExperienceProps {
  assessment: Assessment;
}

type Status = 'answering' | 'submitting' | 'error';

interface SubmitResult {
  key: string;
  title: string;
  description: string | null;
}

interface SubmitResponseBody {
  submitted?: boolean;
  result?: SubmitResult | null;
  error?: string;
}

/**
 * Renders and drives one assessment end to end, entirely from the Sanity
 * document passed in — no question, choice, or result-tier copy is
 * hardcoded here. `packages/core`'s scoring engine is intentionally never
 * imported client-side: the score and result tier are calculated only on
 * the server, from the server's own copy of the assessment definition, so
 * nothing the client sends can influence its own result.
 */
export function AssessmentExperience({ assessment }: AssessmentExperienceProps) {
  const [answers, setAnswers] = React.useState<Record<string, string>>({});
  const [email, setEmail] = React.useState('');
  const [status, setStatus] = React.useState<Status>('answering');
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);
  const [result, setResult] = React.useState<SubmitResult | null | undefined>(undefined);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus('submitting');
    setErrorMessage(null);

    try {
      const response = await fetch('/api/assessments/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ assessmentSlug: assessment.slug, answers, email }),
      });

      const data = (await response.json().catch(() => null)) as SubmitResponseBody | null;

      if (!response.ok || !data?.submitted) {
        setStatus('error');
        setErrorMessage(data?.error ?? 'Something went wrong. Please try again.');
        return;
      }

      setResult(data.result ?? null);
    } catch {
      setStatus('error');
      setErrorMessage('Something went wrong. Please try again.');
    }
  }

  // `result` starts `undefined` (not yet submitted) and becomes `null` once
  // the server responds with no matching tier — both are rendered, just
  // differently, so this can't be collapsed to a single boolean.
  if (result !== undefined) {
    return <AssessmentResult title={assessment.title} result={result} />;
  }

  const submitting = status === 'submitting';
  const allAnswered = assessment.questions.every((question) => answers[question.key]);

  return (
    <Section spacing="xl">
      <Container size="xl">
        <Stack gap="2xl" className="mx-auto max-w-2xl">
          <Stack gap="sm">
            <Heading as="h1" size="xl">
              {assessment.title}
            </Heading>
          </Stack>

          <Form onSubmit={handleSubmit}>
            {status === 'error' && errorMessage ? (
              <Alert variant="destructive">{errorMessage}</Alert>
            ) : null}

            {assessment.questions.map((question, index) => (
              <fieldset key={question.key} className="flex flex-col gap-(--space-sm)">
                <legend className="text-foreground text-sm leading-none font-medium">
                  {index + 1}. {question.text}
                </legend>
                <RadioGroup
                  name={question.key}
                  value={answers[question.key] ?? null}
                  onValueChange={(value) =>
                    setAnswers((prev) => ({ ...prev, [question.key]: String(value) }))
                  }
                  required
                  disabled={submitting}
                >
                  {question.choices.map((choice) => (
                    <label
                      key={choice.key}
                      className="flex cursor-pointer items-center gap-(--space-sm) text-sm"
                    >
                      <RadioItem value={choice.key} />
                      <Text as="span">{choice.label}</Text>
                    </label>
                  ))}
                </RadioGroup>
              </fieldset>
            ))}

            <FormField id="assessment-email" label="Your email" required>
              {(field) => (
                <Input
                  {...field}
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  disabled={submitting}
                  placeholder="your@email.com"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                />
              )}
            </FormField>

            <Stack gap="sm">
              <Button type="submit" size="lg" disabled={submitting || !allAnswered || !email}>
                {submitting ? 'Submitting…' : 'See your result'}
              </Button>
              <Text tone="muted" className="text-sm">
                We’ll use your email to send you your result and related resources.
              </Text>
            </Stack>
          </Form>
        </Stack>
      </Container>
    </Section>
  );
}

function AssessmentResult({ title, result }: { title: string; result: SubmitResult | null }) {
  return (
    <Section spacing="xl">
      <Container size="xl">
        <Stack gap="lg" className="mx-auto max-w-2xl">
          <Text tone="muted" className="text-xs tracking-[0.15em] uppercase">
            {title} — your result
          </Text>
          {result ? (
            <>
              <Heading as="h1" size="xl">
                {result.title}
              </Heading>
              {result.description ? (
                <Text tone="muted" className="max-w-prose leading-relaxed">
                  {result.description}
                </Text>
              ) : null}
            </>
          ) : (
            <>
              <Heading as="h1" size="xl">
                Thank you for completing the assessment
              </Heading>
              <Text tone="muted" className="max-w-prose leading-relaxed">
                We’ve recorded your answers. We’ll follow up with your personalised result and
                recommendations shortly.
              </Text>
            </>
          )}
        </Stack>
      </Container>
    </Section>
  );
}
