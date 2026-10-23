import { NextResponse } from 'next/server';
import { assessmentSubmissions, db } from '@tnsi/db';
import {
  prepareAssessmentSubmission,
  type AssessmentScoringMethod,
  type AssessmentScoringRules,
} from '@tnsi/core';
import { assessmentPayload, attemptNow, enqueueCrmEvent } from '@/lib/crm-outbox';
import { getAssessmentBySlug } from '@/content/cms/loaders';
import { assessmentSubmissionSchema } from '@/lib/validation';
import {
  honeypotTripped,
  isBodyTooLarge,
  isCrossOrigin,
  isRateLimited,
  TOO_MANY_REQUESTS,
  withinRateLimit,
} from '@/lib/form-guard';

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
  if (isBodyTooLarge(request)) {
    return NextResponse.json({ error: 'Invalid request.' }, { status: 413 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request.' }, { status: 400 });
  }

  if (isCrossOrigin(request)) {
    return NextResponse.json({ error: 'Invalid request.' }, { status: 403 });
  }
  // A filled honeypot is a bot: answer as if it worked, store nothing.
  if (honeypotTripped(body)) {
    return NextResponse.json({ submitted: true, result: null }, { status: 201 });
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

  // Early, cheap refusal before the CMS is read; the binding check is atomic with the write below.
  if (await isRateLimited(db, 'assessment', email)) {
    return NextResponse.json(TOO_MANY_REQUESTS, {
      status: 429,
      headers: { 'Retry-After': '3600' },
    });
  }

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

  // The submission and its CRM event are stored together: either both exist or
  // neither does, so a visitor's result is never recorded without being queued.
  const stored = await withinRateLimit(db, 'assessment', email, async (trx) => {
    await trx.insert(assessmentSubmissions).values({
      assessmentSlug,
      email,
      answers,
      score,
      resultTier,
    });
    return enqueueCrmEvent(trx, {
      kind: 'assessment',
      email,
      // Only the contact, a tag and the result tier's name go to the CRM. The
      // answers and the score stay in our own database.
      payload: assessmentPayload({
        assessmentTitle: assessment.title,
        crmPipeline: assessment.crmPipeline,
        resultTier,
      }),
    });
  });
  if (stored.limited) {
    return NextResponse.json(TOO_MANY_REQUESTS, {
      status: 429,
      headers: { 'Retry-After': '3600' },
    });
  }
  const outboxId = stored.value;

  // Best effort; a CRM outage or missing credentials must never stop a visitor
  // seeing their result. A failure leaves the stored row for the worker.
  await attemptNow(outboxId).catch(() => undefined);

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
