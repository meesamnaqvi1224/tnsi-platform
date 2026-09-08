/**
 * Server-side mapping from `getAssessmentBySlug()`'s full `Assessment`
 * shape (apps/web/src/content/cms/loaders.ts — the same loader the web
 * assessment page already uses) to the public JSON contract
 * `/api/v1/assessments/[slug]` returns.
 *
 * Deliberately narrower than the source shape: strips `resultTiers[].
 * minScore`/`maxScore` (the scoring engine's internal thresholds - the
 * client submits raw answers and gets a result back, it never scores
 * itself, matching `AssessmentExperience`'s own documented boundary),
 * `scoringMethod` (an implementation detail of packages/core, not
 * something a client needs), each choice's `value` (the score weight -
 * same reasoning as the thresholds), and `emailSequence`/`crmPipeline`/
 * `seo` (internal-only, unwired fields per the Sanity schema's own
 * comments).
 */
import type { Assessment } from '@/content/cms/loaders';

export interface ApiAssessmentChoice {
  key: string;
  label: string;
}

export interface ApiAssessmentQuestion {
  key: string;
  text: string;
  choices: ApiAssessmentChoice[];
}

export interface ApiAssessmentResultTier {
  key: string;
  title: string;
  description: string | null;
}

export interface ApiAssessment {
  id: string;
  slug: string;
  title: string;
  questions: ApiAssessmentQuestion[];
  resultTiers: ApiAssessmentResultTier[];
}

export function mapAssessment(assessment: Assessment): ApiAssessment {
  return {
    id: assessment.id,
    slug: assessment.slug,
    title: assessment.title,
    questions: assessment.questions.map((question) => ({
      key: question.key,
      text: question.text,
      choices: question.choices.map((choice) => ({
        key: choice.key,
        label: choice.label,
      })),
    })),
    resultTiers: assessment.resultTiers.map((tier) => ({
      key: tier.key,
      title: tier.title,
      description: tier.description ?? null,
    })),
  };
}
