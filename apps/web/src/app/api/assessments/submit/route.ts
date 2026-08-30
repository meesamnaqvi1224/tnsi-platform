import { NextResponse } from 'next/server';
import { assessmentSubmissions, db } from '@tnsi/db';
import {
  prepareAssessmentSubmission,
  type AssessmentScoringMethod,
  type AssessmentScoringRules,
} from '@tnsi/core';
import { FlowiConfigError, FlowiRequestError, upsertFlowiContact } from '@tnsi/integrations';
import { getAssessmentBySlug } from '@/content/cms/loaders';
import { assessmentSubmissionSchema } from '@/lib/validation';

export const runtime = 'nodejs';

/**
 * Public, unauthenticated submission endpoint for any Sanity-authored
 * assessment — nothing here is specific to Capacity Assessment. Mirrors
 * the repo's established webhook shape (parse/validate → pure decision
 * function → thin DB write), just without a webhook signature: parse JSON
 * → validate shape (Zod) → load the live assessment definition from Sanity
 * → validate + score against it (packages/core, pure) → persist.
 *
 * userId is never set here — no anonymous-to-account claim mechanism has
 * been designed (see packages/db/src/schema/assessment-submissions.ts),
 * and inventing one is explicitly out of scope for this phase.
 */
export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request.' }, { status: 400 });
  }

  const parsed = assessmentSubmissionSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: 'Please check your answers and try again.',
        fields: parsed.error.flatten().fieldErrors,
      },
      { status: 400 },
    );
  }

  const { assessmentSlug, email, answers } = parsed.data;

  const assessment = await getAssessmentBySlug(assessmentSlug);
  if (!assessment) {
    return NextResponse.json(
      { error: 'This assessment is not currently available.' },
      { status: 404 },
    );
  }

  // The Sanity schema's `scoringLogic.method` field only ever offers "sum"
  // as an option today, but its stored value arrives as a plain string, not
  // the narrower literal type packages/core's scoring engine expects.
  // Asserting it here is safe even if that ever drifts: scoreAssessment
  // fails safe (zero score, no matching tier) on any method it doesn't
  // recognise rather than throwing — verified by its own test suite.
  const rules: AssessmentScoringRules = {
    method: assessment.scoringMethod as AssessmentScoringMethod,
    questions: assessment.questions,
    resultTiers: assessment.resultTiers,
  };

  const prepared = prepareAssessmentSubmission(answers, rules);
  if (!prepared.valid) {
    return NextResponse.json(
      { error: 'Your answers could not be processed.', details: prepared.errors },
      { status: 400 },
    );
  }

  const { score, resultTier } = prepared.result;

  await db.insert(assessmentSubmissions).values({
    assessmentSlug,
    email,
    answers,
    score,
    resultTier,
  });

  // Flowi sync is best-effort: a CRM outage or missing credentials must
  // never stop a visitor from seeing their result, since that's the whole
  // point of a lead-generation assessment. The tag/pipeline mapping is
  // intentionally minimal — no result-tier-specific tag is sent, since no
  // such mapping has been approved yet (see the C9 decision doc). Once one
  // is, it belongs on the assessment/result-tier content itself (e.g. a
  // `crmPipeline`-style field on the result tier), not guessed here.
  try {
    await upsertFlowiContact({
      email,
      source: `TNSI website — ${assessment.title} assessment`,
      tags: [
        'TNSI Website Assessment',
        ...(assessment.crmPipeline ? [assessment.crmPipeline] : []),
      ],
    });
  } catch (error) {
    if (!(error instanceof FlowiConfigError) && !(error instanceof FlowiRequestError)) {
      console.error('[assessment submit] unexpected Flowi error:', error);
    }
  }

  const matchedTier = resultTier
    ? assessment.resultTiers.find((tier) => tier.key === resultTier)
    : undefined;

  return NextResponse.json(
    {
      submitted: true,
      result: matchedTier
        ? {
            key: matchedTier.key,
            title: matchedTier.title,
            description: matchedTier.description ?? null,
          }
        : null,
    },
    { status: 201 },
  );
}
